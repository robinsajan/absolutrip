import requests
import time

# 🔑 Add your Unsplash API Key here
UNSPLASH_ACCESS_KEY = "3hh8QM24kPfF1cr-JMYW-sOy9zSyIAirNemem8Uukyo"

# 🌍 Fetch places from Overpass API
def fetch_places(lat, lon, radius=3000, amenity="restaurant"):
    query = f'[out:json];node["amenity"="{amenity}"](around:{radius},{lat},{lon});out;'

    # Try multiple Overpass endpoints in case one is down or rate-limiting
    endpoints = [
        "http://overpass-api.de/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://z.overpass-api.de/api/interpreter"
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    data = None
    for overpass_url in endpoints:
        try:
            response = requests.post(
                overpass_url, 
                data={'data': query}, 
                headers={
                    "User-Agent": "Mozilla/5.0",
                    "Referer": "https://overpass-turbo.eu/"
                }, 
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                break
        except Exception:
            continue

    if not data:
        return []

    places = []
    for element in data.get("elements", []):
        name = element.get("tags", {}).get("name")
        if name:
            places.append({
                "name": name,
                "lat": element.get("lat"),
                "lon": element.get("lon")
            })

    return places


# 📸 Fetch image from Unsplash
def fetch_image(query):
    url = "https://api.unsplash.com/search/photos"

    params = {
        "query": query,
        "client_id": UNSPLASH_ACCESS_KEY,
        "per_page": 1
    }

    response = requests.get(url, params=params)
    
    if response.status_code != 200:
        print(f"Error: Unsplash API returned status {response.status_code}")
        return None

    try:
        data = response.json()
    except requests.exceptions.JSONDecodeError:
        print("Error: Unsplash API returned invalid JSON.")
        return None

    results = data.get("results")
    if results:
        return results[0]["urls"]["regular"]

    return None


# 🔗 Combine places + images
def get_places_with_images(lat, lon):
    places = fetch_places(lat, lon)

    final_data = []

    for place in places[:10]:  # limit to 10 to avoid API overuse
        image = fetch_image(place["name"])

        final_data.append({
            "name": place["name"],
            "location": {
                "lat": place["lat"],
                "lon": place["lon"]
            },
            "image": image
        })

        time.sleep(0.5)  # avoid rate limits

    return final_data


# 🚀 Run Example (Navi Mumbai coords)
if __name__ == "__main__":
    LAT = 19.0330
    LON = 73.0297

    results = get_places_with_images(LAT, LON)

    for place in results:
        print("\n📍", place["name"])
        print("🖼️", place["image"])