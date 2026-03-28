from flask import jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({'error': 'Authentication required'}), 401

@login_manager.request_loader
def load_user_from_request(request):
    # 1. Try Authorization header
    auth_header = request.headers.get('Authorization')
    if auth_header:
        # Expected format: "Bearer <token>"
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            token = parts[1]
            from .models import User
            return User.verify_jwt(token)
            
    # 2. Try query parameter (useful for images/direct links)
    token = request.args.get('token')
    if token:
        from .models import User
        return User.verify_jwt(token)
        
    return None
