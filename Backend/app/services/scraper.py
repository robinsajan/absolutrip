import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import logging

logger = logging.getLogger(__name__)


class LinkScraperService:
    TIMEOUT = 15
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
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

            soup = BeautifulSoup(response.content, 'html.parser')

            result = {
                'image_url': None,
                'link_title': None,
                'link_description': None
            }

            og_image = soup.find('meta', property='og:image')
            if og_image and og_image.get('content'):
                img_url = og_image['content']
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

            og_title = soup.find('meta', property='og:title')
            if og_title and og_title.get('content'):
                result['link_title'] = og_title['content']
            else:
                twitter_title = soup.find('meta', attrs={'name': 'twitter:title'})
                if twitter_title and twitter_title.get('content'):
                    result['link_title'] = twitter_title['content']
                else:
                    title_tag = soup.find('title')
                    if title_tag:
                        result['link_title'] = title_tag.get_text(strip=True)

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
