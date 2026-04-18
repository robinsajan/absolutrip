from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from ..extensions import db
from ..models import Notification

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
@login_required
def list_notifications():
    notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).limit(50).all()
    
    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'unread_count': Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
    })

@notifications_bp.route('/<int:id>/read', methods=['PUT'])
@login_required
def mark_as_read(id):
    notification = Notification.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    
    notification.is_read = True
    db.session.commit()
    
    return jsonify({'message': 'Notification marked as read'})

@notifications_bp.route('/read-all', methods=['POST'])
@login_required
def mark_all_as_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({Notification.is_read: True})
    db.session.commit()
    
    return jsonify({'message': 'All notifications marked as read'})
