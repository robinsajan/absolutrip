from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
from ..extensions import db
from ..models import Trip, StayOption, TripMember, BudgetPlan
from ..utils.decorators import trip_member_required

bp = Blueprint('budget', __name__, url_prefix='/api/budget')

@bp.route('/planner/ai', methods=['POST'])
def ai_trip_planner():
    """
    Intelligent AI Trip Planner.
    1. Prioritizes staying at properties to cover the full trip duration.
    2. Uses extra budget to add activities.
    3. Finds the plan (Stay Combo + Activity Set) closest to the user's budget.
    """
    data = request.get_json()
    trip_id        = data.get('trip_id')
    start_date_str = data.get('start_date')
    end_date_str   = data.get('end_date')
    travelers      = int(data.get('travelers', 1))
    budget         = float(data.get('ai_budget') or data.get('budget') or 0)

    if not start_date_str or not end_date_str:
        return jsonify({'error': 'Dates are required'}), 400

    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    end_date   = datetime.strptime(end_date_str,   '%Y-%m-%d').date()
    total_days = (end_date - start_date).days

    if total_days <= 0:
        return jsonify({'error': 'Trip must be at least 1 day'}), 400

    # â”€â”€ 1. Fetch trip-specific options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # ONLY use options specifically added to this trip's comparison hub.
    options = []
    if trip_id:
        options = StayOption.query.filter_by(trip_id=trip_id).all()

    if not options:
        return jsonify({'error': 'No options found in your comparison hub to build a plan.'}), 404

    stays = [o for o in options if o.category == 'stay']
    activities = [o for o in options if o.category == 'activity']

    if not stays:
        return jsonify({'error': 'No stay options found to cover the trip.'}), 404

    # â”€â”€ 2. Find all combinations of stays that cover the trip duration â”€â”€â”€â”€â”€â”€
    def get_stay_cost_pp(stay):
        if stay.price_per_day_pp: return float(stay.price_per_day_pp) * (stay.duration_days or 1)
        if stay.price: return (float(stay.price) / travelers) * (stay.duration_days or 1)
        return 0.0

    def get_act_cost_pp(act):
        if act.price_per_day_pp: return float(act.price_per_day_pp)
        if act.price: return float(act.price) / travelers
        return 0.0

    def find_all_coverages(candidates, remaining, current_path):
        if remaining == 0:
            return [list(current_path)]
        results = []
        for s in candidates:
            dur = s.duration_days or 1
            if dur <= remaining:
                current_path.append(s)
                results.extend(find_all_coverages(candidates, remaining - dur, current_path))
                current_path.pop()
        return results

    stay_combos = find_all_coverages(stays, total_days, [])
    # Deduplicate stay combos by sorted ID list
    deduped_combos = {}
    for combo in stay_combos:
        key = tuple(sorted(s.id for s in combo))
        if key not in deduped_combos:
            deduped_combos[key] = combo

    # â”€â”€ 3. For each stay combo, find the best subset of activities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    all_potential_plans = []

    for key, combo in deduped_combos.items():
        base_cost_pp = sum(get_stay_cost_pp(s) for s in combo)
        base_cost_total = base_cost_pp * travelers
        
        # We find activity subsets that make total cost closest to budget.
        # Since we want "every solution", we can try simple greedy or small enumeration.
        # For simplicity and "build a real plan", we'll pick as many activities as fit
        # if base_cost < budget, or pick the best one if we are already over.
        
        current_acts = []
        current_acts_cost_total = 0.0
        
        if activities:
            # Sort activities by price to be systematic
            sorted_acts = sorted(activities, key=lambda a: get_act_cost_pp(a))
            
            # Simple approach: Find a subset of activities that makes total closest to budget.
            # We use a helper to find the best subset sum.
            def find_best_act_subset(acts, target_delta):
                best_subset = []
                best_sum = 0.0
                best_diff = abs(target_delta)
                
                # Small enumeration (up to 2^10 subsets) or greedy
                # Let's do a greedy fill but also check single high-priced one
                
                # Option A: Greedy fill
                temp_subset = []
                temp_sum = 0.0
                for a in acts:
                    cost = get_act_cost_pp(a) * travelers
                    if temp_sum + cost <= target_delta + 1000: # allow slight overage
                        temp_subset.append(a)
                        temp_sum += cost
                
                best_subset = temp_subset
                best_sum = temp_sum
                
                # Option B: Any single activity that is closer
                for a in acts:
                    cost = get_act_cost_pp(a) * travelers
                    if abs(cost - target_delta) < abs(best_sum - target_delta):
                        best_subset = [a]
                        best_sum = cost
                
                return best_subset, best_sum

            remaining_budget = budget - base_cost_total
            chosen_acts, acts_total = find_best_act_subset(sorted_acts, remaining_budget)
            current_acts = chosen_acts
            current_acts_cost_total = acts_total

        total_plan_cost = base_cost_total + current_acts_cost_total
        
        all_potential_plans.append({
            'stays': [s.to_dict() for s in combo],
            'activities': [a.to_dict() for a in current_acts],
            'total_cost': round(total_plan_cost, 2),
            'per_person': round(total_plan_cost / travelers, 2),
            'distance': abs(total_plan_cost - budget)
        })

    # â”€â”€ 4. Return top 2 plans closest to budget â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if not all_potential_plans:
        return jsonify({'error': 'Could not generate any valid trip plans.'}), 404

    all_potential_plans.sort(key=lambda p: p['distance'])
    
    # Take top 2 and remove distance key
    results = {}
    if len(all_potential_plans) >= 1:
        p1 = all_potential_plans[0]
        p1.pop('distance')
        results['closest_match'] = p1
    if len(all_potential_plans) >= 2:
        p2 = all_potential_plans[1]
        p2.pop('distance')
        results['runner_up'] = p2

    return jsonify(results), 200

@bp.route('/options', methods=['GET'])
def get_global_options():
    """Get global stays/activities for planning."""
    destination = request.args.get('destination')
    category = request.args.get('category') # 'stay' or 'activity'
    
    query = StayOption.query.filter_by(is_global=True)
    if destination:
        query = query.filter_by(destination=destination)
    if category:
        query = query.filter_by(category=category)
        
    options = query.all()
    return jsonify({'options': [o.to_dict() for o in options]}), 200

@bp.route('/promote/<trip_id>', methods=['POST'])
@trip_member_required
def promote_trip(trip_id, trip, membership):
    """Promote a trip to the explore page."""
    if membership.role != 'owner':
        return jsonify({'error': 'Only trip owner can promote'}), 403
    
    trip.is_promoted = True
    db.session.commit()
    
    return jsonify({'message': 'Trip promoted successfully', 'trip': trip.to_dict()}), 200

@bp.route('/explore', methods=['GET'])
def list_promoted_trips():
    """List all promoted trips for the explore page."""
    trips = Trip.query.filter_by(is_promoted=True).all()
    return jsonify({'trips': [t.to_dict(include_members=True) for t in trips]}), 200


@bp.route('/plans/<trip_id>', methods=['GET'])
@trip_member_required
def get_budget_plans(trip_id, trip, membership):
    """Get saved budget plans for the current user for a specific trip."""
    plans = BudgetPlan.query.filter_by(
        trip_id=trip_id, 
        user_id=current_user.id
    ).order_by(BudgetPlan.updated_at.desc()).all()
    return jsonify({'plans': [p.to_dict() for p in plans]}), 200


@bp.route('/plans/<trip_id>', methods=['POST', 'OPTIONS'])
@trip_member_required
def save_budget_plan(trip_id, trip, membership):
    """Save the current budget scenario as a plan."""
    data = request.get_json()
    if not data or 'selections' not in data:
        return jsonify({'error': 'Missing selections data'}), 400

    plan_name = data.get('name', 'My Budget Plan')
    
    processed_selections = data.get('selections', [])
    
    # Check if a plan with this name already exists for this user/trip
    plan = BudgetPlan.query.filter_by(trip_id=trip_id, user_id=current_user.id, name=plan_name).first()
    
    if plan:
        plan.selections = processed_selections
        plan.updated_at = datetime.utcnow()
    else:
        plan = BudgetPlan(
            trip_id=trip_id,
            user_id=current_user.id,
            name=plan_name,
            selections=processed_selections
        )
        db.session.add(plan)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
        
    return jsonify({'message': 'Budget plan saved!', 'plan': plan.to_dict()}), 200

