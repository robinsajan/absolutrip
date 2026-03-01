from datetime import datetime, date
from ..extensions import db


class StayOption(db.Model):
    __tablename__ = 'stay_options'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    link = db.Column(db.String(500), nullable=True)
    price = db.Column(db.Numeric(10, 2), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    added_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    image_path = db.Column(db.String(500), nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    link_title = db.Column(db.String(300), nullable=True)
    link_description = db.Column(db.Text, nullable=True)
    
    check_in_date = db.Column(db.Date, nullable=True)
    check_out_date = db.Column(db.Date, nullable=True)
    category = db.Column(db.String(50), default='stay')
    is_finalized = db.Column(db.Boolean, default=False)

    trip = db.relationship('Trip', back_populates='options')
    added_by_user = db.relationship('User', back_populates='added_options')
    votes = db.relationship('Vote', back_populates='option', lazy='dynamic',
                            cascade='all, delete-orphan')

    def to_dict(self, include_votes=False):
        data = {
            'id': self.id,
            'trip_id': self.trip_id,
            'title': self.title,
            'link': self.link,
            'price': float(self.price) if self.price else None,
            'notes': self.notes,
            'added_by': self.added_by,
            'added_by_name': self.added_by_user.name,
            'created_at': self.created_at.isoformat(),
            'image_path': self.image_path,
            'image_url': self.image_url,
            'link_title': self.link_title,
            'link_description': self.link_description,
            'check_in_date': self.check_in_date.isoformat() if self.check_in_date else None,
            'check_out_date': self.check_out_date.isoformat() if self.check_out_date else None,
            'category': self.category,
            'is_finalized': self.is_finalized
        }
        if include_votes:
            data['votes'] = [v.to_dict() for v in self.votes]
            data['total_score'] = sum(v.score for v in self.votes)
            data['vote_count'] = self.votes.count()
        return data


class Vote(db.Model):
    __tablename__ = 'votes'

    id = db.Column(db.Integer, primary_key=True)
    option_id = db.Column(db.Integer, db.ForeignKey('stay_options.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    score = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('option_id', 'user_id', name='unique_option_vote'),
    )

    option = db.relationship('StayOption', back_populates='votes')
    user = db.relationship('User', back_populates='votes')

    def to_dict(self):
        return {
            'id': self.id,
            'option_id': self.option_id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'score': self.score,
            'created_at': self.created_at.isoformat()
        }
