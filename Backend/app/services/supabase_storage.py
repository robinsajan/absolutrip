import os
import uuid
from supabase import create_client, Client
from flask import current_app

class SupabaseStorage:
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_KEY")
            
            if not url or not key:
                print("Supabase Storage Error: SUPABASE_URL or SUPABASE_KEY missing in .env")
                return None
                
            if "your_supabase" in key:
                print("Supabase Storage Warning: Using placeholder SUPABASE_KEY. Please update your .env file with your actual service_role key.")
                return None
                
            try:
                print(f"Connecting to Supabase Storage at {url}...")
                cls._client = create_client(url, key)
                print("Supabase Client initialized successfully.")
            except Exception as e:
                print(f"Supabase Client Error: {str(e)}")
                return None
        return cls._client

    @classmethod
    def upload_file(cls, file, folder="options"):
        client = cls.get_client()
        if not client:
            print("Supabase Storage: Upload skipped - Client not initialized.")
            return None

        bucket_name = os.environ.get("SUPABASE_BUCKET", "trip-images")
        
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
        filename = f"{folder}/{uuid.uuid4().hex}.{ext}"
        
        try:
            print(f"Uploading file '{file.filename}' to Supabase bucket '{bucket_name}' as '{filename}'...")
            file_content = file.read()
            file.seek(0)
            
            client.storage.from_(bucket_name).upload(
                path=filename,
                file=file_content,
                file_options={"content-type": file.content_type or "image/jpeg"}
            )
            
            res = client.storage.from_(bucket_name).get_public_url(filename)
            print(f"Upload successful. Public URL: {res}")
            return {
                "filename": filename,
                "url": res
            }
        except Exception as e:
            print(f"Supabase Upload Error: {str(e)}")
            return None

    @classmethod
    def get_signed_url(cls, filename, expires_in=60):
        client = cls.get_client()
        if not client:
            return None

        bucket_name = os.environ.get("SUPABASE_BUCKET", "trip-images")
        try:
            # res is usually a dict like {'signedURL': '...', ...} or just the URL string depending on version
            res = client.storage.from_(bucket_name).create_signed_url(filename, expires_in)
            if isinstance(res, dict) and "signedURL" in res:
                return res["signedURL"]
            return res
        except Exception as e:
            print(f"Supabase Signed URL Error: {str(e)}")
            return None

    @classmethod
    def get_file(cls, filename):
        client = cls.get_client()
        if not client:
            return None

        bucket_name = os.environ.get("SUPABASE_BUCKET", "trip-images")
        try:
            return client.storage.from_(bucket_name).download(filename)
        except Exception as e:
            print(f"Supabase Download Error: {str(e)}")
            return None

    @classmethod
    def delete_file(cls, filename):
        client = cls.get_client()
        if not client:
            return False

        bucket_name = os.environ.get("SUPABASE_BUCKET", "trip-images")
        try:
            client.storage.from_(bucket_name).remove([filename])
            return True
        except Exception as e:
            print(f"Supabase Delete Error: {str(e)}")
            return False
