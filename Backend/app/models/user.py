import jwt
import time
from datetime import datetime
from flask import current_app
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db, login_manager


class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    show_budget_tour = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    trip_memberships = db.relationship('TripMember', back_populates='user', lazy='dynamic')
    created_trips = db.relationship('Trip', back_populates='creator', lazy='dynamic')
    votes = db.relationship('Vote', back_populates='user', lazy='dynamic')
    paid_expenses = db.relationship('Expense', back_populates='payer', lazy='dynamic')
    expense_splits = db.relationship('ExpenseSplit', back_populates='user', lazy='dynamic')
    added_options = db.relationship('StayOption', back_populates='added_by_user', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'is_verified': self.is_verified,
            'show_budget_tour': self.show_budget_tour,
            'created_at': self.created_at.isoformat()
        }

    def generate_jwt(self, expires_in=604800): # Default 7 days
        return jwt.encode(
            {'user_id': self.id, 'exp': time.time() + expires_in},
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )

    @staticmethod
    def verify_jwt(token):
        try:
            payload = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
        except Exception:
            return None
        return User.query.get(payload['user_id'])


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
