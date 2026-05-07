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

buckets_to_delete = ["trip-images", "documents", "receipts"]

for bucket_name in buckets_to_delete:
    try:
        supabase.storage.delete_bucket(bucket_name)
        print(f"Deleted bucket '{bucket_name}'")
    except Exception as e:
        print(f"Could not delete '{bucket_name}': {str(e)}")
