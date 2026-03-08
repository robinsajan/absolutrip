from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from flasgger import swag_from
from ..extensions import db
from ..models import Trip, TripMember
from ..utils.decorators import trip_member_required, trip_owner_required

bp = Blueprint('trips', __name__, url_prefix='/api/trips')


@bp.route('', methods=['POST'])
@login_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'Create a new trip',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['name'],
            'properties': {
                'name': {'type': 'string', 'example': 'Beach Vacation 2026'},
                'start_date': {'type': 'string', 'format': 'date', 'example': '2026-06-01'},
                'end_date': {'type': 'string', 'format': 'date', 'example': '2026-06-07'}
            }
        }
    }],
    'responses': {
        201: {'description': 'Trip created successfully'},
        400: {'description': 'Missing required fields'},
        401: {'description': 'Not authenticated'}
    }
})
def create_trip():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name')
    if not name:
        return jsonify({'error': 'Trip name is required'}), 400

    start_date = None
    end_date = None

    if data.get('start_date'):
        try:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400

    if data.get('end_date'):
        try:
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400

    trip = Trip(
        name=name,
        start_date=start_date,
        end_date=end_date,
        google_maps_url=data.get('google_maps_url'),
        created_by=current_user.id
    )
    db.session.add(trip)
    db.session.flush()

    membership = TripMember(
        trip_id=trip.id,
        user_id=current_user.id,
        role='owner'
    )
    db.session.add(membership)
    db.session.commit()

    return jsonify({
        'message': 'Trip created successfully',
        'trip': trip.to_dict(include_members=True)
    }), 201


@bp.route('', methods=['GET'])
@login_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'List all trips for current user',
    'responses': {
        200: {'description': 'List of trips'},
        401: {'description': 'Not authenticated'}
    }
})
def list_trips():
    memberships = TripMember.query.filter_by(user_id=current_user.id, status='approved').all()
    trips = [m.trip.to_dict(include_members=True) for m in memberships]

    return jsonify({'trips': trips}), 200


@bp.route('/<int:trip_id>', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'Get trip details',
    'parameters': [{
        'name': 'trip_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'Trip details'},
        403: {'description': 'Not a member of this trip'},
        404: {'description': 'Trip not found'}
    }
})
def get_trip(trip_id, trip, membership):
    return jsonify({'trip': trip.to_dict(include_members=True)}), 200


@bp.route('/<int:trip_id>', methods=['PUT'])
@trip_member_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'Update trip details',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {
            'name': 'body',
            'in': 'body',
            'schema': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string'},
                    'start_date': {'type': 'string', 'format': 'date'},
                    'end_date': {'type': 'string', 'format': 'date'}
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Trip updated successfully'},
        400: {'description': 'Invalid data'},
        403: {'description': 'Not a member of this trip'}
    }
})
def update_trip(trip_id, trip, membership):
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'name' in data:
        trip.name = data['name']

    if 'start_date' in data:
        if data['start_date']:
            try:
                trip.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        else:
            trip.start_date = None

    if 'end_date' in data:
        if data['end_date']:
            try:
                trip.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        else:
            trip.end_date = None

    if 'google_maps_url' in data:
        trip.google_maps_url = data['google_maps_url']

    db.session.commit()

    return jsonify({
        'message': 'Trip updated successfully',
        'trip': trip.to_dict()
    }), 200


@bp.route('/<int:trip_id>', methods=['DELETE'])
@trip_owner_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'Delete a trip (owner only)',
    'parameters': [{
        'name': 'trip_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'Trip deleted successfully'},
        403: {'description': 'Only trip owner can delete'}
    }
})
def delete_trip(trip_id, trip, membership):
    db.session.delete(trip)
    db.session.commit()

    return jsonify({'message': 'Trip deleted successfully'}), 200


@bp.route('/join/<invite_code>', methods=['POST'])
@login_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'Request to join a trip via invite code',
    'parameters': [{
        'name': 'invite_code',
        'in': 'path',
        'type': 'string',
        'required': True
    }],
    'responses': {
        200: {'description': 'Join request sent or already a member'},
        404: {'description': 'Invalid invite code'}
    }
})
def join_trip(invite_code):
    trip = Trip.query.filter_by(invite_code=invite_code).first()

    if not trip:
        return jsonify({'error': 'Invalid invite code'}), 404

    existing = TripMember.query.filter_by(
        trip_id=trip.id,
        user_id=current_user.id
    ).first()

    if existing:
        if existing.status == 'approved':
            return jsonify({
                'message': 'You are already a member of this trip',
                'trip': trip.to_dict(),
                'status': 'approved'
            }), 200
        elif existing.status == 'pending':
            return jsonify({
                'message': 'Your join request is pending approval',
                'trip': {'name': trip.name, 'id': trip.id},
                'status': 'pending'
            }), 200
        elif existing.status == 'rejected':
            return jsonify({
                'error': 'Your join request was rejected',
                'status': 'rejected'
            }), 403

    membership = TripMember(
        trip_id=trip.id,
        user_id=current_user.id,
        role='member',
        status='pending'
    )
    db.session.add(membership)
    db.session.commit()

    return jsonify({
        'message': 'Join request sent. Waiting for admin approval.',
        'trip': {'name': trip.name, 'id': trip.id},
        'status': 'pending'
    }), 200


@bp.route('/<int:trip_id>/join-requests', methods=['GET'])
@trip_owner_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'List pending join requests (owner only)',
    'parameters': [{
        'name': 'trip_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'List of pending requests'},
        403: {'description': 'Only trip owner can view requests'}
    }
})
def list_join_requests(trip_id, trip, membership):
    pending = TripMember.query.filter_by(trip_id=trip_id, status='pending').all()
    return jsonify({'requests': [m.to_dict() for m in pending]}), 200


@bp.route('/<int:trip_id>/join-requests/<int:request_id>/approve', methods=['POST'])
@trip_owner_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'Approve a join request (owner only)',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {'name': 'request_id', 'in': 'path', 'type': 'integer', 'required': True}
    ],
    'responses': {
        200: {'description': 'Request approved'},
        403: {'description': 'Only trip owner can approve'},
        404: {'description': 'Request not found'}
    }
})
def approve_join_request(trip_id, request_id, trip, membership):
    join_request = TripMember.query.filter_by(id=request_id, trip_id=trip_id, status='pending').first()
    
    if not join_request:
        return jsonify({'error': 'Join request not found'}), 404
    
    join_request.status = 'approved'
    
    # Recalculate all stay options pricing as group size has changed
    for option in trip.options:
        option.update_pricing()
        
    db.session.commit()
    
    return jsonify({
        'message': 'Join request approved',
        'member': join_request.to_dict()
    }), 200


@bp.route('/<int:trip_id>/join-requests/<int:request_id>/reject', methods=['POST'])
@trip_owner_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'Reject a join request (owner only)',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {'name': 'request_id', 'in': 'path', 'type': 'integer', 'required': True}
    ],
    'responses': {
        200: {'description': 'Request rejected'},
        403: {'description': 'Only trip owner can reject'},
        404: {'description': 'Request not found'}
    }
})
def reject_join_request(trip_id, request_id, trip, membership):
    join_request = TripMember.query.filter_by(id=request_id, trip_id=trip_id, status='pending').first()
    
    if not join_request:
        return jsonify({'error': 'Join request not found'}), 404
    
    join_request.status = 'rejected'
    db.session.commit()
    
    return jsonify({'message': 'Join request rejected'}), 200


@bp.route('/my-requests', methods=['GET'])
@login_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'List my pending join requests',
    'responses': {
        200: {'description': 'List of pending requests'},
        401: {'description': 'Not authenticated'}
    }
})
def my_join_requests():
    pending = TripMember.query.filter_by(user_id=current_user.id, status='pending').all()
    requests = []
    for m in pending:
        requests.append({
            'id': m.id,
            'trip_id': m.trip_id,
            'trip_name': m.trip.name,
            'status': m.status,
            'requested_at': m.joined_at.isoformat()
        })
    return jsonify({'requests': requests}), 200


@bp.route('/<int:trip_id>/members', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'List trip members',
    'parameters': [{
        'name': 'trip_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'List of members'},
        403: {'description': 'Not a member of this trip'}
    }
})
def list_members(trip_id, trip, membership):
    approved_members = TripMember.query.filter_by(trip_id=trip_id, status='approved').all()
    members = [m.to_dict() for m in approved_members]
    return jsonify({'members': members}), 200


@bp.route('/<int:trip_id>/members/<int:user_id>', methods=['DELETE'])
@trip_owner_required
@swag_from({
    'tags': ['Trips'],
    'summary': 'Remove a member from trip (owner only)',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {'name': 'user_id', 'in': 'path', 'type': 'integer', 'required': True}
    ],
    'responses': {
        200: {'description': 'Member removed successfully'},
        400: {'description': 'Cannot remove yourself'},
        403: {'description': 'Only trip owner can remove members'},
        404: {'description': 'User is not a member'}
    }
})
def remove_member(trip_id, user_id, trip, membership):
    if user_id == current_user.id:
        return jsonify({'error': 'Cannot remove yourself. Delete the trip instead.'}), 400

    member = TripMember.query.filter_by(
        trip_id=trip_id,
        user_id=user_id
    ).first()

    if not member:
        return jsonify({'error': 'User is not a member of this trip'}), 404

    db.session.delete(member)
    
    # Recalculate all stay options pricing as group size has changed
    for option in trip.options:
        option.update_pricing()
        
    db.session.commit()

    return jsonify({'message': 'Member removed successfully'}), 200
