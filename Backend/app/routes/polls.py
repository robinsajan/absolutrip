from flask import Blueprint, request, jsonify
from flask_login import current_user
from ..extensions import db
from ..models import Poll, PollOption, PollVote, TripMember, Notification
from ..utils.decorators import trip_member_required

bp = Blueprint('polls', __name__, url_prefix='/api')

@bp.route('/trips/<trip_id>/polls', methods=['POST'])
@trip_member_required
def create_poll(trip_id, trip, membership):
    data = request.get_json() or {}
    question = data.get('question')
    options_text = data.get('options', [])
    allow_multiple = data.get('allow_multiple', False)

    if not question:
        return jsonify({'error': 'Question is required'}), 400
    if not options_text or len(options_text) < 2:
        return jsonify({'error': 'At least two options are required'}), 400

    poll = Poll(
        trip_id=trip_id,
        question=question,
        allow_multiple=allow_multiple,
        created_by=current_user.id
    )
    db.session.add(poll)
    db.session.flush()

    for opt_text in options_text:
        if opt_text and opt_text.strip():
            option = PollOption(poll_id=poll.id, text=opt_text.strip())
            db.session.add(option)

    # Notify all members
    members = TripMember.query.filter_by(trip_id=trip_id).all()
    for member in members:
        if member.user_id != current_user.id:
            notification = Notification(
                user_id=member.user_id,
                trip_id=trip_id,
                type='poll_pending',
                content=f"New poll: {question}",
                related_id=str(poll.id),
                path=f"/trip/{trip_id}/explore"
            )
            db.session.add(notification)

    db.session.commit()

    return jsonify({
        'message': 'Poll created successfully',
        'poll': poll.to_dict(current_user.id)
    }), 201

@bp.route('/trips/<trip_id>/polls', methods=['GET'])
@trip_member_required
def get_polls(trip_id, trip, membership):
    polls = Poll.query.filter_by(trip_id=trip_id).order_by(Poll.created_at.desc()).all()
    return jsonify({
        'polls': [p.to_dict(current_user.id) for p in polls]
    }), 200

@bp.route('/polls/<int:poll_id>/vote', methods=['POST'])
def vote_poll(poll_id):
    poll = Poll.query.get_or_404(poll_id)
    # Check if user is member of the trip
    membership = TripMember.query.filter_by(trip_id=poll.trip_id, user_id=current_user.id).first()
    if not membership:
        return jsonify({'error': 'Not a member of this trip'}), 403

    data = request.get_json() or {}
    option_ids = data.get('option_ids', [])

    if not option_ids:
        # Check if user wants to remove all votes for this poll
        PollVote.query.filter_by(poll_id=poll_id, user_id=current_user.id).delete()
        db.session.commit()
        return jsonify({
            'message': 'Votes removed',
            'poll': poll.to_dict(current_user.id)
        }), 200

    if not poll.allow_multiple and len(option_ids) > 1:
        return jsonify({'error': 'Multiple selection not allowed'}), 400

    # Remove existing votes for this user on this poll
    PollVote.query.filter_by(poll_id=poll_id, user_id=current_user.id).delete()

    valid_votes = 0
    for opt_id in option_ids:
        # Verify option belongs to poll
        option = PollOption.query.filter_by(id=opt_id, poll_id=poll_id).first()
        if option:
            vote = PollVote(poll_id=poll_id, option_id=opt_id, user_id=current_user.id)
            db.session.add(vote)
            valid_votes += 1

    if valid_votes == 0:
        return jsonify({'error': 'No valid options selected'}), 400

    db.session.commit()

    return jsonify({
        'message': 'Vote recorded successfully',
        'poll': poll.to_dict(current_user.id)
    }), 200

@bp.route('/polls/<int:poll_id>', methods=['DELETE'])
def delete_poll(poll_id):
    poll = Poll.query.get_or_404(poll_id)
    # Only creator or trip owner can delete
    membership = TripMember.query.filter_by(trip_id=poll.trip_id, user_id=current_user.id).first()
    if not membership or (poll.created_by != current_user.id and membership.role != 'owner'):
        return jsonify({'error': 'Unauthorized'}), 403

    db.session.delete(poll)
    db.session.commit()
    return jsonify({'message': 'Poll deleted successfully'}), 200
