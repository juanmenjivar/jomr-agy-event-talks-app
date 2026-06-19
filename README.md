# BigQuery Release Explorer 🚀

A modern, high-fidelity web dashboard that tracks, segments, and displays Google BigQuery release notes in real time. It features a robust Python Flask backend, disk-based caching, instant clientside filtering, and a custom simulated X/Twitter Composer card that truncates posts intelligently to fit under the 280-character limit (while ensuring documentation links and hashtags remain intact).

---

## ✨ Features

- **Split-Update Parsing**: Automatically processes Atom feeds, separating combined multi-update entries into distinct, self-contained cards (e.g. splitting daily updates into independent *Feature*, *Announcement*, or *Issue* cards).
- **Disk-Based Caching**: Avoids hitting Google API rate limits and loading latency by storing parsed feeds locally on the disk for 1 hour.
- **Dynamic Controls**: Includes real-time keyword search and category tag pills to filter card elements instantly.
- **X (Twitter) Custom Composer**: Replicates X's modern posting dialog:
  - Smart Truncation: Auto-truncates description content to fit under the 280 limit while protecting URLs and hashtags.
  - SVG Progress Ring: Changes colors (blue, amber, red) dynamically to signal characters remaining.
  - Direct Intent Launching: Exports customized text directly to X via query parameters.
- **Glassmorphic Multi-Theme Layout**: Clean CSS vars-driven design supporting instant light and dark theme toggling (continuity handled via `localStorage`).

---

## 📂 Project Structure

```text
bq-releases-notes/
├── app.py                  # Flask server, Atom XML parser & caching engine
├── requirements.txt        # Backend python dependencies
├── .gitignore              # Files/folders excluded from Git control
├── README.md               # Project documentation (this file)
├── templates/
│   └── index.html          # Structure template & dialog structures
└── static/
    ├── css/
    │   └── styles.css      # Themes, keyframe skeleton loaders, and composer styling
    └── js/
        └── app.js          # Core frontend controller (fetch, filter, stats & intent)
```

---

## 🛠️ Quick Start & Setup

### Prerequisites
Make sure you have Python 3.8+ installed on your computer.

### 1. Installation
Clone the repository and install the dependencies from the project folder:
```bash
# Navigate to project directory
cd bq-releases-notes

# Install requirements
pip install -r requirements.txt
```

### 2. Run the Application
Start the Flask development server:
```bash
python app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🌐 API Reference

### Get Release Notes
Retrieves the flat list of parsed sub-updates.

- **URL**: `/api/releases`
- **Method**: `GET`
- **Query Parameters**:
  - `refresh=true` (Optional): Forces a live bypass to download and parse a fresh XML feed instead of loading from the disk cache.
- **Response Format**: `JSON`

#### Example Response Payload:
```json
{
  "success": true,
  "fetched_fresh": false,
  "count": 1,
  "releases": [
    {
      "id": "up-12",
      "date": "June 17, 2026",
      "timestamp": "2026-06-17T00:00:00-07:00",
      "type": "Feature",
      "html": "<p>You can enable autonomous embedding generation on tables...</p>",
      "text": "You can enable autonomous embedding generation on tables...",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026"
    }
  ]
}
```

---

## 💾 Cache Operations
The backend caches feed results in `releases_cache.json` in the root folder. 
- To customize the expiration time, modify the `CACHE_EXPIRY` variable inside `app.py` (defaults to `3600` seconds / 1 hour).
- Clicking the **Refresh Feed** button in the web UI forces a request with `?refresh=true`, updating the local cache immediately.
