import httpx, json

base = "http://localhost:8000/api/v1"
r = httpx.post(f"{base}/auth/login",
    data={"username":"admin@procureiq.ai","password":"Admin@123!"})
H = {"Authorization": f"Bearer {r.json()['access_token']}"}

d = httpx.get(f"{base}/ide/dataset-status", headers=H).json()
print("has_dataset:", d["has_dataset"])
print("sheets_loaded:", d["sheets_loaded"])
print("record_counts:", json.dumps(d["record_counts"]))
print("last_filename:", d.get("last_filename"))
print("last_health_score:", d.get("last_health_score"))

k = httpx.get(f"{base}/spend/summary", headers=H).json()
print("\nSpend KPIs:")
for key, val in k.items():
    print(f"  {key}: {val}")
