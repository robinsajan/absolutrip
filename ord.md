# Product Requirements Document (PRD)

# Trip Explore Page -- Calendar Planner

## 1. Overview

The **Explore Page** (`/trip/[tripId]/explore`) is a **shared trip
planning calendar** where trip members can add, view, and edit
activities, stays, and plans for the trip.

The main goal is to help the group:

-   See the **entire trip timeline clearly**
-   **Avoid scheduling conflicts**
-   **Collaboratively plan the itinerary**
-   Quickly edit or update plans

The page will use a **team-style calendar view** similar to Google
Calendar but simplified for trip planning.

------------------------------------------------------------------------

## 2. Target Users

### Trip Members

Members can:

-   View the shared calendar
-   Add activities or plans
-   Edit their entries
-   See conflicts with other plans

### Trip Owner

The owner can:

-   Do everything members can
-   Edit or delete any entry
-   Finalize important plans if needed

------------------------------------------------------------------------

## 3. Core Concept

Everything is planned on a **shared trip calendar**.

Each entry represents something planned during the trip such as:

-   Stay / accommodation
-   Activity
-   Restaurant
-   Travel
-   Custom plan

Each entry includes:

-   Title
-   Category
-   Date and time
-   Cost (optional)
-   Link (optional)
-   Notes (optional)

------------------------------------------------------------------------

## 4. Key Features

### 4.1 Shared Trip Calendar

A **visual calendar** shows the full trip schedule.

Calendar Views:

-   **Day View**
-   **Trip Timeline View** (default)

Users can quickly see:

-   When activities happen
-   If multiple plans overlap
-   The overall trip structure

Example:

    Day 1
    ✓ Check-in Hotel
    ✓ Beach Visit
    ✓ Dinner

    Day 2
    ✓ Scuba Diving
    ✓ Sunset Point

------------------------------------------------------------------------

### 4.2 Add Plan (Quick Add)

Users can easily add a plan.

Fields:

-   Title
-   Category
    -   Stay\
    -   Activity\
    -   Food\
    -   Travel\
    -   Other
-   Date / Time
-   Cost (optional)
-   Link (optional)
-   Notes

Once added, it appears immediately in the calendar.

------------------------------------------------------------------------

### 4.3 Edit Plan

Plans must be **very easy to edit**.

Users can:

-   Click a calendar item
-   Open the edit panel
-   Change any field

Members can edit their own entries.

Trip owners can edit **all entries**.

------------------------------------------------------------------------

### 4.4 Conflict Detection

If two activities overlap, the system shows a **conflict warning**.

Example:

    ⚠ Conflict detected
    This overlaps with:
    • Scuba Diving (10:00 – 12:00)

The user can still save if needed.

Conflicts are highlighted in the calendar.

------------------------------------------------------------------------

### 4.5 Magic Link Import (Optional)

Users can paste links from:

-   Airbnb
-   Booking.com
-   Google Maps
-   Restaurant links

The system extracts:

-   Title
-   Image
-   Description

These details auto-fill the **Add Plan form**.

------------------------------------------------------------------------

### 4.6 Simple Cost Tracking (Optional)

Each plan can include a price.

The system can show:

    Estimated cost per person
    Estimated group total

This is optional and should not clutter the UI.

------------------------------------------------------------------------

## 5. User Flows

### Flow 1 --- Add a Plan

1.  User clicks **Add Plan**
2.  Enters details
3.  Saves

Result:

The plan appears in the calendar.

------------------------------------------------------------------------

### Flow 2 --- Edit a Plan

1.  User clicks an event
2.  Edit panel opens
3.  User changes details
4.  Saves

Calendar updates instantly.

------------------------------------------------------------------------

### Flow 3 --- Conflict Check

1.  User creates a new event
2.  System checks overlapping events
3.  If conflict exists:

```{=html}
<!-- -->
```
    ⚠ Time conflict detected

User can still save if they want.

------------------------------------------------------------------------

## 6. Technical Notes

### Frontend

-   Calendar component (timeline style)
-   Instant updates after editing
-   Simple modal for Add/Edit

### Backend

Main API endpoints:

    GET /trip/events
    POST /trip/events
    PUT /trip/events/:id
    DELETE /trip/events/:id

### Conflict Logic

Check if:

    new_event.start < existing_event.end
    AND
    new_event.end > existing_event.start

------------------------------------------------------------------------

## 7. Future Improvements

Possible upgrades later:

-   Voting on activities
-   Comment threads on plans
-   AI itinerary suggestions
-   Budget breakdown per category
-   Map view of all plans
-   Drag-and-drop calendar editing

------------------------------------------------------------------------

## Final Product Philosophy

The Explore page should be:

-   **Visual**
-   **Simple**
-   **Collaborative**
-   **Fast to edit**

Users should feel like they are using a **shared trip planning board**,
not filling complex forms.
