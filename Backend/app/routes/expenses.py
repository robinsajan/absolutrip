from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_login import current_user
from flasgger import swag_from
from ..extensions import db
from ..models import Expense, ExpenseSplit, TripMember
from ..utils.decorators import trip_member_required
from ..services.settlement import SettlementService

bp = Blueprint('expenses', __name__, url_prefix='/api')


@bp.route('/trips/<int:trip_id>/expenses', methods=['POST'])
@trip_member_required
@swag_from({
    'tags': ['Expenses'],
    'summary': 'Record a new expense',
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
                    'description': {'type': 'string', 'example': 'Dinner at restaurant'},
                    'category': {'type': 'string', 'example': 'food'},
                    'paid_by': {'type': 'integer', 'description': 'User ID of payer (defaults to current user)'},
                    'split_among': {
                        'type': 'array',
                        'items': {'type': 'integer'},
                        'description': 'User IDs to split among (defaults to all members)'
                    }
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
def create_expense(trip_id, trip, membership):
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    amount = data.get('amount')
    description = data.get('description')

    if not amount or not description:
        return jsonify({'error': 'Amount and description are required'}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount format'}), 400

    paid_by = data.get('paid_by', current_user.id)
    payer_membership = TripMember.query.filter_by(
        trip_id=trip_id,
        user_id=paid_by
    ).first()

    if not payer_membership:
        return jsonify({'error': 'Payer is not a member of this trip'}), 400

    expense_date = None
    if data.get('expense_date'):
        try:
            expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid expense_date format. Use YYYY-MM-DD'}), 400

    expense = Expense(
        trip_id=trip_id,
        paid_by=paid_by,
        amount=amount,
        description=description,
        category=data.get('category'),
        expense_date=expense_date
    )
    db.session.add(expense)
    db.session.flush()

    split_among = data.get('split_among')
    if split_among:
        for user_id in split_among:
            member = TripMember.query.filter_by(
                trip_id=trip_id,
                user_id=user_id
            ).first()
            if not member:
                db.session.rollback()
                return jsonify({'error': f'User {user_id} is not a member of this trip'}), 400

        split_amount = amount / len(split_among)
        for user_id in split_among:
            split = ExpenseSplit(
                expense_id=expense.id,
                user_id=user_id,
                amount=split_amount
            )
            db.session.add(split)
    else:
        members = TripMember.query.filter_by(trip_id=trip_id).all()
        split_amount = amount / len(members)
        for member in members:
            split = ExpenseSplit(
                expense_id=expense.id,
                user_id=member.user_id,
                amount=split_amount
            )
            db.session.add(split)

    db.session.commit()

    return jsonify({
        'message': 'Expense created successfully',
        'expense': expense.to_dict(include_splits=True)
    }), 201


@bp.route('/trips/<int:trip_id>/expenses', methods=['GET'])
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


@bp.route('/trips/<int:trip_id>/expenses/<int:expense_id>', methods=['GET'])
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


@bp.route('/trips/<int:trip_id>/expenses/<int:expense_id>', methods=['PUT'])
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
                    'split_among': {
                        'type': 'array',
                        'items': {'type': 'integer'},
                        'description': 'User IDs to split among'
                    }
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

    if 'amount' in data:
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
            expense.amount = amount
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid amount format'}), 400

    if 'description' in data:
        if not data['description']:
            return jsonify({'error': 'Description cannot be empty'}), 400
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

    if 'split_among' in data:
        split_among = data['split_among']
        
        if not split_among or len(split_among) == 0:
            members = TripMember.query.filter_by(trip_id=trip_id).all()
            split_among = [m.user_id for m in members]
        else:
            for user_id in split_among:
                member = TripMember.query.filter_by(
                    trip_id=trip_id,
                    user_id=user_id
                ).first()
                if not member:
                    return jsonify({'error': f'User {user_id} is not a member of this trip'}), 400

        ExpenseSplit.query.filter_by(expense_id=expense.id).delete()

        split_amount = float(expense.amount) / len(split_among)
        for user_id in split_among:
            split = ExpenseSplit(
                expense_id=expense.id,
                user_id=user_id,
                amount=split_amount
            )
            db.session.add(split)

    db.session.commit()

    return jsonify({
        'message': 'Expense updated successfully',
        'expense': expense.to_dict(include_splits=True)
    }), 200


@bp.route('/trips/<int:trip_id>/expenses/<int:expense_id>', methods=['DELETE'])
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


@bp.route('/trips/<int:trip_id>/budget', methods=['GET'])
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


@bp.route('/trips/<int:trip_id>/settlement', methods=['GET'])
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


@bp.route('/trips/<int:trip_id>/expenses/by-date', methods=['GET'])
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


@bp.route('/trips/<int:trip_id>/budget/by-date', methods=['GET'])
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
