# Product Requirements Document (PRD)

## Feature: Trip Budget Planner

Page: `/budget`

------------------------------------------------------------------------

# 1. Overview

The **Budget Planner** allows users to plan a trip by selecting stays
and activities while tracking their budget.

Users can either: 1. **Plan the trip manually** (day-wise planning). 2.
**Generate a trip using AI** based on a budget constraint.

Once a trip plan is finalized, users can **promote the trip**, making it
visible to other users on the **/explore page**.

------------------------------------------------------------------------

# 2. Goals

-   Simplify trip planning.
-   Allow users to plan **day-by-day itineraries**.
-   Enable **budget-based trip generation using AI**.
-   Encourage community sharing through **Explore page promotion**.

------------------------------------------------------------------------

# 3. User Modes

## Mode 1 --- Plan It Yourself

User manually builds their trip by selecting stays and activities.

### Flow

1.  User enters:

    -   Trip destination
    -   Trip dates
    -   Number of travelers
    -   Total budget (optional)

2.  The planner starts from **Day 1**.

3.  User selects a **stay option covering a date range**.

Example options:

Stay A\
Day 1 → Day 5

Stay B\
Day 1 → Day 3

4.  If the user selects **Day 1 → Day 3**, the system automatically
    moves planning to **Day 3**.

5.  The planner only shows stays that **start on the next unplanned
    day**.

Example:

Next step:\
Choose stay for Day 3 → Day 5

6.  User continues until **all trip days are planned**.

------------------------------------------------------------------------

# 4. Day-Wise Planning Logic

### Rule 1

Stay options must **start from the currently unplanned day**.

### Rule 2

The system must **not auto-fill the rest of the trip**.

Example:

Trip:\
Day 1 → Day 5

User selects:\
Day 1 → Day 3

System state:

Next planning day = Day 3

Options shown:

Day 3 → Day 5\
Day 3 → Day 4

------------------------------------------------------------------------

# 5. Budget Tracking

Top panel shows:

-   Total Budget
-   Used Budget
-   Remaining Budget
-   Per Person Cost

Example:

Budget: \$3000\
Used: \$450\
Remaining: \$2550\
Per Person: \$225

Budget updates **in real time** when user selects stays or activities.

------------------------------------------------------------------------

# 6. Trip Progress UI

Planner displays:

### Trip Summary

Example:

Your Trip So Far

Day 1 -- 3 Zostel Goa\
Day 4 -- 5 Coffee Estate Homestay

### Progress Indicator

Trip Progress\
Day 5 of 10 planned

------------------------------------------------------------------------

# 7. Stay Selection Interface

For each planning step:

Select Your Next Stay

Example:

Choose Stay for Day 6 → Day 8

Options displayed as cards:

Munnar Treehouse\
\$160 / night\
Total: \$480\
\[Add to Trip\]

Beachside Hostel\
\$90 / night\
Total: \$270\
\[Add to Trip\]

------------------------------------------------------------------------

# 8. Activities

Optional activity planning.

Example:

Add Activities

Kayaking -- \$40\
Scuba Diving -- \$120

Activities contribute to the total trip cost.

------------------------------------------------------------------------

# 9. AI Trip Planner Mode

User can choose:

Plan It Myself\
or\
Let AI Plan My Trip

### AI Planner Inputs

User provides:

-   Destination
-   Trip Dates
-   Budget
-   Number of Travelers
-   Preferences

Example preferences:

-   Beach
-   Nature
-   Luxury
-   Budget
-   Adventure

------------------------------------------------------------------------

# 10. AI Planning Logic

The AI planner uses a **budget optimization algorithm** similar to the
**knapsack problem**.

Goal:

Select stays + activities whose total price is closest to the user's
budget.

Possible results:

Best Match -- \$1480 per person\
Budget Friendly -- \$1320 per person\
Premium -- \$1600 per person

Users can:

-   Accept Trip
-   Edit Trip
-   Regenerate Plan

------------------------------------------------------------------------

# 11. Trip Timeline

Planner displays a **visual itinerary**.

Example:

Trip Timeline

Day 1 -- 3 Zostel Goa\
Day 4 -- 5 Coffee Estate\
Day 6 -- 8 Munnar Treehouse

------------------------------------------------------------------------

# 12. Promote Trip

Once the user finalizes the itinerary, they can **promote the trip**.

Button:

Promote Trip

------------------------------------------------------------------------

# 13. Promote Trip Behavior

When promoted, the trip becomes visible on the **/explore page**.

Displayed details include:

-   Destination
-   Trip Dates
-   Total Cost
-   Stays
-   Activities
-   Creator

Other users can:

-   View Trip
-   Copy Trip Plan
-   Join Trip

------------------------------------------------------------------------

# 14. Explore Page Integration

Promoted trips appear in `/explore`.

Displayed as trip cards:

Goa Budget Trip\
5 Days\
\$900 per person\
Created by Robin

------------------------------------------------------------------------

# 15. Data Model (Simplified)

### Trip

trip_id\
destination\
start_date\
end_date\
budget\
creator_id\
is_promoted

### Stay

stay_id\
name\
location\
price_per_night\
start_day\
end_day

### Activity

activity_id\
name\
price\
day

------------------------------------------------------------------------

# 16. Success Metrics

-   Trips Created
-   Trips Completed
-   Trips Promoted
-   Trips Copied from Explore

------------------------------------------------------------------------

# 17. Future Improvements

-   Budget slider for dynamic planning
-   Collaborative planning with friends
-   AI itinerary explanations
-   Cost comparison charts
-   Live price integrations
