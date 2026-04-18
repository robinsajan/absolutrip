from datetime import datetime
from ..extensions import db

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=True) # Can be across trips
    type = db.Column(db.String(50), nullable=False) # 'announcement', 'expense', etc.
    content = db.Column(db.Text, nullable=False)
    related_id = db.Column(db.String(100), nullable=True) # ID of the related item (e.g. announcement_id)
    path = db.Column(db.String(200), nullable=True) # Destination path for clicking
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('notifications', cascade='all, delete-orphan'))
    # No direct trip relationship needed for generic notifications, but can be useful
    trip = db.relationship('Trip', backref=db.backref('notifications', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'trip_id': self.trip_id,
            'type': self.type,
            'content': self.content,
            'related_id': self.related_id,
            'path': self.path,
            'is_read': self.is_read,
            'created_at': self.created_at.strftime('%Y-%m-%dT%H:%M:%SZ')
        }
