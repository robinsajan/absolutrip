from datetime import datetime
from ..extensions import db


class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False)
    paid_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    description = db.Column(db.String(300), nullable=False)
    category = db.Column(db.String(50), nullable=True)
    expense_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    trip = db.relationship('Trip', back_populates='expenses')
    payer = db.relationship('User', back_populates='paid_expenses')
    splits = db.relationship('ExpenseSplit', back_populates='expense', lazy='dynamic',
                             cascade='all, delete-orphan')

    def to_dict(self, include_splits=False):
        data = {
            'id': self.id,
            'trip_id': self.trip_id,
            'paid_by': self.paid_by,
            'payer_name': self.payer.name,
            'amount': float(self.amount),
            'description': self.description,
            'category': self.category,
            'expense_date': self.expense_date.isoformat() if self.expense_date else None,
            'created_at': self.created_at.isoformat()
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
            'amount': float(self.amount)
        }
