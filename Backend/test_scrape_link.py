import requests

ACCESS_KEY = "YOUR_ACCESS_KEY"

url = "https://api.unsplash.com/search/photos"
params = {
    "query": "GOA",
    "per_page": 1
}

headers = {
    "Authorization": f"Client-ID 3hh8QM24kPfF1cr-JMYW-sOy9zSyIAirNemem8Uukyo"
}

response = requests.get(url, headers=headers, params=params)

if response.status_code == 200:
    data = response.json()
    
    for img in data["results"]:
        print("Image URL:", img["urls"]["regular"])
        print("Photographer:", img["user"]["name"])
        print("-" * 40)
else:
    print("Error:", response.status_code, response.text)