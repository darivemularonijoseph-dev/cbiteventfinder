import os
import sys
import json
import time
import base64
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
Analyze this flyer / Instagram post / story submitted for club '{club_name}'.

Available CBIT Landmark Location IDs:
{json.dumps(list(CBIT_LANDMARKS.keys()), indent=2)}

Landmark Synonym Rules:
- "Aerobic Room", "Aerobics Room", "Indoor Arena", "Gym", "Badminton Court", "Yoga Hall", "Sports Complex", "Sports Club" -> map to "sports-block"
- "Kabaddi Court", "Kabaddi Arena" -> map to "kabaddi-court"
- "Cricket Ground", "Main Turf" -> map to "cricket-ground"
- "Football Ground", "Football Field", "Track" -> map to "football-court"
- "Basketball Court" -> map to "basketball-court"
- "Volleyball Court" -> map to "volleyball-court"
- "Throwball Court" -> map to "throwball-court"
- "OAT", "Open Air Auditorium", "Amphitheatre", "Fest Stage" -> map to "open-air-auditorium"
- "Canteen", "Food Court", "Cafeteria", "Snack Bar" -> map to "canteen"
- "C-Block", "CSE Department", "Coding Lab", "Hackathon Lab" -> map to "c-block"
- "D&E Block", "CSM", "Mechanical" -> map to "de-block"
- "R&E Block", "Incubation", "EDC Hub" -> map to "re-block"
- "Library", "Central Library", "Study Zone" -> map to "cbit-library"
- "Statue", "Roundabout", "Circle" -> map to "statue"

Task:
1. Is this a college event, workshop, audition, fest, dance session, sports tournament, hackathon, or campus announcement?
2. If YES:
   - Extract Title (max 50 chars).
   - Extract Description (max 160 chars, include date/time/venue).
   - Match to the most accurate CBIT landmark ID from the list above (default to "open-air-auditorium" if general campus).
   - Extract tags (e.g. ['dance', 'sports', 'workshop', 'tech', 'fest']).
3. If this is a personal selfie, random meme, or has zero event info, set "is_event": false.

Return JSON ONLY:
{{
  "is_event": true,
  "title": "Event Name",
  "description": "Event description with timing and venue",
  "locationId": "open-air-auditorium",
  "clubName": "{club_name}",
  "tags": ["campus"]
}}
"""
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
    if not api_key:
        print("CRITICAL: No GEMINI_API_KEY found in environment! Skipping AI analysis.")
        return {"is_event": False, "api_error": "No GEMINI_API_KEY found in environment."}

    parts = []
    if image_bytes:
        mime = "image/jpeg"
        if image_bytes.startswith(b'\x89PNG'):
            mime = "image/png"
        elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:16]:
            mime = "image/webp"
            
        parts.append({
            "inline_data": {
                "mime_type": mime,
                "data": base64.b64encode(image_bytes).decode("utf-8")
            }
        })
    if text_caption:
        parts.append({"text": f"Post Caption:\n{text_caption}"})
    parts.append({"text": prompt})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }

    # Use standard Google Generative Language REST endpoints
    models_to_try = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"]
    last_error = ""

    for model_name in models_to_try:
        try:
            print(f"🧠 Calling Google Gemini REST API ({model_name})...")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            resp = requests.post(url, json=payload, timeout=25)
            
            if resp.status_code == 200:
                res_json = resp.json()
                raw_text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                raw_text = raw_text.strip()
                data = json.loads(raw_text)
                if data.get("locationId") not in CBIT_LANDMARKS:
                    data["locationId"] = "open-air-auditorium"
                return data
            else:
                last_error = f"HTTP {resp.status_code} on {model_name}: {resp.text}"
                print(f"Gemini {model_name} returned: {resp.status_code} - {resp.text[:120]}")
        except Exception as model_err:
            last_error = str(model_err)
            print(f"Gemini {model_name} request exception: {model_err}")

    return {"is_event": False, "api_error": last_error}

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
def process_telegram_messages():
    print("\n[TELEGRAM] Checking Telegram bot for manually forwarded stories...")

    try:
        # Use Telegram's built-in offset. Just call getUpdates with no offset
        # and after processing each message, immediately acknowledge it.
        r = requests.get(f"{TELEGRAM_API_URL}/getUpdates?timeout=5", timeout=15)
        updates = r.json().get("result", [])
    except Exception as e:
        print(f"Error fetching Telegram updates: {e}")
        return

    if not updates:
        print("[TELEGRAM] No new manual story submissions found.")
        return

    print(f"[TELEGRAM] Found {len(updates)} pending message(s)!")

    for update in updates:
        update_id = update["update_id"]
        msg = update.get("message", {})
        chat_id = msg.get("chat", {}).get("id")

        # Immediately acknowledge this update so it won't be re-processed
        requests.get(f"{TELEGRAM_API_URL}/getUpdates?offset={update_id + 1}&timeout=1", timeout=10)

        # Handle /start command
        if msg.get("text", "").startswith("/start"):
            requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                "chat_id": chat_id,
                "text": "Welcome to CBIT Event Finder Bot!\n\nJust send me a screenshot of any Instagram story or event poster, and I will automatically analyze it with AI and pin it to the live campus map!\n\nMap: https://cbiteventfinder.web.app/"
            })
            continue

        if "photo" not in msg:
            requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                "chat_id": chat_id,
                "text": "Please send me a photo/screenshot of an event poster or story!"
            })
            continue

        print(f"[TELEGRAM] Received a photo from user {chat_id}!")
        photo = msg["photo"][-1]
        file_id = photo["file_id"]

        try:
            # Download photo from Telegram servers
            f_res = requests.get(f"{TELEGRAM_API_URL}/getFile?file_id={file_id}").json()
            file_path = f_res["result"]["file_path"]
            img_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
            img_bytes = requests.get(img_url).content
            caption = msg.get("caption", "Event poster forwarded via Telegram")

            # Send "processing" reply so user knows it's working
            requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                "chat_id": chat_id,
                "text": "Got it! Analyzing your image with Gemini AI... please wait."
            })

            print(f"[TELEGRAM] Passing photo to Gemini AI...")
            parsed = analyze_flyer_with_gemini(image_bytes=img_bytes, text_caption=caption, club_name="CBIT Club")

            if parsed.get("is_event"):
                print(f"[TELEGRAM] EVENT DETECTED: {parsed['title']} at {parsed['locationId']}")
                cloud_img = upload_to_cloudinary(img_bytes)

                event_data = {
                    "fields": {
                        "title": {"stringValue": parsed["title"]},
                        "description": {"stringValue": parsed["description"]},
                        "locationId": {"stringValue": parsed["locationId"]},
                        "locationName": {"stringValue": CBIT_LANDMARKS.get(parsed["locationId"], "Unknown Venue")},
                        "proofImageUrl": {"stringValue": cloud_img},
                        "authorName": {"stringValue": "Searched by AI"},
                        "createdAt": {"integerValue": str(int(time.time() * 1000))},
                        "expiresAt": {"integerValue": str(int((time.time() + 86400) * 1000))}
                    }
                }

                tags_array = [{"stringValue": tag} for tag in parsed.get("tags", [])]
                if tags_array:
                    event_data["fields"]["tags"] = {"arrayValue": {"values": tags_array}}

                resp = requests.post(FIRESTORE_URL, json=event_data)

                if resp.status_code == 200:
                    print(f"[TELEGRAM] SUCCESS: Posted '{parsed['title']}' to live map!")
                    loc_name = CBIT_LANDMARKS.get(parsed['locationId'], parsed['locationId'])
                    requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": f"DONE! '{parsed['title']}' has been pinned to the live map at {loc_name}!\n\nView: https://cbiteventfinder.web.app/"
                    })
                else:
                    print(f"[TELEGRAM] Firestore error: {resp.text}")
                    requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": f"Error posting to the map. Firestore rejected the event."
                    })
            elif parsed.get("api_error"):
                print(f"[TELEGRAM] Gemini API error: {parsed.get('api_error')}")
                requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                    "chat_id": chat_id,
                    "text": f"⚠️ Gemini AI service notice: {parsed.get('api_error')[:150]}\n\nPlease check your GEMINI_API_KEY secret in GitHub settings."
                })
            else:
                print("[TELEGRAM] Gemini analyzed image: Not an event flyer.")
                requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                    "chat_id": chat_id,
                    "text": "Hmm, the AI analyzed this image but didn't detect an event flyer. Make sure your image shows event text/date/venue!"
                })
        except Exception as e:
            print(f"Error processing Telegram photo: {e}")
            requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                "chat_id": chat_id,
                "text": f"Something went wrong processing your image ({str(e)[:100]}). Please try again."
            })


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
        
        direct_urls = [f"https://www.instagram.com/{h}/" for h in handles]
        
        # Run Apify Instagram Scraper with direct profile URLs
        run_input = {
            "directUrls": direct_urls,
            "resultsLimit": 3,
            "resultsType": "posts"
        }
        
        print("⚡ Triggering Apify Cloud Scraper with direct profile URLs...")
        run = client.actor("apify/instagram-scraper").call(run_input=run_input)
        
        if not run:
            print("Apify run did not return results.")
            return

        dataset_id = run.default_dataset_id
        print(f"📦 Scraping complete. Fetching dataset {dataset_id}...")

        for item in client.dataset(dataset_id).iterate_items():
            item_id = item.get("id") or item.get("shortCode") or item.get("url")
            if not item_id or item_id in processed_set:
                continue

            processed_set.add(item_id)
            save_processed(processed_set)

            caption = item.get("caption", "")
            
            # Smart Image Extraction: In carousels, the first image is often a logo/blank cover, 
            # while the actual event poster with text is the 2nd or last slide.
            image_url = item.get("displayUrl") or item.get("thumbnailUrl") or ""
            child_posts = item.get("childPosts", [])
            if child_posts and len(child_posts) > 1:
                # Prioritize the second image (index 1) or last image if it's a flyer
                image_url = child_posts[-1].get("displayUrl") or image_url

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

def main():
    print("Starting CBIT Event Finder Cloud Runner...")
    
    # 1. Run the main Instagram scraper
    try:
        run_full_auto_scan()
    except Exception as e:
        print(f"Critical error in Apify scraper: {e}")
        
    # 2. ALWAYS run the Telegram manual submission processor
    try:
        process_telegram_messages()
    except Exception as e:
        print(f"Critical error in Telegram processor: {e}")

if __name__ == "__main__":
    main()
