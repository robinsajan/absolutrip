from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from flasgger import swag_from
from ..extensions import db
from ..models import User

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@bp.route('/register', methods=['POST'])
@swag_from({
    'tags': ['Auth'],
    'summary': 'Register a new user',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['email', 'password', 'name'],
            'properties': {
                'email': {'type': 'string', 'example': 'user@example.com'},
                'password': {'type': 'string', 'example': 'securepassword'},
                'name': {'type': 'string', 'example': 'John Doe'}
            }
        }
    }],
    'responses': {
        201: {'description': 'User registered successfully'},
        400: {'description': 'Missing required fields'},
        409: {'description': 'Email already registered'}
    }
})
def register():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if not email or not password or not name:
        return jsonify({'error': 'Email, password, and name are required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(email=email, name=name)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    login_user(user, remember=True)

    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_dict()
    }), 201


@bp.route('/login', methods=['POST'])
@swag_from({
    'tags': ['Auth'],
    'summary': 'Login user',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['email', 'password'],
            'properties': {
                'email': {'type': 'string', 'example': 'user@example.com'},
                'password': {'type': 'string', 'example': 'securepassword'}
            }
        }
    }],
    'responses': {
        200: {'description': 'Logged in successfully'},
        400: {'description': 'Missing required fields'},
        401: {'description': 'Invalid credentials'}
    }
})
def login():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    login_user(user, remember=True)

    return jsonify({
        'message': 'Logged in successfully',
        'user': user.to_dict()
    }), 200


@bp.route('/logout', methods=['POST'])
@login_required
@swag_from({
    'tags': ['Auth'],
    'summary': 'Logout current user',
    'responses': {
        200: {'description': 'Logged out successfully'},
        401: {'description': 'Not authenticated'}
    }
})
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200


@bp.route('/me', methods=['GET'])
@login_required
@swag_from({
    'tags': ['Auth'],
    'summary': 'Get current user info',
    'responses': {
        200: {'description': 'Current user data'},
        401: {'description': 'Not authenticated'}
    }
})
def get_current_user():
    return jsonify({'user': current_user.to_dict()}), 200
