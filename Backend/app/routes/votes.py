from flask import Blueprint, request, jsonify
from flask_login import current_user
from flasgger import swag_from
from ..extensions import db
from ..models import Vote, StayOption
from ..utils.decorators import trip_member_required, option_access_required
from ..services.voting import VotingService

bp = Blueprint('votes', __name__, url_prefix='/api')


@bp.route('/options/<int:option_id>/vote', methods=['POST'])
@option_access_required
@swag_from({
    'tags': ['Votes'],
    'summary': 'Cast or update a vote on an option',
    'parameters': [
        {'name': 'option_id', 'in': 'path', 'type': 'integer', 'required': True},
        {
            'name': 'body',
            'in': 'body',
            'schema': {
                'type': 'object',
                'properties': {
                    'score': {
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 5,
                        'default': 1,
                        'description': 'Vote score (-1 to 5). Use 0 to remove vote.'
                    }
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Vote updated or removed'},
        201: {'description': 'Vote cast successfully'},
        400: {'description': 'Invalid score'},
        403: {'description': 'Not a member of this trip'}
    }
})
def cast_vote(option_id, option, membership):
    data = request.get_json() or {}
    score = data.get('score', 1)

    try:
        score = int(score)
        if score < -1 or score > 5:
            return jsonify({'error': 'Score must be between -1 and 5'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid score format'}), 400

    existing_vote = Vote.query.filter_by(
        option_id=option_id,
        user_id=current_user.id
    ).first()

    if existing_vote:
        if score == 0:
            db.session.delete(existing_vote)
            db.session.commit()
            return jsonify({'message': 'Vote removed'}), 200

        existing_vote.score = score
        db.session.commit()
        return jsonify({
            'message': 'Vote updated',
            'vote': existing_vote.to_dict()
        }), 200

    if score == 0:
        return jsonify({'message': 'No vote to remove'}), 200

    vote = Vote(
        option_id=option_id,
        user_id=current_user.id,
        score=score
    )
    db.session.add(vote)
    db.session.commit()

    return jsonify({
        'message': 'Vote cast successfully',
        'vote': vote.to_dict()
    }), 201


@bp.route('/trips/<trip_id>/options/ranked', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Votes'],
    'summary': 'Get options ranked by votes',
    'parameters': [{
        'name': 'trip_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'Ranked list of options'},
        403: {'description': 'Not a member of this trip'}
    }
})
def get_ranked_options(trip_id, trip, membership):
    ranked_options = VotingService.get_ranked_options(trip_id)

    return jsonify({
        'ranked_options': ranked_options
    }), 200
