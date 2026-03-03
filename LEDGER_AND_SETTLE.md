# Ledger & Settlement Guide - TripSync

This guide explains how to track shared expenses and settle debts within your trip group using the "Ledger" and "Settle" features.

---

## 1. The Ledger (Recording Expenses)

The Ledger is where you log actual money spent during the trip.

### Adding an Expense
- **Amount**: The total cost of the item/service.
- **Category**: (Optional) Tag it as Food, Transport, Stay, etc., for better budget breakdown.
- **Paid By**: The person who physically paid the bill.
- **Split Among**: By default, expenses are split **equally among everyone**. However, you can select specific members if only some people shared the cost (e.g., a meal that only 3 out of 5 people attended).

### How Splitting Works
When you save an expense, the system automatically calculates each person's **Individual Share**:
`Share = Total Amount ÷ Number of Selected Members`

---

## 2. Understanding Your Balance (Settle Tab)

In the **Settle** tab, you’ll see a list of all members and their current financial status.

### The Calculation
Your balance is determined by the following formula:
**`Balance = Total Paid - Total Your Share`**

- **Positive Balance (Green)**: You are a **Creditor**. You have paid more than your share, and others owe you money.
- **Negative Balance (Red)**: You are a **Debtor**. You have paid less than your share, and you owe money to the group.
- **Zero Balance**: You are even!

---

## 3. The Settlement Plan

The "Settles" section provides a step-by-step plan for everyone to get back to zero.

### Smart Optimization
TripSync uses an optimization algorithm to **minimize the number of transactions**. 
Instead of tracking every single coffee or sandwich, the system looks at the final balances and tells you the most efficient way to pay each other back.

**Example:**
- Alice owes Bob $10.
- Bob owes Charlie $10.
- **TripSync Plan:** Alice pays Charlie $10 directly. 
*(Only 1 transaction instead of 2!)*

---

## 4. Frequently Asked Questions

#### Q: Does "Planned Stay" in the Overview affect settlements?
**No.** Stays in the Scenario Planner (Overview) are for **budgeting and comparison only**. They do not create actual debts. Only items logged in the **Ledger** affect who owes whom.

#### Q: What happens if I edit an expense?
The system instantly recalculates everyone's balances and generates a new, optimized settlement plan.

#### Q: How do I mark a debt as paid?
Currently, when someone pays you back, you can "Settle" by deleting the corresponding expenses or adding a counter-expense, depending on your group's preference. (Future updates will include a one-click "Mark as Settled" feature!)
