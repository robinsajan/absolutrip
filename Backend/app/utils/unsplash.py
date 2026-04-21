import requests
import os

UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY")

def fetch_trip_image(query):
    """
    Fetch a representative image URL from Unsplash based on the query (trip name/destination).
    """
    url = "https://api.unsplash.com/search/photos"

    params = {
        "query": query,
        "client_id": UNSPLASH_ACCESS_KEY,
        "per_page": 1
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"Error: Unsplash API returned status {response.status_code}")
            return None

        data = response.json()
        results = data.get("results")
        if results:
            return results[0]["urls"]["regular"]
    except Exception as e:
        print(f"Exception while fetching image from Unsplash: {e}")
        return None

    return None
