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

from sqlalchemy import event
from ..utils.push import send_push_notification

@event.listens_for(Notification, 'after_insert')
def after_notification_insert(mapper, connection, target):
    """Trigger push notification after a notification is saved to DB."""
    # We use a simple task to send the push notification.
    # In a production app, this should be offloaded to a task queue like Celery.
    try:
        from ..models.user import User
        user = User.query.get(target.user_id)
        if user and user.fcm_token:
            title = "TripSync"
            if target.type == 'announcement':
                title = "New Announcement 📢"
            elif target.type == 'expense':
                title = "Expense Update 💸"
            elif target.type == 'poll':
                title = "New Poll 🗳️"
            
            send_push_notification(
                user=user,
                title=title,
                body=target.content,
                data={
                    'type': target.type,
                    'trip_id': str(target.trip_id) if target.trip_id else "",
                    'path': target.path or ""
                }
            )
    except Exception as e:
        # We don't want to fail the DB transaction if push fails
        print(f"Error in push notification listener: {e}")

