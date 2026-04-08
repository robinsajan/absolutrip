import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
}

url = "https://www.booking.com/hotel/in/ama-stays-and-trails.html?aid=304142&dest_id=-2092174&dest_type=city&group_adults=2&group_children=0&label=gen173nr-10CAEoggI46AdIM1gEaGyIAQGYATO4ARfIAQzYAQPoAQH4AQGIAgGoAgG4As_T2c4GwAIB0gIkZGI5ZTVmZTktODQyOS00ZmJlLWExZTktZWI4NDZmMWZkNmVl2AIB4AIB-Share-u1p6qdd%401775659692&no_rooms=1&req_adults=2&req_children=0"

result = {
    'image_url': None,
    'link_title': None,
    'link_description': None
}

try:
    response = requests.get(url, headers=HEADERS, timeout=15)
    print(f"Status Code: {response.status_code}")
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # ... scraper logic ...
    
    # Fallback Title from URL
    if not result['link_title'] and url:
        path = urlparse(url).path
        if path:
            # Clean up path: remove .html, split by /, filter out empty and generic terms
            clean_path = path.replace('.html', '').strip('/')
            parts = [p for p in clean_path.split('/') if p and p.lower() not in ('hotel', 'in', 'en', 'share', 'rooms')]
            if parts:
                slug = parts[-1]
                slug = slug.replace('-', ' ').replace('_', ' ').strip()
                if len(slug) > 3:
                    result['link_title'] = slug.title()

    print(f"Result: {result}")
    
except Exception as e:
    print(f"Error: {e}")
