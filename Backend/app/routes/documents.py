import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, redirect
from flask_login import current_user
from ..extensions import db
from ..models import Document, TripMember
from ..utils.decorators import trip_member_required
from ..services.supabase_storage import SupabaseStorage

bp = Blueprint('documents', __name__, url_prefix='/api')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@bp.route('/trips/<trip_id>/documents', methods=['POST'])
@trip_member_required
def upload_document(trip_id, trip, membership):
    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'No files provided'}), 400

    uploaded_paths = []
    uploaded_urls = []
    uploaded_types = []

    for file in files:
        if file.filename == '':
            continue
        
        if not allowed_file(file.filename):
            continue

        # Upload to Supabase - using default bucket (which now looks at DOCUMENT_BUCKET)
        result = SupabaseStorage.upload_file(file, folder="documents")
        
        if result:
            uploaded_paths.append(result['filename'])
            uploaded_urls.append(result['url'])
            uploaded_types.append(file.content_type or 'application/octet-stream')

    if not uploaded_paths:
        return jsonify({'error': 'Failed to upload any valid files'}), 500

    title = request.form.get('title', files[0].filename)
    tags = request.form.get('tags', '')

    document = Document(
        trip_id=trip_id,
        user_id=current_user.id,
        title=title,
        file_path=','.join(uploaded_paths),
        file_url=','.join(uploaded_urls),
        file_type=','.join(uploaded_types),
        tags=tags
    )
    
    db.session.add(document)
    db.session.commit()

    return jsonify({
        'message': 'Documents uploaded successfully',
        'document': document.to_dict()
    }), 201

@bp.route('/trips/<trip_id>/documents', methods=['GET'])
@trip_member_required
def list_documents(trip_id, trip, membership):
    query = Document.query.filter_by(trip_id=trip_id)

    # Tag filter
    tag = request.args.get('tag')
    if tag:
        query = query.filter(Document.tags.like(f'%{tag}%'))

    documents = query.order_by(Document.created_at.desc()).all()

    return jsonify({
        'documents': [d.to_dict() for d in documents]
    }), 200

@bp.route('/documents/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    document = Document.query.get_or_404(doc_id)
    
    # Check if user is trip owner or the uploader
    membership = TripMember.query.filter_by(trip_id=document.trip_id, user_id=current_user.id).first()
    if not membership:
        return jsonify({'error': 'Access denied'}), 403
    
    if membership.role != 'owner' and document.user_id != current_user.id:
        return jsonify({'error': 'Only the uploader or trip owner can delete this document'}), 403

    # Delete all files from Supabase
    paths = document.file_path.split(',')
    for p in paths:
        SupabaseStorage.delete_file(p)
    
    db.session.delete(document)
    db.session.commit()

    return jsonify({'message': 'Document deleted successfully'}), 200

@bp.route('/documents/<int:doc_id>/view/<int:file_index>', methods=['GET'])
def view_document_file(doc_id, file_index):
    document = Document.query.get_or_404(doc_id)
    
    # Check access
    membership = TripMember.query.filter_by(trip_id=document.trip_id, user_id=current_user.id).first()
    if not membership:
        return jsonify({'error': 'Access denied'}), 403

    paths = document.file_path.split(',')
    if file_index < 0 or file_index >= len(paths):
        return jsonify({'error': 'File not found'}), 404

    file_path = paths[file_index]
    signed_url = SupabaseStorage.get_signed_url(file_path, expires_in=300)
    
    if not signed_url:
        # Fallback to public URL if signed URL fails
        urls = document.file_url.split(',')
        return redirect(urls[file_index])
    
    return redirect(signed_url)

@bp.route('/trips/<trip_id>/documents/tags', methods=['GET'])
@trip_member_required
def get_trip_tags(trip_id, trip, membership):
    docs = Document.query.filter_by(trip_id=trip_id).all()
    all_tags = set()
    for d in docs:
        if d.tags:
            for t in d.tags.split(','):
                if t.strip():
                    all_tags.add(t.strip())
    
    return jsonify({'tags': sorted(list(all_tags))}), 200
