import requests
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
}

url = "https://www.booking.com/hotel/in/ama-stays-and-trails.html" # A test URL

try:
    response = requests.get(url, headers=HEADERS, timeout=15)
    print(f"Status Code: {response.status_code}")
    soup = BeautifulSoup(response.content, 'html.parser')
    
    og_title = soup.find('meta', property='og:title')
    itemprop_name = soup.find('meta', itemprop='name')
    print(f"Title: {og_title['content'] if og_title else (itemprop_name['content'] if itemprop_name else 'Not found')}")
    
    og_image = soup.find('meta', property='og:image')
    itemprop_image = soup.find('meta', itemprop='image')
    print(f"Image: {og_image['content'] if og_image else (itemprop_image['content'] if itemprop_image else 'Not found')}")
    
except Exception as e:
    print(f"Error: {e}")
