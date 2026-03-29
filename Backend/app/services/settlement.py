from decimal import Decimal
from collections import defaultdict
from ..models import Expense, ExpenseSplit, TripMember


class SettlementService:
    @staticmethod
    def calculate_balances(trip_id):
        members = TripMember.query.filter_by(trip_id=trip_id, status='approved').all()
        member_ids = {m.user_id for m in members}

        paid = defaultdict(Decimal)
        owed = defaultdict(Decimal)

        expenses = Expense.query.filter_by(trip_id=trip_id).all()

        for expense in expenses:
            paid[expense.paid_by] += Decimal(str(expense.amount))

            splits = ExpenseSplit.query.filter_by(expense_id=expense.id).all()
            for split in splits:
                owed[split.user_id] += Decimal(str(split.amount))

        balances = {}
        for user_id in member_ids:
            user_paid = paid.get(user_id, Decimal('0'))
            user_owed = owed.get(user_id, Decimal('0'))
            balances[user_id] = float(user_paid - user_owed)

        return balances

    @staticmethod
    def calculate_balance_details(trip_id):
        """Calculate detailed balance breakdown for each user."""
        members = TripMember.query.filter_by(trip_id=trip_id, status='approved').all()
        member_map = {m.user_id: m.user for m in members}
        member_ids = {m.user_id for m in members}

        paid = defaultdict(Decimal)
        owed = defaultdict(Decimal)
        expense_counts = defaultdict(int)

        expenses = Expense.query.filter_by(trip_id=trip_id).all()

        for expense in expenses:
            paid[expense.paid_by] += Decimal(str(expense.amount))
            expense_counts[expense.paid_by] += 1

            splits = ExpenseSplit.query.filter_by(expense_id=expense.id).all()
            for split in splits:
                owed[split.user_id] += Decimal(str(split.amount))

        details = {}
        for user_id in member_ids:
            user_paid = paid.get(user_id, Decimal('0'))
            user_owed = owed.get(user_id, Decimal('0'))
            balance = float(user_paid - user_owed)
            
            details[user_id] = {
                'user_id': user_id,
                'user_name': member_map[user_id].name,
                'total_paid': float(user_paid),
                'total_share': float(user_owed),
                'balance': round(balance, 2),
                'expenses_paid': expense_counts.get(user_id, 0),
                'status': 'owed' if balance > 0.01 else ('owes' if balance < -0.01 else 'settled')
            }

        return details

    @staticmethod
    def calculate_settlements(trip_id):
        balances = SettlementService.calculate_balances(trip_id)

        members = TripMember.query.filter_by(trip_id=trip_id, status='approved').all()
        member_map = {m.user_id: m.user for m in members}

        creditors = []
        debtors = []

        for user_id, balance in balances.items():
            if balance > 0.01:
                creditors.append({'user_id': user_id, 'amount': balance})
            elif balance < -0.01:
                debtors.append({'user_id': user_id, 'amount': -balance})

        creditors.sort(key=lambda x: x['amount'], reverse=True)
        debtors.sort(key=lambda x: x['amount'], reverse=True)

        settlements = []
        i, j = 0, 0

        while i < len(debtors) and j < len(creditors):
            debtor = debtors[i]
            creditor = creditors[j]

            amount = min(debtor['amount'], creditor['amount'])

            if amount > 0.01:
                settlements.append({
                    'from_user_id': debtor['user_id'],
                    'from_user_name': member_map[debtor['user_id']].name,
                    'to_user_id': creditor['user_id'],
                    'to_user_name': member_map[creditor['user_id']].name,
                    'amount': round(amount, 2)
                })

            debtor['amount'] -= amount
            creditor['amount'] -= amount

            if debtor['amount'] < 0.01:
                i += 1
            if creditor['amount'] < 0.01:
                j += 1

        return settlements

    @staticmethod
    def get_who_should_pay_next(trip_id):
        """Identify who should pay next to balance the group."""
        balances = SettlementService.calculate_balance_details(trip_id)
        if not balances:
            return None
        
        # Person with the lowest (most negative) balance owes the most
        sorted_members = sorted(balances.values(), key=lambda x: x['balance'])
        debtor = sorted_members[0]
        
        if debtor['balance'] >= -0.01:
            return None # Everyone is roughly settled or owed
            
        return {
            'user_id': debtor['user_id'],
            'user_name': debtor['user_name'],
            'amount_owed': abs(debtor['balance']),
            'suggestion': f"Hey {debtor['user_name']}, you owe the group ₹{abs(debtor['balance']):.2f}. You should pay for the next expense to get back to zero."
        }

    @staticmethod
    def get_budget_summary(trip_id):
        # Only include real expenses, not internal settlements
        expenses = Expense.query.filter(
            Expense.trip_id == trip_id,
            Expense.category != 'settlement'
        ).all()
        
        members = TripMember.query.filter_by(trip_id=trip_id, status='approved').all()

        total = sum(Decimal(str(e.amount)) for e in expenses)
        member_count = len(members)
        per_person = (total / member_count) if member_count > 0 else Decimal('0.00')

        by_category = defaultdict(Decimal)
        for expense in expenses:
            category = expense.category or 'uncategorized'
            by_category[category] += Decimal(str(expense.amount))

        by_payer = defaultdict(Decimal)
        for expense in expenses:
            by_payer[expense.payer.name] += Decimal(str(expense.amount))

        return {
            'total_expenses': round(float(total), 2),
            'member_count': member_count,
            'per_person_average': round(float(per_person), 2),
            'expense_count': len(expenses),
            'by_category': {k: round(float(v), 2) for k, v in by_category.items()},
            'by_payer': {k: round(float(v), 2) for k, v in by_payer.items()},
            'who_should_pay_next': SettlementService.get_who_should_pay_next(trip_id)
        }
