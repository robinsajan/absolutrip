import os
import uuid
from datetime import datetime
from decimal import Decimal, ROUND_DOWN, InvalidOperation
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_login import current_user
from werkzeug.utils import secure_filename
from flasgger import swag_from
from ..extensions import db
from ..models import Expense, ExpenseSplit, TripMember, ExpenseComment, ExpenseActivity
from ..utils.decorators import trip_member_required
from ..services.settlement import SettlementService

bp = Blueprint('expenses', __name__, url_prefix='/api')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_receipt_upload_folder():
    upload_folder = os.path.join(current_app.root_path, '..', 'uploads', 'receipts')
    os.makedirs(upload_folder, exist_ok=True)
    return upload_folder


@bp.route('/trips/<trip_id>/expenses', methods=['POST'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Add a new expense to a trip',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['amount', 'description'],
                'properties': {
                    'amount': {'type': 'number', 'example': 120.50},
                    'description': {'type': 'string', 'example': 'Dinner at Beach'},
                    'category': {'type': 'string', 'example': 'food'},
                    'paid_by': {'type': 'integer', 'description': 'User ID who paid'},
                    'expense_date': {'type': 'string', 'example': '2024-03-20'},
                    'split_type': {'type': 'string', 'enum': ['equally', 'shares', 'percentage', 'exact']},
                    'split_data': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'user_id': {'type': 'integer'},
                                'share_count': {'type': 'integer'},
                                'percentage': {'type': 'number'},
                                'amount': {'type': 'number'}
                            }
                        }
                    },
                    'currency': {'type': 'string', 'example': 'INR'},
                    'exchange_rate': {'type': 'number', 'example': 1.0},
                    'base_amount': {'type': 'number'},
                    'receipt_url': {'type': 'string'}
                }
            }
        }
    ],
    'responses': {
        201: {'description': 'Expense created successfully'},
        400: {'description': 'Invalid data'},
        403: {'description': 'Not a member of this trip'}
    }
})
def record_expense(trip_id, trip, membership):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    amount_val = data.get('amount')
    description = data.get('description')

    if amount_val is None or not description:
        return jsonify({'error': 'Amount and description are required'}), 400

    try:
        total_amount = Decimal(str(amount_val))
        if total_amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
    except (ValueError, TypeError, InvalidOperation):
        return jsonify({'error': 'Invalid amount format'}), 400

    paid_by = data.get('paid_by', current_user.id)
    payer_membership = TripMember.query.filter_by(trip_id=trip_id, user_id=paid_by).first()
    if not payer_membership:
        return jsonify({'error': 'Payer is not a member of this trip'}), 400

    expense_date = None
    if data.get('expense_date'):
        try:
            expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid expense_date format. Use YYYY-MM-DD'}), 400

    split_type = data.get('split_type', 'equally')
    split_data = data.get('split_data', [])
    
    # If no split data, default to all members for 'equally'
    if not split_data:
        members = TripMember.query.filter_by(trip_id=trip_id, status='approved').all()
        split_data = [{'user_id': m.user_id} for m in members]

    # Validate all split users are members
    split_user_ids = [s['user_id'] for s in split_data]
    memberships = TripMember.query.filter(TripMember.trip_id == trip_id, TripMember.user_id.in_(split_user_ids)).all()
    if len(memberships) != len(split_data):
        return jsonify({'error': 'One or more split users are not members of this trip'}), 400

    expense = Expense(
        trip_id=trip_id,
        paid_by=paid_by,
        amount=total_amount,
        base_amount=Decimal(str(data.get('base_amount', amount_val))),
        currency=data.get('currency', 'INR'),
        exchange_rate=Decimal(str(data.get('exchange_rate', 1.0))),
        description=description,
        category=data.get('category'),
        split_type=split_type,
        receipt_url=data.get('receipt_url'),
        expense_date=expense_date
    )
    db.session.add(expense)
    db.session.flush()

    # Calculation logic
    calculated_splits = []
    
    if split_type == 'equally':
        n = len(split_data)
        split_amount = (total_amount / n).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
        remainder = total_amount - (split_amount * n)
        
        for i, s in enumerate(split_data):
            amt = split_amount
            if i == 0: amt += remainder # Assign remainder to first person
            calculated_splits.append({
                'user_id': s['user_id'],
                'amount': amt
            })

    elif split_type == 'shares':
        total_shares = sum(int(s.get('share_count', 1)) for s in split_data)
        if total_shares == 0: return jsonify({'error': 'Total shares cannot be zero'}), 400
        
        share_value = (total_amount / total_shares).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
        
        current_total = Decimal('0.00')
        for i, s in enumerate(split_data):
            share_count = int(s.get('share_count', 1))
            amt = (share_value * share_count).quantize(Decimal('0.01'))
            calculated_splits.append({
                'user_id': s['user_id'],
                'amount': amt,
                'share_count': share_count
            })
            current_total += amt
        
        # Adjust remainder
        remainder = total_amount - current_total
        if calculated_splits:
            calculated_splits[0]['amount'] += remainder

    elif split_type == 'percentage':
        total_pct = sum(Decimal(str(s.get('percentage', 0))) for s in split_data)
        if abs(total_pct - 100) > Decimal('0.01'):
            return jsonify({'error': 'Percentages must sum to 100'}), 400
            
        current_total = Decimal('0.00')
        for i, s in enumerate(split_data):
            pct = Decimal(str(s.get('percentage', 0)))
            amt = (total_amount * (pct / 100)).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
            calculated_splits.append({
                'user_id': s['user_id'],
                'amount': amt,
                'percentage': pct
            })
            current_total += amt
            
        remainder = total_amount - current_total
        if calculated_splits:
            calculated_splits[0]['amount'] += remainder

    elif split_type == 'exact':
        total_split = sum(Decimal(str(s.get('amount', 0))) for s in split_data)
        if abs(total_split - total_amount) > Decimal('0.01'):
            return jsonify({'error': f'Split amounts ({total_split}) must sum to total ({total_amount})'}), 400
            
        for s in split_data:
            calculated_splits.append({
                'user_id': s['user_id'],
                'amount': Decimal(str(s.get('amount', 0)))
            })

    # Save splits
    for s_info in calculated_splits:
        split = ExpenseSplit(
            expense_id=expense.id,
            user_id=s_info['user_id'],
            amount=s_info['amount'],
            share_count=s_info.get('share_count'),
            percentage=s_info.get('percentage')
        )
        db.session.add(split)

    # Log Activity
    activity = ExpenseActivity(
        expense_id=expense.id,
        user_id=current_user.id,
        activity_type='created',
        details=f"Added {description} (₹{total_amount})"
    )
    db.session.add(activity)

    db.session.commit()

    return jsonify({
        'message': 'Expense created successfully',
        'expense': expense.to_dict(include_splits=True)
    }), 201


@bp.route('/trips/<trip_id>/expenses', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'List all expenses for a trip',
    'parameters': [{
        'name': 'trip_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'List of expenses'},
        403: {'description': 'Not a member of this trip'}
    }
})
def list_expenses(trip_id, trip, membership):
    expenses = Expense.query.filter_by(trip_id=trip_id).order_by(
        Expense.created_at.desc()
    ).all()

    return jsonify({
        'expenses': [e.to_dict(include_splits=True) for e in expenses]
    }), 200


@bp.route('/trips/<trip_id>/expenses/<int:expense_id>', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Get expense details',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {'name': 'expense_id', 'in': 'path', 'type': 'integer', 'required': True}
    ],
    'responses': {
        200: {'description': 'Expense details'},
        403: {'description': 'Not a member of this trip'},
        404: {'description': 'Expense not found'}
    }
})
def get_expense(trip_id, expense_id, trip, membership):
    expense = Expense.query.filter_by(id=expense_id, trip_id=trip_id).first()

    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    return jsonify({'expense': expense.to_dict(include_splits=True)}), 200


@bp.route('/trips/<trip_id>/expenses/<int:expense_id>', methods=['PUT'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Update an expense',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {'name': 'expense_id', 'in': 'path', 'type': 'integer', 'required': True},
        {
            'name': 'body',
            'in': 'body',
            'schema': {
                'type': 'object',
                'properties': {
                    'amount': {'type': 'number', 'example': 150.00},
                    'description': {'type': 'string', 'example': 'Updated description'},
                    'category': {'type': 'string', 'example': 'food'},
                    'split_type': {'type': 'string', 'enum': ['equally', 'shares', 'percentage', 'exact']},
                    'split_data': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'user_id': {'type': 'integer'},
                                'share_count': {'type': 'integer'},
                                'percentage': {'type': 'number'},
                                'amount': {'type': 'number'}
                            }
                        }
                    },
                    'expense_date': {'type': 'string', 'example': '2024-03-20'},
                    'receipt_url': {'type': 'string'}
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Expense updated successfully'},
        400: {'description': 'Invalid data'},
        403: {'description': 'Only payer or trip owner can edit'},
        404: {'description': 'Expense not found'}
    }
})
def update_expense(trip_id, expense_id, trip, membership):
    expense = Expense.query.filter_by(id=expense_id, trip_id=trip_id).first()
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    if expense.paid_by != current_user.id and membership.role != 'owner':
        return jsonify({'error': 'Only the payer or trip owner can edit this expense'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    changes = []

    if 'amount' in data:
        try:
            new_amount = Decimal(str(data['amount']))
            if new_amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
            if new_amount != expense.amount:
                changes.append(f"Amount changed from ₹{expense.amount} to ₹{new_amount}")
                expense.amount = new_amount
        except (ValueError, TypeError, InvalidOperation):
            return jsonify({'error': 'Invalid amount format'}), 400

    if 'description' in data:
        if not data['description']:
            return jsonify({'error': 'Description cannot be empty'}), 400
        if data['description'] != expense.description:
            changes.append(f"Description changed to '{data['description']}'")
            expense.description = data['description']

    if 'category' in data:
        expense.category = data['category']

    if 'expense_date' in data:
        if data['expense_date']:
            try:
                expense.expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid expense_date format. Use YYYY-MM-DD'}), 400
        else:
            expense.expense_date = None

    if 'receipt_url' in data:
        expense.receipt_url = data['receipt_url']

    if 'split_type' in data or 'split_data' in data or 'amount' in data:
        split_type = data.get('split_type', expense.split_type)
        split_data = data.get('split_data')
        
        # If split_data is not provided, we must re-calculate based on existing splits and new amount/type
        if split_data is None:
            # Re-use existing split users
            existing_splits = ExpenseSplit.query.filter_by(expense_id=expense.id).all()
            split_data = []
            for s in existing_splits:
                split_data.append({
                    'user_id': s.user_id,
                    'share_count': s.share_count,
                    'percentage': s.percentage,
                    'amount': s.amount
                })
        
        if split_type != expense.split_type:
            expense.split_type = split_type
            changes.append(f"Split type changed to '{split_type}'")

        # Re-calculate splits (identical logic to record_expense)
        total_amount = expense.amount
        calculated_splits = []
        
        if split_type == 'equally':
            n = len(split_data)
            if n > 0:
                split_amount = (total_amount / n).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                remainder = total_amount - (split_amount * n)
                for i, s in enumerate(split_data):
                    amt = split_amount
                    if i == 0: amt += remainder
                    calculated_splits.append({'user_id': s['user_id'], 'amount': amt})

        elif split_type == 'shares':
            total_shares = sum(int(s.get('share_count', 1)) for s in split_data)
            if total_shares > 0:
                share_value = (total_amount / total_shares).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                current_total = Decimal('0.00')
                for i, s in enumerate(split_data):
                    share_count = int(s.get('share_count', 1))
                    amt = (share_value * share_count).quantize(Decimal('0.01'))
                    calculated_splits.append({'user_id': s['user_id'], 'amount': amt, 'share_count': share_count})
                    current_total += amt
                remainder = total_amount - current_total
                if calculated_splits: calculated_splits[0]['amount'] += remainder

        elif split_type == 'percentage':
            total_pct = sum(Decimal(str(s.get('percentage', 0))) for s in split_data)
            if abs(total_pct - 100) <= Decimal('0.01'):
                current_total = Decimal('0.00')
                for i, s in enumerate(split_data):
                    pct = Decimal(str(s.get('percentage', 0)))
                    amt = (total_amount * (pct / 100)).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                    calculated_splits.append({'user_id': s['user_id'], 'amount': amt, 'percentage': pct})
                    current_total += amt
                remainder = total_amount - current_total
                if calculated_splits: calculated_splits[0]['amount'] += remainder

        elif split_type == 'exact':
            for s in split_data:
                calculated_splits.append({'user_id': s['user_id'], 'amount': Decimal(str(s.get('amount', 0)))})

        if calculated_splits:
            ExpenseSplit.query.filter_by(expense_id=expense.id).delete()
            for s_info in calculated_splits:
                split = ExpenseSplit(
                    expense_id=expense.id,
                    user_id=s_info['user_id'],
                    amount=s_info['amount'],
                    share_count=s_info.get('share_count'),
                    percentage=s_info.get('percentage')
                )
                db.session.add(split)

    if changes:
        activity = ExpenseActivity(
            expense_id=expense.id,
            user_id=current_user.id,
            activity_type='updated',
            details="; ".join(changes)
        )
        db.session.add(activity)

    db.session.commit()

    return jsonify({
        'message': 'Expense updated successfully',
        'expense': expense.to_dict(include_splits=True)
    }), 200


@bp.route('/trips/<trip_id>/expenses/<int:expense_id>/comments', methods=['GET', 'POST'])
@trip_member_required
def expense_comments(trip_id, expense_id, trip, membership):
    expense = Expense.query.filter_by(id=expense_id, trip_id=trip_id).first()
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    if request.method == 'POST':
        data = request.get_json()
        if not data or not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        comment = ExpenseComment(
            expense_id=expense.id,
            user_id=current_user.id,
            content=data['content']
        )
        db.session.add(comment)
        
        activity = ExpenseActivity(
            expense_id=expense.id,
            user_id=current_user.id,
            activity_type='comment_added',
            details=f"Added a comment"
        )
        db.session.add(activity)
        db.session.commit()
        return jsonify(comment.to_dict()), 201

    comments = [c.to_dict() for c in expense.comments.order_by(ExpenseComment.created_at.asc()).all()]
    return jsonify(comments), 200


@bp.route('/trips/<trip_id>/expenses/<int:expense_id>/activities', methods=['GET'])
@trip_member_required
def expense_activities(trip_id, expense_id, trip, membership):
    expense = Expense.query.filter_by(id=expense_id, trip_id=trip_id).first()
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    activities = [a.to_dict() for a in expense.activities.order_by(ExpenseActivity.created_at.desc()).all()]
    return jsonify(activities), 200


@bp.route('/trips/<trip_id>/expenses/<int:expense_id>', methods=['DELETE'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Delete an expense',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {'name': 'expense_id', 'in': 'path', 'type': 'integer', 'required': True}
    ],
    'responses': {
        200: {'description': 'Expense deleted successfully'},
        403: {'description': 'Only payer or trip owner can delete'},
        404: {'description': 'Expense not found'}
    }
})
def delete_expense(trip_id, expense_id, trip, membership):
    expense = Expense.query.filter_by(id=expense_id, trip_id=trip_id).first()

    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    if expense.paid_by != current_user.id and membership.role != 'owner':
        return jsonify({'error': 'Only the payer or trip owner can delete this expense'}), 403

    db.session.delete(expense)
    db.session.commit()

    return jsonify({'message': 'Expense deleted successfully'}), 200


@bp.route('/trips/<trip_id>/budget', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Get budget summary',
    'parameters': [{
        'name': 'trip_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'Budget summary with totals by category and payer'},
        403: {'description': 'Not a member of this trip'}
    }
})
def get_budget(trip_id, trip, membership):
    summary = SettlementService.get_budget_summary(trip_id)
    return jsonify({'budget': summary}), 200


@bp.route('/trips/<trip_id>/settlement', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Get settlement - who owes whom',
    'parameters': [{
        'name': 'trip_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'Balances and settlement transactions'},
        403: {'description': 'Not a member of this trip'}
    }
})
def get_settlement(trip_id, trip, membership):
    balance_details = SettlementService.calculate_balance_details(trip_id)
    settlements = SettlementService.calculate_settlements(trip_id)
    budget = SettlementService.get_budget_summary(trip_id)

    balances = list(balance_details.values())

    explanation = {
        'how_it_works': 'Your balance is calculated as: Total Paid - Your Share. A positive balance means others owe you money. A negative balance means you owe others.',
        'settlement_method': 'We use an optimized algorithm to minimize the number of transactions needed to settle all debts.',
        'total_expenses': budget['total_expenses'],
        'member_count': budget['member_count'],
        'per_person_average': budget['per_person_average']
    }

    return jsonify({
        'balances': balances,
        'settlements': settlements,
        'explanation': explanation
    }), 200


@bp.route('/trips/<trip_id>/settlement/<int:user_id>', methods=['GET'])
@trip_member_required
def get_personal_settlement(trip_id, user_id, trip, membership):
    settlements = SettlementService.calculate_settlements(trip_id)

    owes = []
    owed_by = []

    for s in settlements:
        if s['from_user_id'] == user_id:
            owes.append({
                'to_user_id': s['to_user_id'],
                'to_user_name': s['to_user_name'],
                'amount': s['amount']
            })
        elif s['to_user_id'] == user_id:
            owed_by.append({
                'from_user_id': s['from_user_id'],
                'from_user_name': s['from_user_name'],
                'amount': s['amount']
            })

    return jsonify({
        'user_id': user_id,
        'owes': owes,
        'owed_by': owed_by,
        'who_should_pay_next': SettlementService.get_who_should_pay_next(trip_id)
    }), 200


@bp.route('/trips/<trip_id>/settle', methods=['POST'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Record a settlement payment between members',
    'parameters': [
        {'name': 'trip_id', 'in': 'path', 'type': 'integer', 'required': True},
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['amount', 'from_user_id', 'to_user_id'],
                'properties': {
                    'amount': {'type': 'number', 'example': 50.00},
                    'from_user_id': {'type': 'integer', 'description': 'User ID who is paying'},
                    'to_user_id': {'type': 'integer', 'description': 'User ID who is receiving'},
                    'date': {'type': 'string', 'example': '2024-03-20'}
                }
            }
        }
    ],
    'responses': {
        201: {'description': 'Settlement recorded successfully'},
        400: {'description': 'Invalid data'},
        403: {'description': 'Not a member of this trip'}
    }
})
def record_settlement(trip_id, trip, membership):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    amount = data.get('amount')
    from_user_id = data.get('from_user_id')
    to_user_id = data.get('to_user_id')

    if not amount or not from_user_id or not to_user_id:
        return jsonify({'error': 'amount, from_user_id, and to_user_id are required'}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount format'}), 400

    # Verify both are members
    from_member = TripMember.query.filter_by(trip_id=trip_id, user_id=from_user_id).first()
    to_member = TripMember.query.filter_by(trip_id=trip_id, user_id=to_user_id).first()

    if not from_member or not to_member:
        return jsonify({'error': 'One or both users are not members of this trip'}), 400

    expense_date = datetime.utcnow().date()
    if data.get('date'):
        try:
            expense_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    # Create the settlement expense
    # Payer is the one WHO IS PAYING the settlement (the debtor)
    expense = Expense(
        trip_id=trip_id,
        paid_by=from_user_id,
        amount=amount,
        description=f"Settlement to {to_member.user.name}",
        category='settlement',
        expense_date=expense_date
    )
    db.session.add(expense)
    db.session.flush()

    # Split is only for the one WHO IS RECEIVING it (the creditor)
    # This way, the debtor's "Paid" increases, and the creditor's "Share" increases.
    # Balance = Paid - Share. 
    # Debtor: Paid increases by amount -> Balance increases (moves from negative to zero)
    # Creditor: Share increases by amount -> Balance decreases (moves from positive to zero)
    split = ExpenseSplit(
        expense_id=expense.id,
        user_id=to_user_id,
        amount=amount
    )
    db.session.add(split)
    db.session.commit()

    return jsonify({
        'message': 'Settlement recorded successfully',
        'expense': expense.to_dict(include_splits=True)
    }), 201


@bp.route('/expenses/upload-receipt', methods=['POST'])
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Upload a receipt image or PDF',
    'consumes': ['multipart/form-data'],
    'parameters': [
        {
            'name': 'file',
            'in': 'formData',
            'type': 'file',
            'required': True,
            'description': 'Receipt file (png, jpg, jpeg, gif, webp, pdf)'
        }
    ],
    'responses': {
        200: {
            'description': 'File uploaded successfully',
            'schema': {
                'type': 'object',
                'properties': {
                    'url': {'type': 'string', 'example': '/api/uploads/receipts/uuid.pdf'}
                }
            }
        },
        400: {'description': 'No file or invalid file type'}
    }
})
def upload_receipt():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp, pdf'}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(get_receipt_upload_folder(), filename)
    file.save(filepath)

    # Return the relative URL to the file
    return jsonify({
        'url': f'/api/uploads/receipts/{filename}'
    }), 200


@bp.route('/uploads/receipts/<filename>', methods=['GET'])
def serve_receipt(filename):
    return send_from_directory(get_receipt_upload_folder(), filename)


@bp.route('/trips/<trip_id>/expenses/by-date', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Get expenses grouped by date',
    'parameters': [{
        'name': 'trip_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'Expenses grouped by date with daily totals'},
        403: {'description': 'Not a member of this trip'}
    }
})
def get_expenses_by_date(trip_id, trip, membership):
    expenses = Expense.query.filter_by(trip_id=trip_id).all()
    
    by_date = {}
    no_date = []
    
    for expense in expenses:
        expense_data = expense.to_dict(include_splits=True)
        if expense.expense_date:
            date_key = expense.expense_date.isoformat()
            if date_key not in by_date:
                by_date[date_key] = {'expenses': [], 'total': 0, 'by_category': {}}
            by_date[date_key]['expenses'].append(expense_data)
            by_date[date_key]['total'] += float(expense.amount)
            cat = expense.category or 'uncategorized'
            by_date[date_key]['by_category'][cat] = by_date[date_key]['by_category'].get(cat, 0) + float(expense.amount)
        else:
            no_date.append(expense_data)
    
    sorted_dates = sorted(by_date.keys())
    result = []
    for d in sorted_dates:
        result.append({
            'date': d,
            'expenses': by_date[d]['expenses'],
            'total': by_date[d]['total'],
            'by_category': by_date[d]['by_category']
        })
    
    no_date_total = sum(float(e['amount']) for e in no_date)
    if no_date:
        result.append({
            'date': None,
            'expenses': no_date,
            'total': no_date_total,
            'by_category': {}
        })
    
    return jsonify({
        'expenses_by_date': result,
        'trip_start': trip.start_date.isoformat() if trip.start_date else None,
        'trip_end': trip.end_date.isoformat() if trip.end_date else None
    }), 200


@bp.route('/trips/<trip_id>/budget/by-date', methods=['GET'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Get budget breakdown by date',
    'parameters': [{
        'name': 'trip_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': 'Budget breakdown by date'},
        403: {'description': 'Not a member of this trip'}
    }
})
def get_budget_by_date(trip_id, trip, membership):
    expenses = Expense.query.filter_by(trip_id=trip_id).all()
    members = TripMember.query.filter_by(trip_id=trip_id).all()
    member_count = len(members)
    
    by_date = {}
    total_all = 0
    
    for expense in expenses:
        total_all += float(expense.amount)
        if expense.expense_date:
            date_key = expense.expense_date.isoformat()
            if date_key not in by_date:
                by_date[date_key] = {'total': 0, 'by_category': {}, 'expense_count': 0}
            by_date[date_key]['total'] += float(expense.amount)
            by_date[date_key]['expense_count'] += 1
            cat = expense.category or 'uncategorized'
            by_date[date_key]['by_category'][cat] = by_date[date_key]['by_category'].get(cat, 0) + float(expense.amount)
    
    sorted_dates = sorted(by_date.keys())
    result = []
    for d in sorted_dates:
        result.append({
            'date': d,
            'total': by_date[d]['total'],
            'per_person': by_date[d]['total'] / member_count if member_count > 0 else 0,
            'by_category': by_date[d]['by_category'],
            'expense_count': by_date[d]['expense_count']
        })
    
    return jsonify({
        'budget_by_date': result,
        'overall_total': total_all,
        'overall_per_person': total_all / member_count if member_count > 0 else 0,
        'member_count': member_count,
        'trip_start': trip.start_date.isoformat() if trip.start_date else None,
        'trip_end': trip.end_date.isoformat() if trip.end_date else None
    }), 200
