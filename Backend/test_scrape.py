import requests
import time

# 🔑 Add your Unsplash API Key here
UNSPLASH_ACCESS_KEY = "YOUR_UNSPLASH_ACCESS_KEY"

# 🌍 Fetch places from Overpass API
def fetch_places(lat, lon, radius=3000, amenity="restaurant"):
    overpass_url = "https://overpass-api.de/api/interpreter"

    query = f"""
    [out:json];
    node
      ["amenity"="{amenity}"]
      (around:{radius},{lat},{lon});
    out;
    """

    response = requests.post(overpass_url, data=query)
    data = response.json()

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
    data = response.json()

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