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

try:
    buckets = supabase.storage.list_buckets()
    print("Buckets found in Supabase:")
    for b in buckets:
        print(f"- {b.name} (Public: {b.public})")
except Exception as e:
    print(f"Error listing buckets: {str(e)}")
