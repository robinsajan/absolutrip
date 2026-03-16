import resend
import os

def send_verification_email(to_email, token):
    resend.api_key = os.environ.get('RESEND_API_KEY')
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    sender_email = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

    verify_link = f"{frontend_url}/verify?token={token}"
    body = f"Please click the link to verify your account: {verify_link}"

    # Fallback to mock if no API key is set
    if not resend.api_key:
        print(f"--- MOCK EMAIL (No RESEND_API_KEY) ---")
        print(f"To: {to_email}")
        print(f"Subject: Verify your Account")
        print(f"Body: {body}")
        print(f"------------------")
        return True

    try:
        print(f"Attempting to send verification email to {to_email} via Resend...")
        params = {
            "from": f"absoluTrip <{sender_email}>",
            "to": [to_email],
            "subject": "Verify your Account",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 10px;">
                <h1 style="color: #333; text-align: center;">Welcome to absoluTrip!</h1>
                <p style="font-size: 16px; color: #666; line-height: 1.5;">
                    Thanks for signing up. Please verify your email address to get started on your next adventure.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verify_link}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Verify Account
                    </a>
                </div>
                <p style="font-size: 12px; color: #999; text-align: center;">
                    If you didn't create an account, you can safely ignore this email.
                </p>
            </div>
            """
        }

        resend.Emails.send(params)
        print(f"SUCCESS: Email sent perfectly to {to_email} via Resend!")
        return True
    except Exception as e:
        print(f"ERROR: Failed to send email to {to_email}. Reason: {str(e)}")
        return False

def send_password_reset_email(to_email, token):
    resend.api_key = os.environ.get('RESEND_API_KEY')
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    sender_email = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

    reset_link = f"{frontend_url}/reset-password?token={token}"

    if not resend.api_key:
        print(f"--- MOCK EMAIL (No RESEND_API_KEY) ---")
        print(f"To: {to_email}")
        print(f"Subject: Reset your Password")
        print(f"Body: Please click the link to reset your password: {reset_link}")
        print(f"------------------")
        return True

    try:
        print(f"Attempting to send password reset email to {to_email} via Resend...")
        params = {
            "from": f"absoluTrip <{sender_email}>",
            "to": [to_email],
            "subject": "Reset your Password",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h1 style="color: #333; text-align: center;">Reset your Password</h1>
                <p style="font-size: 16px; color: #666; line-height: 1.5;">
                    We received a request to reset your password for your absoluTrip account. 
                    Click the button below to choose a new password.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="font-size: 14px; color: #666;">
                    If you did not request a password reset, you can safely ignore this email. 
                    The link will expire in 1 hour.
                </p>
                <div style="margin-top: 30px; border-top: 1px solid #eee; pt: 20px;">
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        © {os.environ.get('CURRENT_YEAR', '2026')} absoluTrip
                    </p>
                </div>
            </div>
            """
        }

        resend.Emails.send(params)
        print(f"SUCCESS: Reset email sent perfectly to {to_email} via Resend!")
        return True
    except Exception as e:
        print(f"ERROR: Failed to send reset email to {to_email}. Reason: {str(e)}")
        return False
