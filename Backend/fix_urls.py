from app import create_app
from app.extensions import db
from app.models import StayOption

def fix_urls():
    app = create_app()
    with app.app_context():
        options = StayOption.query.filter(StayOption.image_url.like('/api/api%')).all()
        for opt in options:
            if opt.image_url:
                opt.image_url = opt.image_url.replace('/api/api', '/api')
        
        # Also fix the ones that have /api at the start but should just be relative to /api
        # Actually, if new_url is "/uploads/..." and frontend does base_url ("/api") + new_url, 
        # then total is "/api/uploads/...".
        # If DB already has "/api/uploads/...", frontend gives "/api/api/uploads/...".
        
        all_options = StayOption.query.all()
        count = 0
        for opt in all_options:
            if opt.image_url and opt.image_url.startswith('/api'):
                # Strip the /api prefix so it's ready for the frontend's mapping
                opt.image_url = opt.image_url[4:]
                count += 1
        
        db.session.commit()
        print(f"Fixed {count} image URLs.")

if __name__ == "__main__":
    fix_urls()
