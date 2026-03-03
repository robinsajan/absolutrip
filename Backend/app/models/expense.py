from datetime import datetime
from ..extensions import db


class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False)
    paid_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)  # Total in Trip's primary currency
    base_amount = db.Column(db.Numeric(10, 2), nullable=True)  # Amount in original currency
    currency = db.Column(db.String(3), default='USD')
    exchange_rate = db.Column(db.Numeric(10, 4), default=1.0)
    description = db.Column(db.String(300), nullable=False)
    category = db.Column(db.String(50), nullable=True)
    split_type = db.Column(db.String(20), default='equally')  # equally, shares, exact, percentage
    receipt_url = db.Column(db.String(500), nullable=True)
    expense_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trip = db.relationship('Trip', back_populates='expenses')
    payer = db.relationship('User', back_populates='paid_expenses')
    splits = db.relationship('ExpenseSplit', back_populates='expense', lazy='dynamic',
                             cascade='all, delete-orphan')
    comments = db.relationship('ExpenseComment', back_populates='expense', lazy='dynamic',
                                 cascade='all, delete-orphan')
    activities = db.relationship('ExpenseActivity', back_populates='expense', lazy='dynamic',
                                   cascade='all, delete-orphan')

    def to_dict(self, include_splits=False):
        data = {
            'id': self.id,
            'trip_id': self.trip_id,
            'paid_by': self.paid_by,
            'payer_name': self.payer.name,
            'amount': float(self.amount),
            'base_amount': float(self.base_amount) if self.base_amount else float(self.amount),
            'currency': self.currency or 'USD',
            'exchange_rate': float(self.exchange_rate) if self.exchange_rate else 1.0,
            'description': self.description,
            'category': self.category,
            'split_type': self.split_type or 'equally',
            'receipt_url': self.receipt_url,
            'expense_date': self.expense_date.isoformat() if self.expense_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        if include_splits:
            data['splits'] = [s.to_dict() for s in self.splits]
        return data


class ExpenseSplit(db.Model):
    __tablename__ = 'expense_splits'

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    share_count = db.Column(db.Integer, nullable=True)  # For 'shares' split
    percentage = db.Column(db.Numeric(5, 2), nullable=True)  # For 'percentage' split

    __table_args__ = (
        db.UniqueConstraint('expense_id', 'user_id', name='unique_expense_split'),
    )

    expense = db.relationship('Expense', back_populates='splits')
    user = db.relationship('User', back_populates='expense_splits')

    def to_dict(self):
        return {
            'id': self.id,
            'expense_id': self.expense_id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'amount': float(self.amount),
            'share_count': self.share_count,
            'percentage': float(self.percentage) if self.percentage else None
        }


class ExpenseComment(db.Model):
    __tablename__ = 'expense_comments'

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    expense = db.relationship('Expense', back_populates='comments')
    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'expense_id': self.expense_id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'content': self.content,
            'created_at': self.created_at.isoformat()
        }


class ExpenseActivity(db.Model):
    __tablename__ = 'expense_activities'

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    activity_type = db.Column(db.String(50), nullable=False)  # created, updated, deleted, comment_added
    details = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    expense = db.relationship('Expense', back_populates='activities')
    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'expense_id': self.expense_id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'activity_type': self.activity_type,
            'details': self.details,
            'created_at': self.created_at.isoformat()
        }
