from functools import wraps
from flask import jsonify, request
from flask_login import current_user
from ..models import Trip, TripMember


def trip_member_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return '', 200

        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401

        trip_id = kwargs.get('trip_id')
        if not trip_id:
            return jsonify({'error': 'Trip ID is required'}), 400

        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404

        membership = TripMember.query.filter_by(
            trip_id=trip_id,
            user_id=current_user.id
        ).first()

        if not membership:
            return jsonify({'error': 'You are not a member of this trip'}), 403

        kwargs['trip'] = trip
        kwargs['membership'] = membership
        return f(*args, **kwargs)

    return decorated_function


def trip_owner_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return '', 200

        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401

        trip_id = kwargs.get('trip_id')
        if not trip_id:
            return jsonify({'error': 'Trip ID is required'}), 400

        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404

        membership = TripMember.query.filter_by(
            trip_id=trip_id,
            user_id=current_user.id
        ).first()

        if not membership or membership.role != 'owner':
            return jsonify({'error': 'Only the trip owner can perform this action'}), 403

        kwargs['trip'] = trip
        kwargs['membership'] = membership
        return f(*args, **kwargs)

    return decorated_function


def option_access_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return '', 200

        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401

        from ..models import StayOption

        option_id = kwargs.get('option_id')
        if not option_id:
            return jsonify({'error': 'Option ID is required'}), 400

        option = StayOption.query.get(option_id)
        if not option:
            return jsonify({'error': 'Option not found'}), 404

        membership = TripMember.query.filter_by(
            trip_id=option.trip_id,
            user_id=current_user.id
        ).first()

        if not membership:
            return jsonify({'error': 'You are not a member of this trip'}), 403

        kwargs['option'] = option
        kwargs['membership'] = membership
        return f(*args, **kwargs)

    return decorated_function




