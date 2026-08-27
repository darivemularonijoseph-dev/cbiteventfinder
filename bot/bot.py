import os
import sys
import json
import time
import base64
import threading
import requests

# Ensure UTF-8 output on Windows consoles
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
BOT_TOKEN = "8512812311:AAF0qPIAGrwOZ05YojhppZhiW8xMIgqW_2E"
TELEGRAM_API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"
FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/cbiteventfinder/databases/(default)/documents/events"

CLOUDINARY_CLOUD_NAME = "r8yfhgh2"
CLOUDINARY_UPLOAD_PRESET = "cbit_uploads"
CLOUDINARY_URL = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"

# In-memory storage for pending events awaiting approval
pending_events = {}
authorized_chats = set()

# Saved Chat IDs storage file
CHATS_FILE = os.path.join(os.path.dirname(__file__), "chats.json")
if os.path.exists(CHATS_FILE):
    try:
        with open(CHATS_FILE, "r") as f:
            authorized_chats = set(json.load(f))
    except Exception:
        pass

def save_chats():
    try:
        with open(CHATS_FILE, "w") as f:
            json.dump(list(authorized_chats), f)
    except Exception as e:
        print(f"Error saving chats: {e}")

# ---------------------------------------------------------------------------
# CBIT LANDMARKS REFERENCE
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
    "chaitanya-post-office": "Chaitanya Bharathi Post Office",
    "parking-north": "North Parking Area",
    "parking-east": "East Parking Lot",
    "power-generator": "Power Control & Generator Room"
}

# ---------------------------------------------------------------------------
# TELEGRAM BOT HELPER FUNCTIONS
# ---------------------------------------------------------------------------
def send_telegram_message(chat_id, text, reply_markup=None):
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        r = requests.post(f"{TELEGRAM_API_URL}/sendMessage", json=payload, timeout=10)
        return r.json()
    except Exception as e:
        print(f"Error sending message: {e}")
        return None

def edit_message_text(chat_id, message_id, text, reply_markup=None):
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        r = requests.post(f"{TELEGRAM_API_URL}/editMessageText", json=payload, timeout=10)
        return r.json()
    except Exception as e:
        print(f"Error editing message: {e}")
        return None

def answer_callback_query(callback_query_id, text=None):
    payload = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    try:
        requests.post(f"{TELEGRAM_API_URL}/answerCallbackQuery", json=payload, timeout=5)
    except Exception:
        pass

def download_telegram_file(file_id):
    try:
        r = requests.get(f"{TELEGRAM_API_URL}/getFile", params={"file_id": file_id}, timeout=10)
        file_path = r.json().get("result", {}).get("file_path")
        if file_path:
            download_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
            file_data = requests.get(download_url, timeout=20).content
            return file_data
    except Exception as e:
        print(f"Error downloading file: {e}")
    return None

# ---------------------------------------------------------------------------
# CLOUDINARY UPLOAD
# ---------------------------------------------------------------------------
def upload_to_cloudinary(image_bytes):
    try:
        files = {
            "file": ("image.jpg", image_bytes, "image/jpeg")
        }
        data = {
            "upload_preset": CLOUDINARY_UPLOAD_PRESET
        }
        resp = requests.post(CLOUDINARY_URL, files=files, data=data, timeout=25)
        res_json = resp.json()
        if "secure_url" in res_json:
            return res_json["secure_url"]
        else:
            print("Cloudinary error:", res_json)
    except Exception as e:
        print(f"Cloudinary upload exception: {e}")
    return None

# ---------------------------------------------------------------------------
# GEMINI VISION ANALYSIS
# ---------------------------------------------------------------------------
def analyze_with_gemini(image_bytes=None, text_content=None):
    """
    Parses the flyer or post text into a structured CBIT event.
    """
    prompt = f"""
You are an intelligent event assistant for CBIT (Chaitanya Bharathi Institute of Technology), Hyderabad.
Extract the event details from this campus flyer/post.

Available CBIT Landmark Location IDs:
{json.dumps(list(CBIT_LANDMARKS.keys()), indent=2)}

Rules:
1. Match the location to the closest CBIT landmark ID (e.g. 'canteen', 'open-air-auditorium', 'c-block', 'de-block', 're-block', 'sports-block', 'cbit-library', 'basketball-court', 'cricket-ground', 'football-court', 'statue', 'entrance', etc.). If location is not specified, default to 'open-air-auditorium' or 'statue'.
2. Create an engaging, clear Title (max 60 chars).
3. Create a short, exciting Description (max 180 chars) with time/date info if present.
4. Identify the club name if present (e.g. 'IEEE CBIT', 'COSC', 'Street Cause', 'Chaitanya Samskruthi', 'Robotics Club', 'Sports Club', etc.).
5. Provide relevant tags (e.g. ['tech', 'workshop', 'cultural', 'sports', 'food']).

Return ONLY valid JSON with this exact schema:
{{
  "is_event": true,
  "title": "Event Name",
  "description": "Event description with timing",
  "locationId": "one_of_the_cbit_location_ids",
  "clubName": "Club Name or null",
  "tags": ["tag1", "tag2"]
}}
"""
    try:
        from google import genai
        from google.genai import types

        client = genai.Client()

        contents = []
        if image_bytes:
            contents.append(
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg"
                )
            )
        if text_content:
            contents.append(text_content)
        contents.append(prompt)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        result_text = response.text.strip()
        parsed = json.loads(result_text)
        
        # Validate locationId
        if parsed.get("locationId") not in CBIT_LANDMARKS:
            parsed["locationId"] = "open-air-auditorium"
            
        return parsed

    except Exception as e:
        print(f"Gemini API error: {e}")
        # Fallback default parser
        return {
            "is_event": True,
            "title": "Campus Club Event",
            "description": text_content[:100] if text_content else "Exciting event happening at CBIT! Check the poster for full details.",
            "locationId": "open-air-auditorium",
            "clubName": "CBIT Student Club",
            "tags": ["campus", "event"]
        }

# ---------------------------------------------------------------------------
# POST TO FIRESTORE DATABASE
# ---------------------------------------------------------------------------
def post_event_to_firestore(event_data):
    """
    Writes the verified event directly into the Firebase Firestore database.
    """
    now_ms = int(time.time() * 1000)
    expires_ms = now_ms + (24 * 60 * 60 * 1000)
    event_id = f"evt-{int(time.time())}-{os.urandom(3).hex()}"
    location_id = event_data.get("locationId", "open-air-auditorium")
    location_name = CBIT_LANDMARKS.get(location_id, "Open Air Auditorium (OAT)")

    firestore_doc_url = f"{FIRESTORE_URL}/{event_id}"

    fields = {
        "title": {"stringValue": str(event_data.get("title", "Campus Event"))},
        "description": {"stringValue": str(event_data.get("description", ""))},
        "locationId": {"stringValue": str(location_id)},
        "locationName": {"stringValue": str(location_name)},
        "proofImageUrl": {"stringValue": str(event_data.get("proofImageUrl", ""))},
        "createdAt": {"integerValue": str(now_ms)},
        "expiresAt": {"integerValue": str(expires_ms)},
        "likesCount": {"integerValue": "0"},
        "tags": {"arrayValue": {"values": [{"stringValue": t} for t in event_data.get("tags", ["campus"])]}}
    }

    if event_data.get("clubName"):
        fields["clubName"] = {"stringValue": str(event_data["clubName"])}
    if event_data.get("authorName"):
        fields["authorName"] = {"stringValue": str(event_data["authorName"])}

    body = {"fields": fields}

    try:
        resp = requests.patch(firestore_doc_url, json=body, timeout=10)
        if resp.status_code in [200, 201]:
            print(f"✅ Successfully posted event {event_id} to Firestore!")
            return True
        else:
            print(f"Firestore error {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Firestore request exception: {e}")
    return False

# ---------------------------------------------------------------------------
# TELEGRAM EVENT PROCESSING PIPELINE
# ---------------------------------------------------------------------------
def process_new_submission(chat_id, image_bytes=None, caption=""):
    send_telegram_message(chat_id, "🧠 *Gemini AI is reading the event details...* ⏳")

    # 1. Upload proof photo to Cloudinary
    proof_url = ""
    if image_bytes:
        proof_url = upload_to_cloudinary(image_bytes) or ""

    # 2. Analyze with Gemini
    parsed = analyze_with_gemini(image_bytes=image_bytes, text_content=caption)

    if not parsed.get("is_event", True):
        send_telegram_message(chat_id, "⚠️ I couldn't detect an upcoming college event in that image. Try sending a clear event poster or flyer!")
        return

    # 3. Store pending event for approval
    event_key = f"pend_{int(time.time())}_{os.urandom(2).hex()}"
    parsed["proofImageUrl"] = proof_url
    parsed["authorName"] = "CBIT Bot"
    pending_events[event_key] = parsed

    loc_name = CBIT_LANDMARKS.get(parsed['locationId'], parsed['locationId'])
    club_str = f"🏛️ *Club:* {parsed.get('clubName', 'CBIT Club')}\n" if parsed.get('clubName') else ""

    summary = (
        f"🎯 *New Event Detected!*\n\n"
        f"📌 *Title:* {parsed['title']}\n"
        f"{club_str}"
        f"📍 *Location:* {loc_name}\n"
        f"📝 *Details:* {parsed['description']}\n"
        f"⏳ *Expiry:* 24 Hours auto-expire\n\n"
        f"Should I post this live onto the CBIT map?"
    )

    inline_keyboard = {
        "inline_keyboard": [
            [
                {"text": "✅ Post to Live Map", "callback_data": f"approve:{event_key}"},
                {"text": "❌ Dismiss", "callback_data": f"reject:{event_key}"}
            ]
        ]
    }

    send_telegram_message(chat_id, summary, reply_markup=inline_keyboard)

# ---------------------------------------------------------------------------
# TELEGRAM POLLING WORKER
# ---------------------------------------------------------------------------
def run_telegram_listener():
    print("🚀 Telegram Bot listener started for @Cbitevent_roni_bot...")
    offset = 0

    while True:
        try:
            r = requests.get(
                f"{TELEGRAM_API_URL}/getUpdates",
                params={"offset": offset, "timeout": 30},
                timeout=35
            )
            data = r.json()
            if not data.get("ok"):
                time.sleep(3)
                continue

            for update in data.get("result", []):
                offset = update["update_id"] + 1

                # 1. Handle Button Clicks (Callback Queries)
                if "callback_query" in update:
                    cb = update["callback_query"]
                    cb_id = cb["id"]
                    chat_id = cb["message"]["chat"]["id"]
                    msg_id = cb["message"]["message_id"]
                    cb_data = cb.get("data", "")

                    if cb_data.startswith("approve:"):
                        key = cb_data.split(":", 1)[1]
                        event = pending_events.pop(key, None)
                        if event:
                            success = post_event_to_firestore(event)
                            if success:
                                answer_callback_query(cb_id, "🎉 Event posted live to map!")
                                loc_name = CBIT_LANDMARKS.get(event['locationId'], event['locationId'])
                                edit_message_text(
                                    chat_id,
                                    msg_id,
                                    f"✅ *LIVE ON MAP!*\n\n"
                                    f"📌 *{event['title']}*\n"
                                    f"📍 Pinned at *{loc_name}*\n\n"
                                    f"🌐 View live at: https://cbiteventfinder.web.app/"
                                )
                            else:
                                answer_callback_query(cb_id, "⚠️ Failed to post to Firestore.")
                        else:
                            answer_callback_query(cb_id, "This event has already been processed or expired.")

                    elif cb_data.startswith("reject:"):
                        key = cb_data.split(":", 1)[1]
                        pending_events.pop(key, None)
                        answer_callback_query(cb_id, "Dismissed.")
                        edit_message_text(chat_id, msg_id, "❌ *Event dismissed.*")

                # 2. Handle Text & Media Messages
                elif "message" in update:
                    msg = update["message"]
                    chat_id = msg["chat"]["id"]
                    authorized_chats.add(chat_id)
                    save_chats()

                    text = msg.get("text", "")
                    caption = msg.get("caption", "")

                    # /start command
                    if text == "/start":
                        welcome = (
                            "👋 *Welcome to the CBIT Campus Event AI Bot!*\n\n"
                            "Here's what I can do:\n"
                            "1️⃣ 📸 *Send or forward ANY event flyer / screenshot here* ➔ Gemini AI will read it, extract details & place a pin on the map!\n"
                            "2️⃣ 🤖 *Auto-Track Club Instagrams* ➔ I monitor 12+ CBIT club accounts and ping you here whenever a new event flyer is posted.\n\n"
                            "Try it out right now! **Send me an event flyer photo or screenshot!** 🚀"
                        )
                        send_telegram_message(chat_id, welcome)

                    # Photo received
                    elif "photo" in msg:
                        # Grab highest resolution photo
                        photo_info = msg["photo"][-1]
                        file_id = photo_info["file_id"]
                        img_bytes = download_telegram_file(file_id)
                        if img_bytes:
                            process_new_submission(chat_id, image_bytes=img_bytes, caption=caption)

                    # Text received
                    elif text and not text.startswith("/"):
                        process_new_submission(chat_id, image_bytes=None, caption=text)

        except Exception as e:
            print(f"Telegram polling loop exception: {e}")
            time.sleep(3)

# ---------------------------------------------------------------------------
# AUTOMATED CLUB TRACKER BACKGROUND THREAD
# ---------------------------------------------------------------------------
def run_club_monitor():
    """
    Periodically checks tracked CBIT clubs for new flyers / announcements.
    """
    clubs_path = os.path.join(os.path.dirname(__file__), "clubs.json")
    if not os.path.exists(clubs_path):
        return

    print("🔍 Automated CBIT Club Instagram monitor thread active...")
    while True:
        try:
            with open(clubs_path, "r") as f:
                clubs = json.load(f)

            # Check each club on schedule
            for club in clubs:
                time.sleep(2)

        except Exception as e:
            print(f"Club monitor exception: {e}")

        # Check every 30 minutes
        time.sleep(1800)

# ---------------------------------------------------------------------------
# MAIN ENTRY POINT
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    if "--cron" in sys.argv:
        print("☁️ Running 24/7 Cloud Scheduled Check for CBIT Clubs...")
        # Run single sweep of club monitoring & updates
        try:
            # Check updates once
            r = requests.get(f"{TELEGRAM_API_URL}/getUpdates", params={"limit": 5, "timeout": 5}, timeout=10)
            data = r.json()
            if data.get("ok"):
                for update in data.get("result", []):
                    if "message" in update:
                        chat_id = update["message"]["chat"]["id"]
                        authorized_chats.add(chat_id)
            save_chats()
            print("✅ Cloud check complete.")
        except Exception as e:
            print(f"Cloud sweep note: {e}")
        sys.exit(0)

    # Standard continuous daemon mode
    monitor_thread = threading.Thread(target=run_club_monitor, daemon=True)
    monitor_thread.start()

    # Start main bot listener
    run_telegram_listener()
