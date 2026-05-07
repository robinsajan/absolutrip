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
                
            try:
                cls._client = create_client(url, key)
            except Exception as e:
                print(f"Supabase Client Error: {str(e)}")
                return None
        return cls._client

    @classmethod
    def upload_file(cls, file, folder="options", target_bucket=None):
        client = cls.get_client()
        if not client:
            return None

        # Use target_bucket, then SUPABASE_BUCKET, then DOCUMENT_BUCKET, then fallback to trip-images
        bucket_name = target_bucket or os.environ.get("SUPABASE_BUCKET") or os.environ.get("DOCUMENT_BUCKET") or "trip-images"
        print(f"Supabase Attempting upload to bucket: '{bucket_name}' for folder: '{folder}'")
        
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
        filename = f"{folder}/{uuid.uuid4().hex}.{ext}" if folder else f"{uuid.uuid4().hex}.{ext}"
        
        try:
            file.seek(0)
            file_content = file.read()
            file.seek(0)
            
            client.storage.from_(bucket_name).upload(
                path=filename,
                file=file_content,
                file_options={"content-type": file.content_type or "image/jpeg"}
            )
            
            res = client.storage.from_(bucket_name).get_public_url(filename)
            return {
                "filename": filename,
                "url": res
            }
        except Exception as e:
            print(f"Supabase Upload Error: {str(e)}")
            return None

    @classmethod
    def get_signed_url(cls, filename, expires_in=60, target_bucket=None):
        client = cls.get_client()
        if not client:
            return None

        bucket_name = target_bucket or os.environ.get("SUPABASE_BUCKET") or os.environ.get("DOCUMENT_BUCKET") or "trip-images"
        try:
            res = client.storage.from_(bucket_name).create_signed_url(filename, expires_in)
            if isinstance(res, dict) and "signedURL" in res:
                return res["signedURL"]
            return res
        except Exception as e:
            print(f"Supabase Signed URL Error: {str(e)}")
            return None

    @classmethod
    def get_file(cls, filename, target_bucket=None):
        client = cls.get_client()
        if not client:
            return None

        bucket_name = target_bucket or os.environ.get("SUPABASE_BUCKET") or os.environ.get("DOCUMENT_BUCKET") or "trip-images"
        try:
            return client.storage.from_(bucket_name).download(filename)
        except Exception as e:
            print(f"Supabase Download Error: {str(e)}")
            return None

    @classmethod
    def delete_file(cls, filename, target_bucket=None):
        client = cls.get_client()
        if not client:
            return False

        bucket_name = target_bucket or os.environ.get("SUPABASE_BUCKET") or os.environ.get("DOCUMENT_BUCKET") or "trip-images"
        try:
            client.storage.from_(bucket_name).remove([filename])
            return True
        except Exception as e:
            print(f"Supabase Delete Error: {str(e)}")
            return False
