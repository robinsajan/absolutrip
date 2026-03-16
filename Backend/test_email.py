import os
from dotenv import load_dotenv

# Load variables from .env explicitly
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

print("Loaded Environment Variables:")
resend_key = os.environ.get('RESEND_API_KEY')
print(f"RESEND_API_KEY: {'SET' if resend_key else 'NOT SET'}")
print(f"SENDER_EMAIL: {os.environ.get('SENDER_EMAIL')}")
print(f"FRONTEND_URL: {os.environ.get('FRONTEND_URL')}")
print("-" * 30)

from app.utils.email import send_verification_email

print("Starting to run test email...")
success = send_verification_email("jasonkalathingal@gmail.com", "fake-token-1234")
print(f"Result: {success}")
