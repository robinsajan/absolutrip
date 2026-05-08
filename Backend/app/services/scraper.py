import os
import json
import re
import asyncio
import logging
from urllib.parse import urlparse, urljoin
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# =========================
# CONFIG
# =========================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "llama-3.3-70b-versatile"

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

class LinkScraperService:
    @staticmethod
    def clean_html(html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")

        # Remove unwanted tags
        for tag in soup([
            "script",
            "style",
            "noscript",
            "svg",
            "footer",
            "header",
            "nav"
        ]):
            tag.decompose()

        text = soup.get_text(separator="\n")

        # Clean whitespace
        text = re.sub(r"\n+", "\n", text)
        text = re.sub(r"[ \t]+", " ", text)

        return text[:25000]  # limit tokens

    @staticmethod
    def extract_json_ld(html: str):
        soup = BeautifulSoup(html, "html.parser")
        scripts = soup.find_all("script", type="application/ld+json")
        json_data = []

        for script in scripts:
            try:
                content = script.string
                if content:
                    parsed = json.loads(content)
                    json_data.append(parsed)
            except Exception:
                pass
        return json_data

    @staticmethod
    async def _async_scrape_page(url: str):
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ])
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                )
            )
            page = await context.new_page()
            
            logger.info(f"Opening: {url}")
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_timeout(3000)

                # auto scroll
                await page.evaluate("""
                    async () => {
                        await new Promise((resolve) => {
                            let totalHeight = 0;
                            let distance = 500;
                            let timer = setInterval(() => {
                                let scrollHeight = document.body.scrollHeight;
                                window.scrollBy(0, distance);
                                totalHeight += distance;
                                if(totalHeight >= scrollHeight){
                                    clearInterval(timer);
                                    resolve();
                                }
                            }, 300);
                        });
                    }
                """)
                html = await page.content()
                return html
            finally:
                await browser.close()

    @staticmethod
    def extract_with_groq(text, json_ld):
        if not client:
            logger.error("Groq client not initialized. Check GROQ_API_KEY.")
            return None

        prompt = f"""
You are a travel property extraction AI.
Extract ALL useful information from the content.
Return ONLY VALID JSON.

Required format:
{{
  "platform": "",
  "title": "",
  "description": "",
  "amenities": [],
  "images": [],
}}

JSON-LD DATA:
{json.dumps(json_ld, indent=2)}

PAGE CONTENT:
{text}
"""
        try:
            completion = client.chat.completions.create(
                model=MODEL,
                temperature=0,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            response = completion.choices[0].message.content
            return json.loads(response)
        except Exception as e:
            logger.error(f"Groq extraction failed: {str(e)}")
            return None

    @staticmethod
    def scrape_link(url):
        """
        Scrape property information using Playwright and Groq.
        Maintains backward compatibility with the expected return format.
        """
        if not url:
            return None

        try:
            # Run the async scraper in a sync context
            # Use a new event loop to avoid conflicts with existing loops if any
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            html = loop.run_until_complete(LinkScraperService._async_scrape_page(url))
            loop.close()

            if not html:
                return None

            json_ld = LinkScraperService.extract_json_ld(html)
            cleaned_text = LinkScraperService.clean_html(html)
            
            extracted_data = LinkScraperService.extract_with_groq(cleaned_text, json_ld)
            
            if not extracted_data:
                return None

            # Map the extracted data to the format expected by the app
            # Note: The app expects image_url, link_title, link_description
            images = extracted_data.get('images', [])
            image_url = images[0] if images else None
            
            # If no image found in Groq extraction, try a quick fallback from BeautifulSoup
            if not image_url:
                soup = BeautifulSoup(html, 'html.parser')
                og_image = soup.find('meta', property='og:image')
                if og_image:
                    image_url = og_image.get('content')

            return {
                'image_url': image_url,
                'link_title': extracted_data.get('title'),
                'link_description': extracted_data.get('description'),
                'amenities': extracted_data.get('amenities', []),
                'platform': extracted_data.get('platform')
            }

        except Exception as e:
            logger.error(f"Scraping error for {url}: {str(e)}")
            return None

    @staticmethod
    def scrape_and_update_option(option):
        """
        Scrape metadata from option's link and update the option object.
        """
        if not option.link:
            return False

        metadata = LinkScraperService.scrape_link(option.link)
        if not metadata:
            return False

        if metadata.get('image_url') and not option.image_path:
            option.image_url = metadata['image_url']

        if metadata.get('link_title'):
            option.link_title = metadata['link_title']
            # Update the main title as requested
            option.title = metadata['link_title']

        if metadata.get('link_description') and not option.link_description:
            option.link_description = metadata['link_description']
            
        # If the model has amenities or other fields, we could store them in notes or a JSON field
        if metadata.get('amenities') and not option.notes:
            option.notes = f"Amenities: {', '.join(metadata['amenities'][:10])}"

        return True
