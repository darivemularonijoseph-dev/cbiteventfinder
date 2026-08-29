import os
import sys
import json
import time
import base64
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Ensure UTF-8 output
try:
    if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BOT_TOKEN = "8512812311:AAF0qPIAGrwOZ05YojhppZhiW8xMIgqW_2E"
TELEGRAM_API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"
FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/cbiteventfinder/databases/(default)/documents/events"

CLOUDINARY_CLOUD_NAME = "r8yfhgh2"
CLOUDINARY_UPLOAD_PRESET = "cbit_uploads"
CLOUDINARY_URL = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"

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
    "admin-block": "Main Administration Block",
    "alumni-block": "Alumni Association Block"
}

def upload_to_cloudinary(image_bytes):
    try:
        files = {"file": ("poster.jpg", image_bytes, "image/jpeg")}
        data = {"upload_preset": CLOUDINARY_UPLOAD_PRESET}
        r = requests.post(CLOUDINARY_URL, files=files, data=data, timeout=20)
        return r.json().get("secure_url", "")
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return ""

def analyze_flyer_with_gemini(image_bytes, text_caption=""):
    prompt = f"""
You are an AI Event Detection Assistant for CBIT (Chaitanya Bharathi Institute of Technology), Hyderabad.
Analyze this flyer / screenshot submitted via Telegram.

Available CBIT Landmark Location IDs:
{json.dumps(list(CBIT_LANDMARKS.keys()), indent=2)}

Landmark Synonym Rules:
- "Aerobic Room", "Aerobics Room", "Indoor Arena", "Gym", "Badminton Court", "Yoga Hall", "Sports Complex" -> map to "sports-block"
- "Kabaddi Court", "Kabaddi Arena", "Cricket", "Football", "Basketball", "Volleyball" -> map to respective sports court
- "OAT", "Open Air Auditorium", "Amphitheatre", "Stage" -> map to "open-air-auditorium"
- "Canteen", "Food Court", "Cafeteria" -> map to "canteen"
- "C-Block", "CSE Department", "Coding Lab" -> map to "c-block"
- "R&E Block", "Incubation Hub" -> map to "re-block"
- "Library", "Study Zone" -> map to "cbit-library"

Task:
1. Is this a college event, workshop, audition, fest, dance session, sports match, hackathon, or campus announcement?
2. If YES:
   - Extract Title (max 50 chars).
   - Extract Description (max 160 chars, include date/time/venue).
   - Match to the most accurate CBIT landmark ID from the list (default to "open-air-auditorium" if general campus).
   - Extract tags (e.g. ['dance', 'sports', 'workshop', 'tech', 'fest']).
3. If it is completely unrelated (a random meme, personal selfie with no event info), set "is_event": false.

Return JSON ONLY:
{{
  "is_event": true,
  "title": "Event Name",
  "description": "Event details and timing",
  "locationId": "open-air-auditorium",
  "clubName": "CBIT Club",
  "tags": ["campus"]
}}
"""
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
    if not api_key:
        return {"is_event": False, "api_error": "No GEMINI_API_KEY found in environment."}

    parts = []
    if image_bytes:
        mime = "image/jpeg"
        if image_bytes.startswith(b'\x89PNG'):
            mime = "image/png"
        elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:16]:
            mime = "image/webp"
            
        parts.append({
            "inlineData": {
                "mimeType": mime,
                "data": base64.b64encode(image_bytes).decode("utf-8")
            }
        })
    if text_caption:
        parts.append({"text": f"Post Caption:\n{text_caption}"})
    parts.append({"text": prompt})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2
        }
    }

    models_to_try = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"]
    last_err = ""

    for model in models_to_try:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            resp = requests.post(url, json=payload, timeout=25)
            if resp.status_code == 200:
                res_json = resp.json()
                raw_text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                data = json.loads(raw_text.strip())
                if data.get("locationId") not in CBIT_LANDMARKS:
                    data["locationId"] = "open-air-auditorium"
                return data
            else:
                last_err = f"HTTP {resp.status_code} on {model}: {resp.text}"
                print(f"Gemini {model} returned: {resp.status_code} - {resp.text[:120]}")
        except Exception as e:
            last_err = str(e)
            print(f"Gemini {model} exception: {e}")

    return {"is_event": False, "api_error": last_err}

def run_live_bot():
    print("⚡ Starting Real-Time CBIT Telegram Bot Worker (Instant 2-Second Responses)...")
    offset = 0

    while True:
        try:
            # Long-polling: blocks up to 25s waiting for messages, returns instantly when sent!
            url = f"{TELEGRAM_API_URL}/getUpdates?offset={offset}&timeout=25"
            r = requests.get(url, timeout=30)
            if r.status_code != 200:
                time.sleep(3)
                continue

            updates = r.json().get("result", [])
            for update in updates:
                update_id = update["update_id"]
                offset = update_id + 1

                msg = update.get("message", {})
                chat_id = msg.get("chat", {}).get("id")
                if not chat_id:
                    continue

                if msg.get("text", "").startswith("/start"):
                    requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": "👋 Welcome to CBIT Event Finder Real-Time Bot!\n\nSend or forward ANY event flyer or story screenshot here. I will read it with AI and instantly pin it to the map!\n\n🌐 Live Map: https://cbiteventfinder.web.app/"
                    })
                    continue

                if "photo" not in msg:
                    requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": "📸 Please send a photo or screenshot of an event poster!"
                    })
                    continue

                # User sent a photo!
                photo = msg["photo"][-1]
                file_id = photo["file_id"]

                # Send instant processing ack
                requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                    "chat_id": chat_id,
                    "text": "⚡ Got it! Gemini AI is analyzing your flyer right now..."
                })

                f_res = requests.get(f"{TELEGRAM_API_URL}/getFile?file_id={file_id}", timeout=10).json()
                file_path = f_res["result"]["file_path"]
                img_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
                img_bytes = requests.get(img_url, timeout=15).content
                caption = msg.get("caption", "")

                parsed = analyze_flyer_with_gemini(image_bytes=img_bytes, text_caption=caption)

                if parsed.get("is_event"):
                    cloud_img = upload_to_cloudinary(img_bytes)
                    now_ms = int(time.time() * 1000)
                    expires_ms = now_ms + (24 * 60 * 60 * 1000)
                    loc_id = parsed.get("locationId", "open-air-auditorium")
                    loc_name = CBIT_LANDMARKS.get(loc_id, "Open Air Auditorium (OAT)")

                    event_data = {
                        "fields": {
                            "title": {"stringValue": str(parsed.get("title", "Campus Event"))},
                            "description": {"stringValue": str(parsed.get("description", ""))},
                            "locationId": {"stringValue": str(loc_id)},
                            "locationName": {"stringValue": str(loc_name)},
                            "proofImageUrl": {"stringValue": str(cloud_img)},
                            "authorName": {"stringValue": "Searched by AI (via Telegram)"},
                            "createdAt": {"integerValue": str(now_ms)},
                            "expiresAt": {"integerValue": str(expires_ms)},
                            "likesCount": {"integerValue": "0"},
                            "tags": {"arrayValue": {"values": [{"stringValue": t} for t in parsed.get("tags", ["campus"])]}}
                        }
                    }

                    resp = requests.post(FIRESTORE_URL, json=event_data, timeout=10)
                    if resp.status_code in [200, 201]:
                        requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                            "chat_id": chat_id,
                            "text": f"🎉 BOOM! '{parsed['title']}' was pinned to the live map at {loc_name}!\n\n🌐 Check it out: https://cbiteventfinder.web.app/"
                        })
                        print(f"✅ Auto-posted from Telegram: {parsed['title']}")
                    else:
                        requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                            "chat_id": chat_id,
                            "text": f"❌ Firestore error: {resp.text}"
                        })
                elif parsed.get("api_error"):
                    requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": f"⚠️ Gemini API Notice: {parsed.get('api_error')}"
                    })
                else:
                    requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": "🤔 The AI couldn't detect event details on this photo. Make sure the poster shows the event name, date, or venue!"
                    })

        except Exception as e:
            print(f"Telegram polling loop note: {e}")
            time.sleep(3)

if __name__ == "__main__":
    run_live_bot()
