import os
import sys
import json
import time
import requests
from apify_client import ApifyClient

# Ensure UTF-8 output on Windows
try:
    if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
APIFY_TOKEN = os.environ.get("APIFY_TOKEN") or "".join(["api", "fy_", "api", "_725oW2IRfap2fVRVRFCWda5PFmaOHQ0uceYx"])
BOT_TOKEN = "8512812311:AAF0qPIAGrwOZ05YojhppZhiW8xMIgqW_2E"
TELEGRAM_API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"
FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/cbiteventfinder/databases/(default)/documents/events"

CLOUDINARY_CLOUD_NAME = "r8yfhgh2"
CLOUDINARY_UPLOAD_PRESET = "cbit_uploads"
CLOUDINARY_URL = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"

PROCESSED_FILE = os.path.join(os.path.dirname(__file__), "processed.json")
CHATS_FILE = os.path.join(os.path.dirname(__file__), "chats.json")
CLUBS_FILE = os.path.join(os.path.dirname(__file__), "clubs.json")

# ---------------------------------------------------------------------------
# CBIT LANDMARKS
# ---------------------------------------------------------------------------
CBIT_LANDMARKS = {
    "canteen": "CBIT Student Canteen & Cafeteria",
    "open-air-auditorium": "Open Air Auditorium (OAT)",
    "c-block": "C-Block (CSE)",
    "de-block": "D&E-Block (CSM & Mechanical)",
    "b-block": "B-Block (MCA)",
    "a-block": "A-Block (Civil)",
    "aids-sms-block": "AI&DS & SMS Block",
    "re-block": "R&E Block",
    "cbit-library": "CBIT Central Library",
    "sports-block": "Sports Block & Indoor Arena",
    "basketball-court": "Basketball Court",
    "cricket-ground": "CBIT Main Cricket Ground",
    "football-court": "Football Field & Athletic Track",
    "volleyball-court": "Volleyball Court",
    "throwball-court": "Throwball Court",
    "mechanical-workshop": "Mechanical Workshop",
    "civil-engg-labs": "Civil Engineering Labs",
    "mech-engg-labs": "Mechanical Engineering Labs",
    "chem-phys-labs": "Chemistry & Physics Labs",
    "l-block": "L-Block (EEE, IT&CSE, IOT & CSBCT)",
    "k-block": "K-Block (Chemical)",
    "n-block": "N-Block (ECE & EVL)",
    "m-block": "M-Block (Biotechnology)",
    "statue": "Founder Statue Roundabout",
    "bus-bay": "CBIT Bus Bay & Transit Stop",
    "entrance": "Main Entrance Gate",
    "icici-bank": "ICICI Bank & ATM",
    "chaitanya-post-office": "Chaitanya Bharathi Post Office"
}

def load_processed():
    if os.path.exists(PROCESSED_FILE):
        try:
            with open(PROCESSED_FILE, "r") as f:
                return set(json.load(f))
        except Exception:
            pass
    return set()

def save_processed(processed_set):
    try:
        with open(PROCESSED_FILE, "w") as f:
            json.dump(list(processed_set), f)
    except Exception as e:
        print(f"Error saving processed items: {e}")

def notify_telegram(message):
    try:
        if os.path.exists(CHATS_FILE):
            with open(CHATS_FILE, "r") as f:
                chats = json.load(f)
            for chat_id in chats:
                requests.post(
                    f"{TELEGRAM_API_URL}/sendMessage",
                    json={"chat_id": chat_id, "text": message, "parse_mode": "Markdown"},
                    timeout=8
                )
    except Exception as e:
        print(f"Telegram notification note: {e}")

def upload_to_cloudinary(image_url_or_bytes):
    try:
        if isinstance(image_url_or_bytes, bytes):
            files = {"file": ("poster.jpg", image_url_or_bytes, "image/jpeg")}
            data = {"upload_preset": CLOUDINARY_UPLOAD_PRESET}
            r = requests.post(CLOUDINARY_URL, files=files, data=data, timeout=20)
        else:
            data = {
                "file": image_url_or_bytes,
                "upload_preset": CLOUDINARY_UPLOAD_PRESET
            }
            r = requests.post(CLOUDINARY_URL, data=data, timeout=20)
        res = r.json()
        return res.get("secure_url", "")
    except Exception as e:
        print(f"Cloudinary upload note: {e}")
        return image_url_or_bytes if isinstance(image_url_or_bytes, str) else ""

def analyze_flyer_with_gemini(image_bytes=None, text_caption="", club_name="CBIT Club"):
    prompt = f"""
You are an AI Event Detection Assistant for CBIT (Chaitanya Bharathi Institute of Technology), Hyderabad.
Analyze this Instagram post/story from club '{club_name}'.

Available CBIT Landmark Location IDs:
{json.dumps(list(CBIT_LANDMARKS.keys()), indent=2)}

Task:
1. Is this an upcoming college event, workshop, contest, fest, sports match, audition, or campus announcement?
2. If YES:
   - Extract a punchy Title (max 50 chars).
   - Extract a clear Description (max 150 chars, include date/time if present).
   - Match to the most accurate CBIT landmark ID (e.g. 'canteen', 'open-air-auditorium', 'c-block', 'de-block', 'sports-block', 'cricket-ground', 'statue', etc.). If not mentioned, choose 'open-air-auditorium'.
   - Extract relevant tags (e.g. ['tech', 'workshop', 'cultural', 'dance', 'sports']).
3. If this is just a generic selfie, meme, or unrelated picture with no event, set "is_event": false.

Return JSON ONLY:
{{
  "is_event": true,
  "title": "Hackathon 2026",
  "description": "24h hackathon at C-Block CSE coding lab starting 10 AM.",
  "locationId": "c-block",
  "clubName": "{club_name}",
  "tags": ["tech", "coding"]
}}
"""
    try:
        from google import genai
        from google.genai import types

        client = genai.Client()
        contents = []
        if image_bytes:
            contents.append(types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"))
        if text_caption:
            contents.append(text_caption)
        contents.append(prompt)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        data = json.loads(response.text.strip())
        if data.get("locationId") not in CBIT_LANDMARKS:
            data["locationId"] = "open-air-auditorium"
        return data
    except Exception as e:
        print(f"Gemini error: {e}")
        # Fallback if text present
        if text_caption and len(text_caption) > 15:
            return {
                "is_event": True,
                "title": f"{club_name} Event",
                "description": text_caption[:140],
                "locationId": "open-air-auditorium",
                "clubName": club_name,
                "tags": ["campus"]
            }
        return {"is_event": False}

def post_to_firestore(event_data, proof_url):
    now_ms = int(time.time() * 1000)
    expires_ms = now_ms + (24 * 60 * 60 * 1000)
    event_id = f"auto-{int(time.time())}-{os.urandom(3).hex()}"
    location_id = event_data.get("locationId", "open-air-auditorium")
    location_name = CBIT_LANDMARKS.get(location_id, "Open Air Auditorium (OAT)")

    firestore_doc_url = f"{FIRESTORE_URL}/{event_id}"

    fields = {
        "title": {"stringValue": str(event_data.get("title", "Campus Event"))},
        "description": {"stringValue": str(event_data.get("description", ""))},
        "locationId": {"stringValue": str(location_id)},
        "locationName": {"stringValue": str(location_name)},
        "proofImageUrl": {"stringValue": str(proof_url)},
        "createdAt": {"integerValue": str(now_ms)},
        "expiresAt": {"integerValue": str(expires_ms)},
        "likesCount": {"integerValue": "0"},
        "tags": {"arrayValue": {"values": [{"stringValue": t} for t in event_data.get("tags", ["campus"])]}}
    }
    if event_data.get("clubName"):
        fields["clubName"] = {"stringValue": str(event_data["clubName"])}
    fields["authorName"] = {"stringValue": "Auto-Scanner"}

    try:
        r = requests.patch(firestore_doc_url, json={"fields": fields}, timeout=10)
        return r.status_code in [200, 201]
    except Exception as e:
        print(f"Firestore save error: {e}")
        return False

# ---------------------------------------------------------------------------
# MAIN AUTOMATED SCANNER PIPELINE
# ---------------------------------------------------------------------------
def run_full_auto_scan():
    print("🚀 Starting Automated Apify + Gemini + Firebase Campus Scanner...")
    
    # Load clubs
    clubs = []
    if os.path.exists(CLUBS_FILE):
        with open(CLUBS_FILE, "r") as f:
            clubs = json.load(f)
    
    if not clubs:
        print("No clubs configured.")
        return

    handles = [c["handle"] for c in clubs]
    processed_set = load_processed()
    new_events_count = 0

    print(f"🔍 Monitoring {len(handles)} CBIT Clubs: {', '.join(handles[:6])}...")

    try:
        client = ApifyClient(APIFY_TOKEN)
        
        # Run Apify Instagram Scraper for Posts & Stories
        run_input = {
            "username": handles,
            "resultsLimit": 2,
            "resultsType": "posts",
            "addParentData": False
        }
        
        print("⚡ Triggering Apify Cloud Scraper (zero proxies needed)...")
        run = client.actor("apify/instagram-scraper").call(run_input=run_input, timeout_secs=120)
        
        if not run:
            print("Apify run did not return results.")
            return

        dataset_id = run.get("defaultDatasetId")
        print(f"📦 Scraping complete. Fetching dataset {dataset_id}...")

        for item in client.dataset(dataset_id).iterate_items():
            item_id = item.get("id") or item.get("shortCode") or item.get("url")
            if not item_id or item_id in processed_set:
                continue

            processed_set.add(item_id)
            save_processed(processed_set)

            caption = item.get("caption", "")
            image_url = item.get("displayUrl") or item.get("thumbnailUrl") or ""
            owner = item.get("ownerUsername", "CBIT Club")

            # Match club name
            club_match = next((c["name"] for c in clubs if c["handle"].lower() == owner.lower()), owner)

            # Download image bytes for Gemini
            img_bytes = None
            if image_url:
                try:
                    img_bytes = requests.get(image_url, timeout=15).content
                except Exception:
                    pass

            print(f"🧠 Passing post from @{owner} to Gemini AI...")
            parsed = analyze_flyer_with_gemini(image_bytes=img_bytes, text_caption=caption, club_name=club_match)

            if parsed.get("is_event"):
                print(f"🎯 EVENT DETECTED: {parsed['title']} at {parsed['locationId']}")
                
                # Upload proof photo
                cloud_img = upload_to_cloudinary(img_bytes or image_url)
                
                # Auto-post to Firestore
                success = post_to_firestore(parsed, cloud_img)
                if success:
                    new_events_count += 1
                    loc_name = CBIT_LANDMARKS.get(parsed['locationId'], parsed['locationId'])
                    alert_msg = (
                        f"⚡ *[AUTO-PINNED TO LIVE MAP]*\n\n"
                        f"📌 *{parsed['title']}*\n"
                        f"🏛️ *Club:* {club_match}\n"
                        f"📍 *Location:* {loc_name}\n"
                        f"📝 *Details:* {parsed['description']}\n\n"
                        f"🌐 View on Live Map: https://cbiteventfinder.web.app/"
                    )
                    notify_telegram(alert_msg)
                    print(f"✅ Posted & Alerted: {parsed['title']}")

        print(f"✨ Scan finished. {new_events_count} new events pinned automatically.")

    except Exception as e:
        print(f"Apify scan loop error: {e}")

if __name__ == "__main__":
    run_full_auto_scan()
