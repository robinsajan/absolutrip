# UI/UX Product Requirements Document (PRD): TripSync Frontend

**Project Name:** TripSync  
**Framework:** Next.js 14+ (App Router)  
**Design System:** Tailwind CSS + shadcn/ui  
**Target Platform:** Mobile-First Web (Responsive for Desktop)

---

## 1. Product Design Vision
The TripSync UI is designed to turn the "work" of planning a trip into a "social experience." The interface must be lightweight, travel-inspired, and optimized for high-speed interactions on mobile devices.

### Core Design Principles
* **Thumb-Zone Driven:** All primary actions (Add, Vote, Save) must be reachable with one hand on mobile.
* **Clarity over Density:** Avoid cluttered tables; use cards and clean lists to display complex travel data.
* **Immediate Feedback:** UI states should update instantly (Optimistic UI) when a user interacts with a feature.

---

## 2. Visual Identity & Theme
| Element | Specification |
| :--- | :--- |
| **Primary Color** | `#007AFF` (Action Blue) - Used for primary CTAs and links. |
| **Secondary Color** | `#FF9500` (Sunset Orange) - Used for highlighting "Top Rated" options. |
| **Success Color** | `#34C759` (Vibrant Green) - Used for "Settled" expenses. |
| **Background** | `#F9FAFB` (Off-White) - To provide a clean canvas for content. |
| **Radius** | `0.75rem` (12px) - Soft rounded corners for a modern mobile feel. |
| **Typography** | `Inter` or `Geist Sans` - High legibility on small screens. |

---

## 3. Navigation Architecture

### 3.1 Mobile Navigation (The Tab Bar)
A fixed bottom navigation bar containing:
* **Explore:** Discover and vote on stay/activity options.
* **Budget:** Real-time cost estimator and "what-if" planning.
* **Ledger:** Chronological feed of expenses.
* **Settle:** Debt summary and payment instructions.

### 3.2 Desktop Navigation
* A persistent **Sidebar** or **Top Header**.
* Utilize the extra screen real estate to show a "Summary Dashboard" on the right side while the user browses options on the left.

---

## 4. Screen-by-Screen Requirements

### 4.1 Authentication & Onboarding
* **Login/Signup:** Simple card-based UI with Social Login (Google) as the primary action.
* **Trip Creation:** A step-by-step wizard (Name -> Dates -> Invite).

### 4.2 Tab 1: Option Management (The "Explore" Feed)
* **Card Design:**
    * Header image (Fetched from link metadata).
    * Title, Price per night, and "Price per Person" calculation.
    * **The Vote Button:** A large heart icon that pulses when clicked.
* **Sorting UI:** A horizontal chip-selector (e.g., "Sort by: Top Voted | Lowest Price").

### 4.3 Tab 2: Dynamic Budget Estimator
* **Interactive Header:** A "Total Per Person" display that updates in real-time.
* **Scenario Planning:** Checkbox list of all "Stays." Users can check/uncheck different options to see how the per-person cost shifts instantly.
* **Expense Breakdown:** A clean list categorized by Stay, Food, and Transport.

### 4.4 Tab 3: Group Expense Ledger
* **The "+" FAB:** A Floating Action Button to "Quick Add" an expense.
* **Input Form:** A Bottom-Sheet modal with:
    * Big numeric keypad for amount.
    * "Paid by" avatar selector.
    * Category toggle (Food, Activity, Transport).
* **Activity Feed:** A list showing `[User] paid [Amount] for [Description]`.

### 4.5 Tab 4: Settlement (The "Payback" View)
* **Personalized Summary:** A banner at the top: *"Sarah, you owe a total of $145."*
* **The "Who to Pay" List:** Cards showing specific peer-to-peer debts (e.g., "Pay John $45").
* **Settle Button:** Triggers a popup with the recipient's payment details.

---

## 5. Mobile-First UX Enhancements
* **Web Share API:** Integrate the "Invite" button with the phone's native share sheet (WhatsApp, iMessage).
* **Pull-to-Refresh:** Standard gesture to sync the latest votes from the Flask backend.
* **Swipe Actions:** (Optional) Swipe left on an expense to delete or edit.
* **Haptic Simulation:** Use CSS/JS animations to provide tactile feedback on button presses.

---

## 6. Technical Requirements for Frontend
* **State Management:** Use `Zustand` for lightweight global state (managing the active trip data).
* **API Layer:** `Axios` or `Fetch` with `SWR` (Stale-While-Revalidate) to ensure data is always fresh without constant loaders.
* **Responsive Breakpoints:**
    * `sm`: 640px (Mobile)
    * `md`: 768px (Tablet)
    * `lg`: 1024px+ (Desktop Dashboard)

---

## 7. Success Metrics (UI/UX)
1.  **Time to Add Expense:** Goal < 5 seconds from app open.
2.  **Navigation Fluidity:** Zero layout shift (CLS) during tab switching.
3.  **Visual Clarity:** 100% of test users can identify the "Total Per Person" cost within 2 seconds of landing on the Budget tab.