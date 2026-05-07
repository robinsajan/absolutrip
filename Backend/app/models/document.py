from datetime import datetime, date
from ..extensions import db

class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    # Support multiple files (comma-separated)
    file_path = db.Column(db.Text, nullable=False)
    file_url = db.Column(db.Text, nullable=False)
    file_type = db.Column(db.String(500), nullable=True) # comma-separated types
    file_size = db.Column(db.Integer, nullable=True) # total size or first file size
    tags = db.Column(db.String(500), nullable=True) # comma-separated tags
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    trip = db.relationship('Trip', backref=db.backref('documents', lazy=True))
    user = db.relationship('User', backref=db.backref('documents', lazy=True))

    def to_dict(self):
        paths = self.file_path.split(',') if self.file_path else []
        urls = self.file_url.split(',') if self.file_url else []
        types = self.file_type.split(',') if self.file_type else []

        files = []
        for i in range(len(paths)):
            files.append({
                'path': paths[i],
                'url': urls[i],
                'type': types[i] if i < len(types) else 'application/octet-stream'
            })

        return {
            'id': self.id,
            'trip_id': self.trip_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'Unknown',
            'title': self.title,
            'files': files,
            'tags': [t.strip() for t in self.tags.split(',')] if self.tags else [],
            'created_at': self.created_at.isoformat()
        }
