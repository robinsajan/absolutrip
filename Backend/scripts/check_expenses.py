from app import create_app
from app.extensions import db
from app.models import Expense

app = create_app()
with app.app_context():
    expenses = Expense.query.order_by(Expense.id.desc()).limit(5).all()
    print("Last 5 expenses:")
    for e in expenses:
        print(f"ID: {e.id}, Description: {e.description}, Receipt URL: {e.receipt_url}")
