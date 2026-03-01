# TripSync

A collaborative trip-planning REST API built with Python Flask.

## Features

- User authentication with session-based login
- Trip creation and management with invite links
- Stay/activity options with collaborative voting
- Expense tracking and settlement calculations

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Initialize the database:
   ```bash
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```

5. Run the development server:
   ```bash
   python run.py
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login and create session
- `POST /api/auth/logout` - Destroy session
- `GET /api/auth/me` - Get current user info

### Trips
- `POST /api/trips` - Create new trip
- `GET /api/trips` - List user's trips
- `GET /api/trips/<id>` - Get trip details
- `PUT /api/trips/<id>` - Update trip metadata
- `DELETE /api/trips/<id>` - Delete trip (owner only)
- `POST /api/trips/join/<invite_code>` - Join trip via invite link
- `GET /api/trips/<id>/members` - List trip members

### Options
- `POST /api/trips/<id>/options` - Add new option
- `GET /api/trips/<id>/options` - List options
- `PUT /api/options/<id>` - Update option
- `DELETE /api/options/<id>` - Remove option

### Voting
- `POST /api/options/<id>/vote` - Cast/update vote
- `GET /api/trips/<id>/options/ranked` - Get options ranked by votes

### Expenses
- `POST /api/trips/<id>/expenses` - Record expense
- `GET /api/trips/<id>/expenses` - List all expenses
- `GET /api/trips/<id>/budget` - Get budget summary
- `GET /api/trips/<id>/settlement` - Get "who owes whom"

## License

MIT
