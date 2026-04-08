import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import logging

logger = logging.getLogger(__name__)


class LinkScraperService:
    TIMEOUT = 15
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    }

    @staticmethod
    def scrape_link(url):
        """
        Scrape Open Graph metadata from a URL.
        Returns dict with image_url, link_title, link_description.
        """
        if not url:
            return None

        try:
            parsed = urlparse(url)
            if not parsed.scheme:
                url = 'https://' + url
            
            base_url = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme else f"https://{parsed.netloc}"

            session = requests.Session()
            response = session.get(
                url,
                headers=LinkScraperService.HEADERS,
                timeout=LinkScraperService.TIMEOUT,
                allow_redirects=True,
                verify=True
            )
            response.raise_for_status()

            if response.status_code == 202:
                logger.warning(f"Got 202 for {url}, using fallback")
                return {
                    'image_url': None,
                    'link_title': LinkScraperService._extract_title_from_url(url),
                    'link_description': None
                }

            soup = BeautifulSoup(response.content, 'html.parser')

            result = {
                'image_url': None,
                'link_title': None,
                'link_description': None
            }

            og_image = soup.find('meta', property='og:image')
            itemprop_image = soup.find('meta', itemprop='image')
            if (og_image and og_image.get('content')) or (itemprop_image and itemprop_image.get('content')):
                img_url = (og_image['content'] if og_image else itemprop_image['content'])
                if img_url.startswith('//'):
                    img_url = 'https:' + img_url
                elif img_url.startswith('/'):
                    img_url = urljoin(base_url, img_url)
                result['image_url'] = img_url
            else:
                twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
                if twitter_image and twitter_image.get('content'):
                    img_url = twitter_image['content']
                    if img_url.startswith('//'):
                        img_url = 'https:' + img_url
                    elif img_url.startswith('/'):
                        img_url = urljoin(base_url, img_url)
                    result['image_url'] = img_url
                else:
                    first_img = soup.find('img', src=True)
                    if first_img:
                        img_url = first_img['src']
                        if img_url.startswith('//'):
                            img_url = 'https:' + img_url
                        elif img_url.startswith('/'):
                            img_url = urljoin(base_url, img_url)
                        elif not img_url.startswith('http'):
                            img_url = urljoin(url, img_url)
                        if not img_url.endswith(('.svg', '.gif')) and 'logo' not in img_url.lower():
                            result['image_url'] = img_url
                    
                    if not result['image_url']:
                        # Booking.com specific image search
                        bk_img = soup.find('img', class_='bh-photo-grid-item-link') or soup.find('img', class_='hotel_main_img')
                        if bk_img and bk_img.get('src'):
                             result['image_url'] = urljoin(base_url, bk_img['src']) if bk_img['src'].startswith('/') else bk_img['src']

            og_title = soup.find('meta', property='og:title')
            itemprop_name = soup.find('meta', itemprop='name')
            if (og_title and og_title.get('content')) or (itemprop_name and itemprop_name.get('content')):
                result['link_title'] = (og_title['content'] if og_title else itemprop_name['content'])
            else:
                twitter_title = soup.find('meta', attrs={'name': 'twitter:title'})
                if twitter_title and twitter_title.get('content'):
                    result['link_title'] = twitter_title['content']
                else:
                    title_tag = soup.find('title')
                    if title_tag:
                        result['link_title'] = title_tag.get_text(strip=True)
                
                if not result['link_title']:
                    # Booking.com specific title search
                    bk_title = soup.find('h2', class_='pp-header__title') or soup.find('h2', id='hp_hotel_name')
                    if bk_title:
                        result['link_title'] = bk_title.get_text(strip=True)

            og_desc = soup.find('meta', property='og:description')
            if og_desc and og_desc.get('content'):
                result['link_description'] = og_desc['content']
            else:
                twitter_desc = soup.find('meta', attrs={'name': 'twitter:description'})
                if twitter_desc and twitter_desc.get('content'):
                    result['link_description'] = twitter_desc['content']
                else:
                    meta_desc = soup.find('meta', attrs={'name': 'description'})
                    if meta_desc and meta_desc.get('content'):
                        result['link_description'] = meta_desc['content']
                    else:
                        first_p = soup.find('p')
                        if first_p:
                            text = first_p.get_text(strip=True)
                            if len(text) > 20:
                                result['link_description'] = text

            # Final fallbacks from URL only if title is still missing
            if not result['link_title'] and url:
                fallback = LinkScraperService._extract_title_from_url(url)
                if fallback:
                    result['link_title'] = fallback

            if result['link_title'] and len(result['link_title']) > 300:
                result['link_title'] = result['link_title'][:297] + '...'

            if result['link_description'] and len(result['link_description']) > 500:
                result['link_description'] = result['link_description'][:497] + '...'

            logger.info(f"Successfully scraped {url}: title={result['link_title'][:50] if result['link_title'] else None}")
            return result

        except requests.Timeout:
            logger.warning(f"Timeout scraping {url}")
            return None
        except requests.RequestException as e:
            logger.warning(f"Request error scraping {url}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error scraping {url}: {str(e)}")
            return None

    @staticmethod
    def scrape_and_update_option(option):
        """
        Scrape metadata from option's link and update the option object.
        Returns True if successful, False otherwise.
        """
        if not option.link:
            return False

        metadata = LinkScraperService.scrape_link(option.link)
        if not metadata:
            return False

        if metadata.get('image_url') and not option.image_path:
            option.image_url = metadata['image_url']

        if metadata.get('link_title') and not option.link_title:
            option.link_title = metadata['link_title']

        if metadata.get('link_description') and not option.link_description:
            option.link_description = metadata['link_description']

        return True
