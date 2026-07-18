import httpx, json, time, sys

base = "http://localhost:8000/api/v1"

# Login
r = httpx.post(f"{base}/auth/login",
    data={"username":"admin@procureiq.ai","password":"Admin@123!"})
tok = r.json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}
print("Login OK")

# Dataset status BEFORE
r0 = httpx.get(f"{base}/ide/dataset-status", headers=H)
d0 = r0.json()
print(f"BEFORE: has_dataset={d0['has_dataset']}  spend_txns={d0['record_counts']['spend_transactions']}")

# Upload
with open("test_upload.xlsx","rb") as f:
    r2 = httpx.post(f"{base}/ide/upload-dataset", headers=H,
        files={"file": ("test_upload.xlsx", f,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        timeout=30)
print(f"Upload HTTP {r2.status_code}")
print(json.dumps(r2.json(), indent=2))
if r2.status_code != 200:
    sys.exit(1)

ing_id = r2.json()["ingestion_id"]

# Poll
for i in range(30):
    time.sleep(2)
    r3 = httpx.get(f"{base}/ide/status/{ing_id}", headers=H)
    d = r3.json()
    print(f"  [{i+1}] status={d['status']}  health={d.get('health_score')}")
    if d["status"] in ("completed","failed","partial"):
        if d["status"] == "failed":
            print("PIPELINE ERROR:", d.get("error_message"))
            cr = d.get("correction_report") or []
            for c in cr: print("  -", c)
        else:
            an = d.get("analysis") or {}
            print("  sheets_loaded:", an.get("sheets_loaded"))
            cr = d.get("correction_report") or []
            for c in cr[-5:]: print("  -", c.get("description"))
        break

# Dataset status AFTER
r4 = httpx.get(f"{base}/ide/dataset-status", headers=H)
d4 = r4.json()
print(f"\nAFTER: has_dataset={d4['has_dataset']}")
print(f"  sheets_loaded={d4['sheets_loaded']}")
print(f"  record_counts={json.dumps(d4['record_counts'])}")

# Spend KPIs
r5 = httpx.get(f"{base}/spend/summary", headers=H)
print(f"\nSpend KPIs: {json.dumps(r5.json(), indent=2)}")
