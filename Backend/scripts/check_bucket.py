import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Missing Supabase credentials")
    exit(1)

supabase = create_client(url, key)

bucket_name = "documents"

try:
    # Check if bucket exists
    buckets = supabase.storage.list_buckets()
    exists = any(b.name == bucket_name for b in buckets)
    
    if not exists:
        print(f"Bucket '{bucket_name}' not found. Attempting to create it...")
        supabase.storage.create_bucket(bucket_name, options={"public": True})
        print(f"Bucket '{bucket_name}' created successfully (public).")
    else:
        print(f"Bucket '{bucket_name}' already exists.")
        # Ensure it's public if it exists
        supabase.storage.update_bucket(bucket_name, options={"public": True})
        print(f"Bucket '{bucket_name}' updated to be public.")

except Exception as e:
    print(f"Error: {str(e)}")
