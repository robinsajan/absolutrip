from app import create_app
from app.extensions import db
from app.models import StayOption
from decimal import Decimal

def seed():
    app = create_app()
    with app.app_context():
        # Clear existing global options to avoid duplicates
        StayOption.query.filter_by(is_global=True).delete()
        
        data = [
            # GOA
            {
                "title": "Zostel Goa (Panjim)",
                "destination": "Goa",
                "category": "stay",
                "price": 800,
                "duration_days": 3,
                "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80"
            },
            {
                "title": "W Goa - Luxury Resort",
                "destination": "Goa",
                "category": "stay",
                "price": 15000,
                "duration_days": 2,
                "image_url": "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800&q=80"
            },
            {
                "title": "Beachside Homestay",
                "destination": "Goa",
                "category": "stay",
                "price": 2500,
                "duration_days": 3,
                "image_url": "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80"
            },
            {
                "title": "Scuba Diving at Grande Island",
                "destination": "Goa",
                "category": "activity",
                "price": 3500,
                "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80"
            },
            {
                "title": "Old Goa Heritage Walk",
                "destination": "Goa",
                "category": "activity",
                "price": 500,
                "image_url": "https://images.unsplash.com/photo-1582972236019-ea4af5ea52ed?auto=format&fit=crop&w=800&q=80"
            },
            
            # MUNNAR
            {
                "title": "Munnar Treehouse Stay",
                "destination": "Munnar",
                "category": "stay",
                "price": 6000,
                "duration_days": 2,
                "image_url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80"
            },
            {
                "title": "Tea Garden Resort",
                "destination": "Munnar",
                "category": "stay",
                "price": 3500,
                "duration_days": 3,
                "image_url": "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=800&q=80"
            },
            {
                "title": "Tea Plantation Trek",
                "destination": "Munnar",
                "category": "activity",
                "price": 1200,
                "image_url": "https://images.unsplash.com/photo-1531145115204-63300863004b?auto=format&fit=crop&w=800&q=80"
            },
            
            # KYOTO
            {
                "title": "Traditional Ryokan Kyoto",
                "destination": "Kyoto",
                "category": "stay",
                "price": 12000,
                "duration_days": 2,
                "image_url": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80"
            },
            {
                "title": "Capsule Hotel Shijo",
                "destination": "Kyoto",
                "category": "stay",
                "price": 2500,
                "duration_days": 1,
                "image_url": "https://images.unsplash.com/photo-1506077751641-79282875ab93?auto=format&fit=crop&w=800&q=80"
            }
        ]
        
        for item in data:
            opt = StayOption(
                title=item["title"],
                destination=item["destination"],
                category=item["category"],
                price=Decimal(str(item["price"])),
                duration_days=item.get("duration_days"),
                image_url=item.get("image_url"),
                is_global=True
            )
            db.session.add(opt)
            
        db.session.commit()
        print(f"Seeded {len(data)} global options.")

if __name__ == "__main__":
    seed()
