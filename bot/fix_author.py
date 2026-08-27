import requests

FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/cbiteventfinder/databases/(default)/documents/events"
r = requests.get(FIRESTORE_URL).json()

for doc in r.get('documents', []):
    fields = doc.get('fields', {})
    title = fields.get('title', {}).get('stringValue', '')
    club = fields.get('clubName', {}).get('stringValue', '')
    
    # If the club is "None" or "Rmc", the user probably uploaded it manually
    if not club or club == "None" or club.lower() == "rmc":
        print(f"Fixing manual event: {title}")
        doc_name = doc.get('name')
        patch_url = f"https://firestore.googleapis.com/v1/{doc_name}?updateMask.fieldPaths=authorName"
        update_data = {
            "fields": {
                "authorName": {"stringValue": "CBIT Student (Manual Upload)"}
            }
        }
        requests.patch(patch_url, json=update_data)
        
print("Finished fixing manual events!")
