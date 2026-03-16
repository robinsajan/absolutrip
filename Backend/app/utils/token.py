import urllib.parse
from itsdangerous import URLSafeTimedSerializer
from flask import current_app

def generate_verification_token(email, salt='email-verification-salt'):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    current_salt = current_app.config.get('SECURITY_PASSWORD_SALT', salt)
    return serializer.dumps(email, salt=current_salt)

def confirm_verification_token(token, expiration=3600, salt='email-verification-salt'):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    current_salt = current_app.config.get('SECURITY_PASSWORD_SALT', salt)
    try:
        email = serializer.loads(
            token,
            salt=current_salt,
            max_age=expiration
        )
    except Exception:
        return False
    return email
