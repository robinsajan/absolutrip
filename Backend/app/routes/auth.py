from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from flasgger import swag_from
from ..extensions import db
from ..models import User
from ..utils.token import generate_verification_token, confirm_verification_token
from ..utils.email import send_verification_email, send_password_reset_email

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
        return jsonify({'error': 'Mail already exists'}), 409

    user = User(email=email, name=name, is_verified=False)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    # Send verification email
    token = generate_verification_token(user.email)
    send_verification_email(user.email, token)

    return jsonify({
        'message': 'Registration successful. Please check your email to verify your account.',
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

    if not user.is_verified:
        return jsonify({'error': 'Please verify your email address before logging in.'}), 401

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

@bp.route('/verify/<token>', methods=['GET'])
@swag_from({
    'tags': ['Auth'],
    'summary': 'Verify user email',
    'parameters': [{
        'name': 'token',
        'in': 'path',
        'type': 'string',
        'required': True,
        'description': 'Verification token'
    }],
    'responses': {
        200: {'description': 'Email verified successfully'},
        400: {'description': 'The confirmation link is invalid or has expired'}
    }
})
def verify_email(token):
    email = confirm_verification_token(token)
    
    if not email:
        return jsonify({'error': 'The confirmation link is invalid or has expired.'}), 400

    user = User.query.filter_by(email=email).first_or_404()

    if user.is_verified:
        return jsonify({'message': 'Account already verified. Please login.'}), 200

    user.is_verified = True
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'You have verified your account. Thanks!'}), 200


@bp.route('/resend-verification', methods=['POST'])
@swag_from({
    'tags': ['Auth'],
    'summary': 'Resend verification email',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['email'],
            'properties': {
                'email': {'type': 'string', 'example': 'user@example.com'}
            }
        }
    }],
    'responses': {
        200: {'description': 'Verification email resent'},
        400: {'description': 'Missing email'},
        404: {'description': 'User not found'}
    }
})
def resend_verification():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.is_verified:
        return jsonify({'message': 'Account already verified.'}), 200

    token = generate_verification_token(user.email)
    send_verification_email(user.email, token)

    return jsonify({'message': 'Verification email resent.'}), 200


@bp.route('/forgot-password', methods=['POST'])
@swag_from({
    'tags': ['Auth'],
    'summary': 'Request password reset',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['email'],
            'properties': {
                'email': {'type': 'string', 'example': 'user@example.com'}
            }
        }
    }],
    'responses': {
        200: {'description': 'Password reset email sent'},
        400: {'description': 'Email is required'},
        404: {'description': 'Email not registered'}
    }
})
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'No account found with this email.'}), 404

    token = generate_verification_token(user.email, salt='password-reset-salt')
    send_password_reset_email(user.email, token)

    return jsonify({'message': 'A password reset link has been sent to your email.'}), 200


@bp.route('/reset-password', methods=['POST'])
@swag_from({
    'tags': ['Auth'],
    'summary': 'Reset password with token',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['token', 'password'],
            'properties': {
                'token': {'type': 'string', 'example': 'long-token-string'},
                'password': {'type': 'string', 'example': 'new-secure-password'}
            }
        }
    }],
    'responses': {
        200: {'description': 'Password reset successfully'},
        400: {'description': 'Invalid/expired token or missing fields'}
    }
})
def reset_password():
    data = request.get_json()
    token = data.get('token')
    password = data.get('password')

    if not token or not password:
        return jsonify({'error': 'Token and password are required'}), 400

    email = confirm_verification_token(token, salt='password-reset-salt')
    if not email:
        return jsonify({'error': 'The reset link is invalid or has expired.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Your password has been reset successfully. You can now login.'}), 200
