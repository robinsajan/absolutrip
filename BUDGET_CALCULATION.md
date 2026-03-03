# Budget Calculation Logic - Absolutrip

This document explains how the trip budget and daily expenses are calculated within the platform. **Note: The UI prioritizes per-person costs to help each member plan their individual contribution.**

## 1. Core Components

The total budget is composed of two main parts:
- **Logged Expenses**: Actual items entered via the "Ledger" tab (Food, Transport, etc.).
- **Planned Stays**: Scenario-based stays selected in the "Overview" tab.

---

## 2. Stay Pricing Models

Stays can have up to four different pricing strategies depending on which toggles are selected:

### A. Total Price (No toggles)
- **Logic**: The entered price is the absolute total for the entire stay for everyone.
- **Formula**: `Final Price = Base Price`

### B. Per Person
- **Logic**: The price is for one individual and is multiplied by the number of approved trip members.
- **Formula**: `Final Price = Base Price × Member Count`

### C. Per Night
- **Logic**: The price is for one night and is multiplied by the stay duration.
- **Formula**: `Final Price = Base Price × Number of Nights`
- *Note: Stay duration is calculated as `Check-out Date - Check-in Date`. Minimum 1 night.*

### D. Per Person & Per Night
- **Logic**: The price is for one person for one night.
- **Formula**: `Final Price = Base Price × Member Count × Number of Nights`

---

## 3. Scenario Planning (Overview Tab)

The Scenario Planner allows you to "try out" different stays to see their impact on the total trip cost.

- **Scenario Total** = `Total Logged Expenses` + `Selected Stay Option Final Price`
- **Scenario Per Person** = `Scenario Total` ÷ `Member Count`

---

## 4. Daily Expense Summary

When a specific day is selected, the system provides a granular "Day Summary":

### Logged
- Sum of all ledger entries specifically dated for that day.

### Planned Stay (Daily)
- If the stay is **Per Night**: Shows the nightly rate (multiplied by per-person if applicable).
- If the stay is **Total Price**: Pro-rates the total stay price over the duration.
  - `Daily Cost = Total Stay Price ÷ Number of Nights`

### Day Total
- `Logged + Planned Stay (Daily)`

---

## 5. Implementation Details

- **Database**: Managed via `StayOption` model with `is_per_person` and `is_per_night` boolean flags.
- **Frontend Logic**: Centralized in `BudgetDashboard.tsx` via `calculateOptionPrice` and `calculateDailyPrice` helpers for consistency across charts and summaries.
