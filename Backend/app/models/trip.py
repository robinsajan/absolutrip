import secrets
from datetime import datetime
from ..extensions import db


import uuid

class Trip(db.Model):
    __tablename__ = 'trips'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    destination = db.Column(db.String(200), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    budget = db.Column(db.Numeric(10, 2), nullable=True)
    num_travelers = db.Column(db.Integer, default=1)
    is_promoted = db.Column(db.Boolean, default=False)
    invite_code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    google_maps_url = db.Column(db.String(500), nullable=True)
    default_currency = db.Column(db.String(3), default='INR')

    creator = db.relationship('User', back_populates='created_trips')
    members = db.relationship('TripMember', back_populates='trip', lazy='dynamic',
                              cascade='all, delete-orphan')
    options = db.relationship('StayOption', back_populates='trip', lazy='dynamic',
                              cascade='all, delete-orphan')
    expenses = db.relationship('Expense', back_populates='trip', lazy='dynamic',
                               cascade='all, delete-orphan')

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.invite_code:
            self.invite_code = secrets.token_urlsafe(16)

    def to_dict(self, include_members=False):
        data = {
            'id': self.id,
            'name': self.name,
            'destination': self.destination or self.name,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'budget': float(self.budget) if self.budget else None,
            'num_travelers': self.num_travelers,
            'is_promoted': self.is_promoted,
            'invite_code': self.invite_code,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'google_maps_url': self.google_maps_url
        }
        if include_members:
            data['members'] = [m.to_dict() for m in self.members.filter_by(status='approved').all()]
        return data


class TripMember(db.Model):
    __tablename__ = 'trip_members'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), default='member')
    status = db.Column(db.String(20), default='approved')  # pending, approved, rejected
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('trip_id', 'user_id', name='unique_trip_member'),
    )

    trip = db.relationship('Trip', back_populates='members')
    user = db.relationship('User', back_populates='trip_memberships')

    def to_dict(self):
        return {
            'id': self.id,
            'trip_id': self.trip_id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'user_email': self.user.email,
            'role': self.role,
            'status': self.status,
            'joined_at': self.joined_at.isoformat()
        }


class BudgetPlan(db.Model):
    __tablename__ = 'budget_plans'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), default='Budget Scenario')
    selections = db.Column(db.JSON, nullable=False)  # List of selected options with metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trip = db.relationship('Trip', backref=db.backref('budget_plans', cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('budget_plans', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'trip_id': self.trip_id,
            'user_id': self.user_id,
            'name': self.name,
            'selections': self.selections,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
