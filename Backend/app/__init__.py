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
         origins=[frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"],
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    Swagger(app, template=swagger_template, config=swagger_config)

    from .routes import auth, trips, options, votes, expenses
    app.register_blueprint(auth.bp)
    app.register_blueprint(trips.bp)
    app.register_blueprint(options.bp)
    app.register_blueprint(votes.bp)
    app.register_blueprint(expenses.bp)

    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}

    return app
