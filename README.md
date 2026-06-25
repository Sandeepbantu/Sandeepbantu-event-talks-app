# BigQuery Release Notes Explorer & Social Share

A sleek, premium, single-page web application that aggregates Google Cloud BigQuery release notes directly from the official feed and lets you instantly format and share specific updates on X (formerly Twitter).

---

## 🚀 Key Features

*   **Granular Update Parsing**: Splits daily aggregated Google Cloud feed items into individual, category-specific update cards (e.g. *Features, Announcements, Issues, Breaking, and Changes*).
*   **Live Caching**: Backend fetches release notes from Google Cloud and caches them in memory for 10 minutes to ensure fast load times, with a force-sync override option.
*   **Search & Filtering**: Real-time keyword searching and category filtering on the frontend.
*   **Analytics Dashboard**: A counters layout showing the volume of updates, features, announcements, and issues loaded in the current feed.
*   **Interactive Tweet Composer**:
    *   Generates a pre-formatted template with relevant emojis, snippets, and official links.
    *   Tracks character limits dynamically, accurately counting any URL as exactly 23 characters matching X's format.
    *   Includes quick-add buttons for popular tech hashtags (`#BigQuery`, `#GoogleCloud`, `#DataEngineering`).
    *   Features a pixel-perfect **X/Twitter Feed visual preview**.
*   **One-Click Action**: Copy drafts to your clipboard with custom toast notifications, or open the official X sharing intent directly.
*   **Premium Aesthetics**: Styled with deep slate gradients, glowing background orbs, smooth transitions, custom scrollbars, and animated CSS loading skeletons.

---

## 🛠️ Technology Stack

*   **Backend**: Python Flask, `requests`
*   **Frontend**: Vanilla HTML5, CSS3, ES6 JavaScript (No external frameworks like React, Tailwind, or Vue required)
*   **Fonts**: *Outfit* & *Plus Jakarta Sans* (via Google Fonts)
*   **Data Source**: Official Google Cloud BigQuery Release Notes RSS Feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`)

---

## 📁 Directory Structure

```text
Sandeepbantu-event-talks-app/
├── app.py                 # Flask server (routes, Atom parser, in-memory caching)
├── requirements.txt       # Python dependencies (Flask, requests)
├── .gitignore             # Git exclusion rules
├── README.md              # Project documentation
├── push_to_github.py      # Git automation helper script
├── templates/
│   └── index.html         # Main dashboard template
└── static/
    ├── css/
    │   └── style.css      # Custom stylesheet (dark mode, glassmorphism, animations)
    └── js/
        └── app.js         # Frontend engine (DOMParser, filters, tweet composer logic)
```

---

## ⚙️ Setup and Installation

### Prerequisites

*   Python 3.8 or higher installed on your machine.
*   Git (optional, for manual cloning/pulling).

### 1. Clone/Open Project Directory
Navigate into the project workspace:
```bash
cd Sandeepbantu-event-talks-app
```

### 2. Set Up Virtual Environment
Create and activate a python virtual environment to isolate project packages:

**On Windows:**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
Install the required python packages:
```bash
pip install -r requirements.txt
```

### 4. Start the Application
Launch the Flask development server:
```bash
python app.py
```

By default, the server starts on `http://127.0.0.1:5000`. 

Open your web browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** to view the application!

---

## 📱 How to Use

1.  **Read and Scroll**: Browse through the chronological release notes stream. Hover over cards to see interactive effects.
2.  **Filter & Search**: Type keywords into the search box or click category pills (*Features*, *Announcements*, etc.) to narrow down updates.
3.  **Sync Feed**: Click the **Refresh** button in the header. The spinner will animate, fetch the live RSS feed from Google Cloud, parse new changes, and update the stats counters.
4.  **Prepare a Tweet**: Click the **Tweet** button on any card. An overlay modal opens showing:
    *   An editable text window containing the auto-generated tweet draft.
    *   The remaining character status (red highlights appear if you exceed 280 characters).
    *   Fast buttons to insert tech hashtags.
    *   A live, accurate preview widget showing how the card will look on an X profile feed.
5.  **Share**:
    *   Click **Copy Tweet** to copy the text to your system clipboard (triggering a toast confirmation).
    *   Click **Post to X** to open a new tab containing the pre-filled text ready to share.

---

## 📜 Disclaimer

This project is an independent tool and is not officially affiliated with Google Cloud, BigQuery, or X/Twitter.
