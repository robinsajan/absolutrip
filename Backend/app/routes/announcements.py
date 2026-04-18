from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..extensions import db
from ..models import Announcement, AnnouncementReaction, TripMember, Notification
from ..utils.decorators import trip_member_required, trip_owner_required

bp = Blueprint('announcements', __name__, url_prefix='/api/trips/<trip_id>/announcements')

@bp.route('', methods=['GET'])
@trip_member_required
def list_announcements(trip_id, trip, membership):
    announcements = Announcement.query.filter_by(trip_id=trip_id).order_by(Announcement.created_at.desc()).all()
    return jsonify({'announcements': [a.to_dict() for a in announcements]}), 200

@bp.route('', methods=['POST'])
@trip_owner_required
def create_announcement(trip_id, trip, membership):
    data = request.get_json()
    if not data or not data.get('content'):
        return jsonify({'error': 'Content is required'}), 400

    announcement = Announcement(
        trip_id=trip_id,
        content=data['content'],
        created_by=current_user.id
    )
    db.session.add(announcement)
    db.session.commit()

    # Create notifications for all trip members except the creator
    members = TripMember.query.filter_by(trip_id=trip_id).all()
    for member in members:
        if member.user_id != current_user.id:
            notification = Notification(
                user_id=member.user_id,
                trip_id=trip_id,
                type='announcement',
                content=f"New announcement in {trip.name}: {announcement.content[:50]}...",
                related_id=str(announcement.id),
                path=f"/trip/{trip_id}/announcements"
            )
            db.session.add(notification)
    
    db.session.commit()

    return jsonify({
        'message': 'Announcement created',
        'announcement': announcement.to_dict()
    }), 201

@bp.route('/<int:announcement_id>', methods=['PUT'])
@trip_owner_required
def update_announcement(trip_id, announcement_id, trip, membership):
    announcement = Announcement.query.filter_by(id=announcement_id, trip_id=trip_id).first()
    if not announcement:
        return jsonify({'error': 'Announcement not found'}), 404

    data = request.get_json()
    if not data or not data.get('content'):
        return jsonify({'error': 'Content is required'}), 400

    announcement.content = data['content']
    db.session.commit()

    return jsonify({
        'message': 'Announcement updated',
        'announcement': announcement.to_dict()
    }), 200

@bp.route('/<int:announcement_id>', methods=['DELETE'])
@trip_owner_required
def delete_announcement(trip_id, announcement_id, trip, membership):
    announcement = Announcement.query.filter_by(id=announcement_id, trip_id=trip_id).first()
    if not announcement:
        return jsonify({'error': 'Announcement not found'}), 404

    db.session.delete(announcement)
    db.session.commit()

    return jsonify({'message': 'Announcement deleted'}), 200

@bp.route('/<int:announcement_id>/react', methods=['POST'])
@trip_member_required
def react_announcement(trip_id, announcement_id, trip, membership):
    announcement = Announcement.query.filter_by(id=announcement_id, trip_id=trip_id).first()
    if not announcement:
        return jsonify({'error': 'Announcement not found'}), 404

    data = request.get_json()
    reaction_type = data.get('type') # 'like' or 'dislike'
    if reaction_type not in ['like', 'dislike']:
        return jsonify({'error': 'Invalid reaction type. Use "like" or "dislike"'}), 400

    existing_reaction = AnnouncementReaction.query.filter_by(
        announcement_id=announcement_id,
        user_id=current_user.id
    ).first()

    if existing_reaction:
        if existing_reaction.type == reaction_type:
            # Toggle off
            db.session.delete(existing_reaction)
            message = 'Reaction removed'
        else:
            # Change type
            existing_reaction.type = reaction_type
            message = f'Reaction changed to {reaction_type}'
    else:
        # Add new
        new_reaction = AnnouncementReaction(
            announcement_id=announcement_id,
            user_id=current_user.id,
            type=reaction_type
        )
        db.session.add(new_reaction)
        message = f'Reaction set to {reaction_type}'

    # Mark corresponding announcement notification as read for the user
    Notification.query.filter_by(
        user_id=current_user.id,
        related_id=str(announcement_id),
        type='announcement',
        is_read=False
    ).update({Notification.is_read: True})

    db.session.commit()
    return jsonify({
        'message': message,
        'announcement': announcement.to_dict()
    }), 200
