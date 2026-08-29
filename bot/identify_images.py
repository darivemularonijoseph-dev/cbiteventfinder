import os
import json
from google import genai
from google.genai import types

MEDIA_DIR = r"C:\Users\Roni joseph\.gemini\antigravity\brain\5645167e-ce6d-4594-86f2-c5e58d1146bd\.user_uploaded"

client = genai.Client()

for filename in os.listdir(MEDIA_DIR):
    if filename.endswith(".png") or filename.endswith(".jpg"):
        path = os.path.join(MEDIA_DIR, filename)
        with open(path, "rb") as f:
            data = f.read()
        try:
            resp = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    types.Part.from_bytes(data=data, mime_type="image/png"),
                    "Describe this image briefly in one sentence. If it contains text like 'Kabaddi' or 'National Sports Day', say so explicitly."
                ]
            )
            print(f"{filename}: {resp.text.strip()}")
        except Exception as e:
            print(f"Error on {filename}: {e}")
