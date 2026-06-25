from flask import Flask, render_template, jsonify, request
import requests
import xml.etree.ElementTree as ET
import time
import logging

app = Flask(__name__)

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SEC = 600  # 10 minutes cache

def parse_feed_xml(xml_content):
    """
    Parses the Atom XML feed content into a structured list of entries.
    """
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        logger.error(f"XML Parsing error: {e}")
        raise ValueError("Failed to parse feed XML.")

    # Atom namespace
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    
    entries = []
    # Find all <entry> tags using the namespace
    for entry_elem in root.findall("atom:entry", ns):
        # Extract title (the date)
        title_elem = entry_elem.find("atom:title", ns)
        title = title_elem.text.strip() if title_elem is not None and title_elem.text else "Unknown Date"
        
        # Extract ID
        id_elem = entry_elem.find("atom:id", ns)
        entry_id = id_elem.text.strip() if id_elem is not None and id_elem.text else ""
        
        # Extract updated timestamp
        updated_elem = entry_elem.find("atom:updated", ns)
        updated = updated_elem.text.strip() if updated_elem is not None and updated_elem.text else ""
        
        # Extract alternate link
        link_href = ""
        for link_elem in entry_elem.findall("atom:link", ns):
            rel = link_elem.attrib.get("rel", "")
            if rel == "alternate" or not rel:
                link_href = link_elem.attrib.get("href", "")
                if link_href:
                    break
        
        # Extract content HTML
        content_elem = entry_elem.find("atom:content", ns)
        content_html = content_elem.text if content_elem is not None and content_elem.text else ""
        
        entries.append({
            "id": entry_id,
            "title": title,
            "updated": updated,
            "link": link_href,
            "content": content_html
        })
        
    return entries

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    current_time = time.time()
    
    # Check if cache is valid
    if not force_refresh and cache["data"] is not None and (current_time - cache["last_fetched"] < CACHE_DURATION_SEC):
        logger.info("Serving releases from in-memory cache")
        return jsonify({
            "source": "cache",
            "last_fetched": cache["last_fetched"],
            "releases": cache["data"]
        })
    
    # Fetch from Google Cloud feeds
    logger.info(f"Fetching latest release notes from {FEED_URL}")
    try:
        headers = {
            "User-Agent": "BigQueryReleaseNotesViewer/1.0 (Flask App; Python)"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch feed: {e}")
        # If fetch fails but we have cached data, fallback to cache
        if cache["data"] is not None:
            logger.warning("Fetch failed, returning stale cached data")
            return jsonify({
                "source": "cache_fallback",
                "last_fetched": cache["last_fetched"],
                "error": f"Failed to fetch latest data ({str(e)}). Displaying cached version.",
                "releases": cache["data"]
            }), 200
        
        return jsonify({
            "error": "Failed to retrieve release notes from the Google Cloud feed.",
            "details": str(e)
        }), 502

    # Parse and update cache
    try:
        releases = parse_feed_xml(response.content)
        cache["data"] = releases
        cache["last_fetched"] = current_time
        
        return jsonify({
            "source": "network",
            "last_fetched": current_time,
            "releases": releases
        })
    except Exception as e:
        logger.error(f"Failed to parse fetched feed: {e}")
        if cache["data"] is not None:
            return jsonify({
                "source": "cache_fallback",
                "last_fetched": cache["last_fetched"],
                "error": f"Failed to parse latest data. Displaying cached version.",
                "releases": cache["data"]
            }), 200
            
        return jsonify({
            "error": "Failed to parse feed data.",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
