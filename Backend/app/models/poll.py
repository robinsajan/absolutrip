from datetime import datetime
from ..extensions import db

class Poll(db.Model):
    __tablename__ = 'polls'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=False)
    question = db.Column(db.String(500), nullable=False)
    allow_multiple = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    trip = db.relationship('Trip', backref=db.backref('polls', cascade='all, delete-orphan'))
    creator = db.relationship('User', backref=db.backref('created_polls', cascade='all, delete-orphan'))
    options = db.relationship('PollOption', backref='poll', cascade='all, delete-orphan', lazy='joined')

    def to_dict(self, user_id=None):
        return {
            'id': self.id,
            'trip_id': self.trip_id,
            'question': self.question,
            'allow_multiple': self.allow_multiple,
            'created_by': self.created_by,
            'creator_name': self.creator.name,
            'created_at': self.created_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'is_active': self.is_active,
            'options': [o.to_dict(user_id) for o in self.options],
            'total_votes': sum(len(o.votes) for o in self.options)
        }

class PollOption(db.Model):
    __tablename__ = 'poll_options'

    id = db.Column(db.Integer, primary_key=True)
    poll_id = db.Column(db.Integer, db.ForeignKey('polls.id'), nullable=False)
    text = db.Column(db.String(200), nullable=False)

    votes = db.relationship('PollVote', backref='option', cascade='all, delete-orphan')

    def to_dict(self, user_id=None):
        data = {
            'id': self.id,
            'poll_id': self.poll_id,
            'text': self.text,
            'vote_count': len(self.votes)
        }
        if user_id:
            data['has_voted'] = any(v.user_id == user_id for v in self.votes)
        return data

class PollVote(db.Model):
    __tablename__ = 'poll_votes'

    id = db.Column(db.Integer, primary_key=True)
    poll_id = db.Column(db.Integer, db.ForeignKey('polls.id'), nullable=False)
    option_id = db.Column(db.Integer, db.ForeignKey('poll_options.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('option_id', 'user_id', name='unique_poll_option_vote'),
    )

    user = db.relationship('User', backref=db.backref('poll_votes', cascade='all, delete-orphan'))
