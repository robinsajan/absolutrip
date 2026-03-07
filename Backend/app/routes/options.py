import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_login import current_user
from flasgger import swag_from
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import StayOption
from ..utils.decorators import trip_member_required, option_access_required
from ..services.scraper import LinkScraperService

bp = Blueprint('options', __name__, url_prefix='/api')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_upload_folder():
    upload_folder = os.path.join(current_app.root_path, '..', 'uploads', 'options')
    os.makedirs(upload_folder, exist_ok=True)
    return upload_folder


@bp.route('/trips/<int:trip_id>/options', methods=['POST'])
@trip_member_required
@swag_from({
    'tags': ['Options'],
    'summary': 'Add a new stay/activity option',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['title'],
                'properties': {
                    'title': {'type': 'string', 'example': 'Beachfront Hotel'},
                    'link': {'type': 'string', 'example': 'https://booking.com/hotel123'},
                    'price': {'type': 'number', 'example': 150.00},
                    'notes': {'type': 'string', 'example': 'Great reviews, has pool'},
                    'is_per_person': {'type': 'boolean', 'example': False},
                    'is_per_night': {'type': 'boolean', 'example': False}
                }
            }
        }
    ],
    'responses': {
        201: {'description': 'Option created successfully'},
        400: {'description': 'Missing required fields'},
        403: {'description': 'Not a member of this trip'}
    }
})
def create_option(trip_id, trip, membership):
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    title = data.get('title')
    if not title:
        return jsonify({'error': 'Option title is required'}), 400

    price = None
    if data.get('price') is not None:
        try:
            price = float(data['price'])
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid price format'}), 400

    check_in_date = None
    if data.get('check_in_date'):
        try:
            check_in_date = datetime.strptime(data['check_in_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid check_in_date format. Use YYYY-MM-DD'}), 400

    check_out_date = None
    if data.get('check_out_date'):
        try:
            check_out_date = datetime.strptime(data['check_out_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid check_out_date format. Use YYYY-MM-DD'}), 400

    option = StayOption(
        trip_id=trip_id,
        title=title,
        link=data.get('link'),
        price=price,
        notes=data.get('notes'),
        added_by=current_user.id,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        category=data.get('category', 'stay'),
        is_per_person=data.get('is_per_person', False),
        is_per_night=data.get('is_per_night', False)
    )
    db.session.add(option)
    db.session.flush()

    if option.link:
        LinkScraperService.scrape_and_update_option(option)

    db.session.commit()

    return jsonify({
        'message': 'Option created successfully',
        'option': option.to_dict(include_votes=True)
    }), 201


@bp.route('/trips/<int:trip_id>/options', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Options'],
    'summary': 'List all options for a trip',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {
            'name': 'sort',
            'in': 'query',
            'type': 'string',
            'enum': ['created_at', 'price', 'votes'],
            'default': 'created_at',
            'description': 'Sort options by field'
        }
    ],
    'responses': {
        200: {'description': 'List of options'},
        403: {'description': 'Not a member of this trip'}
    }
})
def list_options(trip_id, trip, membership):
    sort_by = request.args.get('sort', 'created_at')

    options = StayOption.query.filter_by(trip_id=trip_id).all()

    if sort_by == 'price':
        options.sort(key=lambda x: x.price or float('inf'))
    elif sort_by == 'votes':
        options.sort(key=lambda x: sum(v.score for v in x.votes), reverse=True)
    else:
        options.sort(key=lambda x: x.created_at, reverse=True)

    return jsonify({
        'options': [o.to_dict(include_votes=True) for o in options]
    }), 200


@bp.route('/options/<int:option_id>', methods=['PUT'])
@option_access_required
@swag_from({
    'tags': ['Options'],
    'summary': 'Update an option',
    'parameters': [
        {'name': 'option_id', 'in': 'path', 'type': 'integer', 'required': True},
        {
            'name': 'body',
            'in': 'body',
            'schema': {
                'type': 'object',
                'properties': {
                    'title': {'type': 'string'},
                    'link': {'type': 'string'},
                    'price': {'type': 'number'},
                    'notes': {'type': 'string'},
                    'is_per_person': {'type': 'boolean'},
                    'is_per_night': {'type': 'boolean'}
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Option updated successfully'},
        400: {'description': 'Invalid data'},
        403: {'description': 'Not a member of this trip'},
        404: {'description': 'Option not found'}
    }
})
def update_option(option_id, option, membership):
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'title' in data:
        option.title = data['title']

    old_link = option.link
    if 'link' in data:
        option.link = data['link']

    if 'price' in data:
        if data['price'] is not None:
            try:
                option.price = float(data['price'])
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid price format'}), 400
        else:
            option.price = None

    if 'notes' in data:
        option.notes = data['notes']

    if 'check_in_date' in data:
        if data['check_in_date']:
            try:
                option.check_in_date = datetime.strptime(data['check_in_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid check_in_date format. Use YYYY-MM-DD'}), 400
        else:
            option.check_in_date = None

    if 'check_out_date' in data:
        if data['check_out_date']:
            try:
                option.check_out_date = datetime.strptime(data['check_out_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid check_out_date format. Use YYYY-MM-DD'}), 400
        else:
            option.check_out_date = None

    if 'category' in data:
        option.category = data['category']

    if 'is_per_person' in data:
        option.is_per_person = data['is_per_person']

    if 'is_per_night' in data:
        option.is_per_night = data['is_per_night']

    if option.link and option.link != old_link:
        option.image_url = None
        option.link_title = None
        option.link_description = None
        LinkScraperService.scrape_and_update_option(option)

    db.session.commit()

    return jsonify({
        'message': 'Option updated successfully',
        'option': option.to_dict(include_votes=True)
    }), 200


@bp.route('/options/<int:option_id>', methods=['DELETE'])
@option_access_required
@swag_from({
    'tags': ['Options'],
    'summary': 'Delete an option',
    'parameters': [{
        'name': 'option_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'Option deleted successfully'},
        403: {'description': 'Not a member of this trip'},
        404: {'description': 'Option not found'}
    }
})
def delete_option(option_id, option, membership):
    if option.image_path:
        try:
            image_file = os.path.join(get_upload_folder(), option.image_path)
            if os.path.exists(image_file):
                os.remove(image_file)
        except Exception:
            pass

    db.session.delete(option)
    db.session.commit()

    return jsonify({'message': 'Option deleted successfully'}), 200


@bp.route('/options/<int:option_id>/image', methods=['POST'])
@option_access_required
@swag_from({
    'tags': ['Options'],
    'summary': 'Upload an image for an option',
    'consumes': ['multipart/form-data'],
    'parameters': [
        {'name': 'option_id', 'in': 'path', 'type': 'integer', 'required': True},
        {
            'name': 'image',
            'in': 'formData',
            'type': 'file',
            'required': True,
            'description': 'Image file (png, jpg, jpeg, gif, webp)'
        }
    ],
    'responses': {
        200: {'description': 'Image uploaded successfully'},
        400: {'description': 'No file or invalid file type'},
        403: {'description': 'Not a member of this trip'},
        404: {'description': 'Option not found'}
    }
})
def upload_option_image(option_id, option, membership):
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp'}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(get_upload_folder(), filename)
    file.save(filepath)

    if option.image_path:
        option.image_path = f"{option.image_path},{filename}"
    else:
        option.image_path = filename
    db.session.commit()

    return jsonify({
        'message': 'Image uploaded successfully',
        'option': option.to_dict(include_votes=True)
    }), 200


@bp.route('/options/<int:option_id>/image', methods=['DELETE'])
@option_access_required
@swag_from({
    'tags': ['Options'],
    'summary': 'Delete the image for an option',
    'parameters': [
        {'name': 'option_id', 'in': 'path', 'type': 'integer', 'required': True}
    ],
    'responses': {
        200: {'description': 'Image deleted successfully'},
        403: {'description': 'Not a member of this trip'},
        404: {'description': 'Option not found'}
    }
})
def delete_option_image(option_id, option, membership):
    if option.image_path:
        try:
            filepath = os.path.join(get_upload_folder(), option.image_path)
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception:
            pass

        option.image_path = None
        db.session.commit()

    return jsonify({
        'message': 'Image deleted successfully',
        'option': option.to_dict(include_votes=True)
    }), 200


@bp.route('/uploads/options/<filename>', methods=['GET'])
def serve_option_image(filename):
    return send_from_directory(get_upload_folder(), filename)


@bp.route('/options/<int:option_id>/finalize', methods=['POST'])
@option_access_required
@swag_from({
    'tags': ['Options'],
    'summary': 'Finalize/select an option (admin only)',
    'parameters': [
        {'name': 'option_id', 'in': 'path', 'type': 'integer', 'required': True}
    ],
    'responses': {
        200: {'description': 'Option finalized successfully'},
        403: {'description': 'Only trip owner can finalize options'},
        404: {'description': 'Option not found'}
    }
})
def finalize_option(option_id, option, membership):
    if membership.role != 'owner':
        return jsonify({'error': 'Only the trip owner can finalize options'}), 403

    option.is_finalized = True
    db.session.commit()

    return jsonify({
        'message': 'Option finalized successfully',
        'option': option.to_dict(include_votes=True)
    }), 200


@bp.route('/options/<int:option_id>/unfinalize', methods=['POST'])
@option_access_required
@swag_from({
    'tags': ['Options'],
    'summary': 'Unfinalize/deselect an option (any member can unselect)',
    'parameters': [
        {'name': 'option_id', 'in': 'path', 'type': 'integer', 'required': True}
    ],
    'responses': {
        200: {'description': 'Option unfinalized successfully'},
        404: {'description': 'Option not found'}
    }
})
def unfinalize_option(option_id, option, membership):
    option.is_finalized = False
    db.session.commit()

    return jsonify({
        'message': 'Option unfinalized successfully',
        'option': option.to_dict(include_votes=True)
    }), 200


@bp.route('/trips/<int:trip_id>/options/by-date', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Options'],
    'summary': 'Get options grouped by date',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True}
    ],
    'responses': {
        200: {'description': 'Options grouped by date'},
        403: {'description': 'Not a member of this trip'}
    }
})
def get_options_by_date(trip_id, trip, membership):
    options = StayOption.query.filter_by(trip_id=trip_id).all()
    
    by_date = {}
    no_date = []
    
    for option in options:
        option_data = option.to_dict(include_votes=True)
        if option.check_in_date:
            date_key = option.check_in_date.isoformat()
            if date_key not in by_date:
                by_date[date_key] = []
            by_date[date_key].append(option_data)
        else:
            no_date.append(option_data)
    
    sorted_dates = sorted(by_date.keys())
    result = [{'date': d, 'options': by_date[d]} for d in sorted_dates]
    
    if no_date:
        result.append({'date': None, 'options': no_date})
    
    return jsonify({
        'options_by_date': result,
        'trip_start': trip.start_date.isoformat() if trip.start_date else None,
        'trip_end': trip.end_date.isoformat() if trip.end_date else None
    }), 200


@bp.route('/options/<int:option_id>/scrape', methods=['POST'])
@option_access_required
@swag_from({
    'tags': ['Options'],
    'summary': 'Manually trigger link scraping for an option',
    'parameters': [
        {'name': 'option_id', 'in': 'path', 'type': 'integer', 'required': True}
    ],
    'responses': {
        200: {'description': 'Scraping completed'},
        400: {'description': 'No link to scrape'},
        404: {'description': 'Option not found'}
    }
})
def scrape_option_link(option_id, option, membership):
    if not option.link:
        return jsonify({'error': 'Option has no link to scrape'}), 400

    option.image_url = None
    option.link_title = None
    option.link_description = None
    
    success = LinkScraperService.scrape_and_update_option(option)
    
    if success:
        db.session.commit()
        return jsonify({
            'message': 'Link scraped successfully',
            'option': option.to_dict(include_votes=True)
        }), 200
    else:
        return jsonify({
            'message': 'Could not scrape link. The website may be blocking requests.',
            'option': option.to_dict(include_votes=True)
        }), 200
@bp.route('/options/extract', methods=['POST'])
@swag_from({
    'tags': ['Options'],
    'summary': 'Preview metadata from a link (Airbnb, Booking.com, etc)',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['url'],
                'properties': {
                    'url': {'type': 'string', 'example': 'https://airbnb.com/rooms/123'}
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Metadata extracted successfully'},
        400: {'description': 'Invalid URL or no URL provided'}
    }
})
def extract_link_metadata():
    data = request.get_json()
    if not data or not data.get('url'):
        return jsonify({'error': 'URL is required'}), 400
    
    metadata = LinkScraperService.scrape_link(data['url'])
    if not metadata:
        return jsonify({'error': 'Could not extract metadata from this link'}), 400
        
    return jsonify(metadata), 200
