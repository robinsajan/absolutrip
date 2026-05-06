import os
from flask import Flask
from flask_cors import CORS
from flasgger import Swagger
from dotenv import load_dotenv

# Load environment variables BEFORE importing local modules that use them
load_dotenv()

from .config import config
from .extensions import db, migrate, login_manager

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "TripSync API",
        "description": "A collaborative trip-planning REST API",
        "version": "1.0.0"
    },
    "securityDefinitions": {
        "cookieAuth": {
            "type": "apiKey",
            "in": "cookie",
            "name": "session"
        }
    },
    "tags": [
        {"name": "Auth", "description": "User authentication endpoints"},
        {"name": "Trips", "description": "Trip management endpoints"},
        {"name": "Options", "description": "Stay/activity options endpoints"},
        {"name": "Votes", "description": "Voting endpoints"},
        {"name": "Expenses", "description": "Expense tracking and settlement"}
    ]
}

swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec",
            "route": "/apispec.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/docs"
}


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    CORS(app, 
         supports_credentials=True,
         resources={r"/api/*": {
             "origins": ["http://localhost:3000", "http://127.0.0.1:3000", frontend_url],
             "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
         }})

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    
    from .utils.push import init_firebase
    init_firebase(app)
    # Swagger(app, template=swagger_template, config=swagger_config)

    from .routes import auth, trips, options, votes, expenses, budget, announcements, notifications, polls
    app.register_blueprint(polls.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(trips.bp)
    app.register_blueprint(options.bp)
    app.register_blueprint(votes.bp)
    app.register_blueprint(expenses.bp)
    app.register_blueprint(budget.bp)
    app.register_blueprint(announcements.bp)
    app.register_blueprint(notifications.notifications_bp, url_prefix='/api/notifications')

    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}

    @app.route('/')
    def index():
        return '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wrong Place Simon</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #0a0a0a;
            color: #fff;
            font-family: 'Courier New', monospace;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
        }
        .container {
            text-align: center;
            animation: fadeIn 1s ease-in;
        }
        .emoji { font-size: 5rem; animation: shake 0.5s infinite; }
        h1 {
            font-size: 2.5rem;
            color: #ff4444;
            margin: 1rem 0;
            text-transform: uppercase;
            letter-spacing: 4px;
        }
        p {
            font-size: 1.1rem;
            color: #aaa;
            margin: 0.5rem 0;
        }
        .warning {
            margin-top: 2rem;
            padding: 1rem 2rem;
            border: 1px solid #ff4444;
            color: #ff4444;
            font-size: 0.9rem;
            letter-spacing: 2px;
            animation: blink 1s infinite;
        }
        .go-back {
            margin-top: 2rem;
            display: inline-block;
            padding: 0.8rem 2rem;
            background: #ff4444;
            color: #fff;
            text-decoration: none;
            font-weight: bold;
            letter-spacing: 2px;
            cursor: pointer;
            border: none;
            font-family: 'Courier New', monospace;
            font-size: 1rem;
        }
        .go-back:hover { background: #cc0000; }
        @keyframes shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
        }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🚨</div>
        <h1>Wrong Place, Simon</h1>
        <p>You should NOT be here.</p>
        <p>Close the tab. Walk away. Pretend this never happened.</p>
        <div class="warning">⚠ UNAUTHORISED HUMAN DETECTED ⚠</div>
        <br/>
        <button class="go-back" onclick="history.back()">← GO BACK SIMON</button>
    </div>
</body>
</html>
''', 200

    return app
