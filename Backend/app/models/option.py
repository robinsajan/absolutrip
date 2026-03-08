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
    is_per_person = db.Column(db.Boolean, default=False)
    is_per_night = db.Column(db.Boolean, default=False)
    price_per_day_pp = db.Column(db.Numeric(10, 2), nullable=True)
    total_price = db.Column(db.Numeric(10, 2), nullable=True)

    trip = db.relationship('Trip', back_populates='options')
    added_by_user = db.relationship('User', back_populates='added_options')
    votes = db.relationship('Vote', back_populates='option', lazy='dynamic',
                            cascade='all, delete-orphan')

    def update_pricing(self):
        """Calculates and updates the price_per_day_pp and total_price for a StayOption."""
        if self.price is None:
            self.price_per_day_pp = None
            self.total_price = None
            return

        # Count only approved members in group
        member_count = self.trip.members.filter_by(status='approved').count() or 1
        
        # Total duration (minimum 1 night)
        nights = 1
        if self.check_in_date and self.check_out_date:
            nights = (self.check_out_date - self.check_in_date).days
            if nights < 1:
                nights = 1

        # Calculate conditional totals
        raw_price = float(self.price)
        
        # Grand Total for the whole group for the entire stay
        total_group_price = raw_price
        if self.is_per_person:
            total_group_price *= member_count
        if self.is_per_night:
            total_group_price *= nights
            
        self.total_price = total_group_price
        
        # Per Person Per Day unit price
        self.price_per_day_pp = total_group_price / member_count / nights

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
            'is_finalized': self.is_finalized,
            'is_per_person': self.is_per_person,
            'is_per_night': self.is_per_night,
            'price_per_day_pp': float(self.price_per_day_pp) if self.price_per_day_pp else None,
            'total_price': float(self.total_price) if self.total_price else None
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
