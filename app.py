import os
import time
import json
import re
import requests
import urllib3
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

# Suppress insecure request warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "releases_cache.json"
CACHE_EXPIRY = 3600  # 1 hour in seconds

def strip_tags(html):
    """
    Strips HTML tags and converts hyperlinks to 'Text (URL)' format
    for plain text representation suitable for tweets.
    """
    text = html
    # Convert links: <a href="url">text</a> -> text (url)
    # Ensure links are absolute.
    text = re.sub(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', r'\2 (\1)', text)
    # Strip remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Clean up whitespace and newlines
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def split_entry_content(html_content):
    """
    Splits the HTML content of an entry into sub-updates by <h3> tags.
    """
    if not html_content:
        return []
    
    parts = re.split(r'(<h3[^>]*>.*?</h3>)', html_content, flags=re.DOTALL)
    sub_updates = []
    
    # If there is content before the first h3
    first_part = parts[0].strip() if parts else ""
    if first_part:
        clean_txt = strip_tags(first_part)
        if clean_txt:
            sub_updates.append({
                'type': 'Update',
                'html': first_part,
                'text': clean_txt
            })
        
    for i in range(1, len(parts), 2):
        header_tag = parts[i]
        content_html = parts[i+1] if i+1 < len(parts) else ""
        
        # Extract the type (e.g. Feature, Bug Fix, Deprecated, etc.)
        match = re.search(r'<h3[^>]*>(.*?)</h3>', header_tag, flags=re.DOTALL)
        update_type = match.group(1).strip() if match else "Update"
        
        clean_txt = strip_tags(content_html)
        sub_updates.append({
            'type': update_type,
            'html': content_html.strip(),
            'text': clean_txt
        })
        
    return sub_updates

def fetch_and_parse_feed():
    """
    Fetches the BigQuery release notes RSS/Atom feed and parses it.
    Returns a list of all parsed updates.
    """
    response = requests.get(FEED_URL, verify=False, timeout=15)
    response.raise_for_status()
    
    root = ET.fromstring(response.content)
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    flat_updates = []
    update_counter = 0
    
    for entry_node in root.findall('atom:entry', namespaces):
        title_node = entry_node.find('atom:title', namespaces)
        date_str = title_node.text if title_node is not None else "Unknown Date"
        
        updated_node = entry_node.find('atom:updated', namespaces)
        timestamp = updated_node.text if updated_node is not None else ""
        
        # Determine the primary link for the entry
        link_node = entry_node.find('atom:link[@rel="alternate"]', namespaces)
        if link_node is None:
            link_node = entry_node.find('atom:link', namespaces)
        entry_link = link_node.attrib.get('href', '') if link_node is not None else ""
        
        content_node = entry_node.find('atom:content', namespaces)
        content_html = content_node.text if content_node is not None else ""
        
        # Segment this entry's html content into sub-updates
        sub_updates = split_entry_content(content_html)
        
        for item in sub_updates:
            update_counter += 1
            
            # Create a specific anchor link for this update if we can match the title
            # In the XML: href="https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026"
            # It already has a date anchor. We'll use the entry link.
            
            flat_updates.append({
                'id': f"up-{update_counter}",
                'date': date_str,
                'timestamp': timestamp,
                'type': item['type'],
                'html': item['html'],
                'text': item['text'],
                'link': entry_link
            })
            
    return flat_updates

def get_cached_releases(force_refresh=False):
    """
    Retrieves release notes from the local cache or fetches them if expired/forced.
    """
    now = time.time()
    
    # Check if cache file exists and is not expired
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
                
            cache_time = cached_data.get('cached_at', 0)
            if now - cache_time < CACHE_EXPIRY:
                return cached_data.get('releases', []), False
        except Exception as e:
            # Fallback to fetching if cache reading fails
            app.logger.warning(f"Error reading cache: {e}")
            
    # Fetch from server
    try:
        releases = fetch_and_parse_feed()
        
        # Save to cache
        cache_data = {
            'cached_at': now,
            'releases': releases
        }
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, indent=2, ensure_ascii=False)
            
        return releases, True
    except Exception as e:
        # If fetch fails and cache exists, fallback to stale cache
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                return cached_data.get('releases', []), False
            except:
                pass
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        releases, fetched_fresh = get_cached_releases(force_refresh)
        return jsonify({
            'success': True,
            'fetched_fresh': fetched_fresh,
            'count': len(releases),
            'releases': releases
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Run server on port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
