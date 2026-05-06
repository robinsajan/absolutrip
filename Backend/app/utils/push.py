import os
import logging
import firebase_admin
from firebase_admin import credentials, messaging
from flask import current_app

logger = logging.getLogger(__name__)

def init_firebase(app):
    """Initialize Firebase Admin SDK."""
    # Support both a file path or the raw JSON content in the environment variable
    service_account_info = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
    
    try:
        if service_account_info:
            if service_account_info.strip().startswith('{'):
                # It's a JSON string
                import json
                cred_dict = json.loads(service_account_info)
                cred = credentials.Certificate(cred_dict)
            else:
                # It's a path to a file
                cred = credentials.Certificate(service_account_info)
            
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized from environment variable.")
            return

        # Fallback to local file
        service_account_path = os.path.join(app.root_path, 'firebase-service-account.json')
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized from local file.")
        else:
            logger.warning("Firebase service account not found. Push notifications disabled.")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")

def send_push_notification(user, title, body, data=None):
    """Send a push notification to a specific user via FCM."""
    if not user.fcm_token:
        return False

    from datetime import datetime
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=user.fcm_token,
            # High priority for Android/Mobile
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    default_sound=True,
                    priority='max' # Corrected parameter name
                ),
            ),
            # High priority for Web browsers
            webpush=messaging.WebpushConfig(
                headers={
                    'Urgency': 'high'
                },
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                    icon='/icon-192x192.png',
                    badge='/icon-192x192.png',
                    require_interaction=True, # Keeps the notification open until user clicks
                    silent=False, # Explicitly request sound
                    timestamp_millis=int(datetime.now().timestamp() * 1000),
                    renotify=True
                )
            )
        )
        response = messaging.send(message)
        logger.info(f"Successfully sent push notification to user {user.id}: {response}")
        return True
    except Exception as e:
        logger.error(f"Error sending push notification to user {user.id}: {e}")
        # If the token is invalid, we might want to clear it
        if "registration-token-not-registered" in str(e).lower():
            try:
                from ..extensions import db
                user.fcm_token = None
                db.session.commit()
                logger.info(f"Cleared invalid FCM token for user {user.id}")
            except:
                pass
        return False
