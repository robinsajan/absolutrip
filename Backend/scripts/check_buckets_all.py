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

buckets_to_check = ["trip-images", "documents", "receipts"]

for bucket_name in buckets_to_check:
    try:
        buckets = supabase.storage.list_buckets()
        exists = any(b.name == bucket_name for b in buckets)
        
        if not exists:
            print(f"Bucket '{bucket_name}' not found. Creating...")
            supabase.storage.create_bucket(bucket_name, options={"public": True})
            print(f"Bucket '{bucket_name}' created.")
        else:
            print(f"Bucket '{bucket_name}' exists.")
            supabase.storage.update_bucket(bucket_name, options={"public": True})
    except Exception as e:
        print(f"Error checking bucket {bucket_name}: {str(e)}")
