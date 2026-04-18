from datetime import datetime
from ..extensions import db

class Announcement(db.Model):
    __tablename__ = 'announcements'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trip = db.relationship('Trip', backref=db.backref('announcements', cascade='all, delete-orphan'))
    creator = db.relationship('User', backref=db.backref('announcements', cascade='all, delete-orphan'))
    reactions = db.relationship('AnnouncementReaction', backref='announcement', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'trip_id': self.trip_id,
            'content': self.content,
            'created_by': self.created_by,
            'creator_name': self.creator.name,
            'created_at': self.created_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'updated_at': self.updated_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'reactions': [r.to_dict() for r in self.reactions]
        }

class AnnouncementReaction(db.Model):
    __tablename__ = 'announcement_reactions'

    id = db.Column(db.Integer, primary_key=True)
    announcement_id = db.Column(db.Integer, db.ForeignKey('announcements.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(10), nullable=False) # 'like', 'dislike'

    __table_args__ = (
        db.UniqueConstraint('announcement_id', 'user_id', name='unique_announcement_reaction'),
    )

    user = db.relationship('User', backref=db.backref('announcement_reactions', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'announcement_id': self.announcement_id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'type': self.type
        }
