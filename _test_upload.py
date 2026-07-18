import requests, json, time

# Login
r = requests.post('http://localhost:8000/api/v1/auth/login',
    data={'username':'admin@procureiq.ai','password':'Admin@123!'})
tok = r.json()['access_token']
H = {'Authorization': f'Bearer {tok}'}
print('Login OK')

# Check dataset-status before
r0 = requests.get('http://localhost:8000/api/v1/ide/dataset-status', headers=H)
print('BEFORE upload:', json.dumps(r0.json(), indent=2))

# Upload
with open('test_upload.xlsx','rb') as f:
    r2 = requests.post('http://localhost:8000/api/v1/ide/upload-dataset',
        headers=H, files={'file': ('test_upload.xlsx', f,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')})
print('Upload HTTP status:', r2.status_code)
print('Upload response:', json.dumps(r2.json(), indent=2))

if r2.status_code != 200:
    print('UPLOAD FAILED - stopping')
    exit(1)

ing_id = r2.json()['ingestion_id']

# Poll for completion
for i in range(30):
    time.sleep(2)
    r3 = requests.get(f'http://localhost:8000/api/v1/ide/status/{ing_id}', headers=H)
    d = r3.json()
    st = d['status']
    hs = d.get('health_score')
    print(f'  [{i+1}] status={st} health_score={hs}')
    if st in ('completed', 'failed', 'partial'):
        if st == 'failed':
            print('PIPELINE FAILED:', d.get('error_message'))
        else:
            an = d.get('analysis') or {}
            print('Sheets loaded:', an.get('sheets_loaded'))
            print('Corrections:', len(d.get('correction_report', [])))
        break

# Check dataset-status after
time.sleep(1)
r4 = requests.get('http://localhost:8000/api/v1/ide/dataset-status', headers=H)
print('\nAFTER upload:', json.dumps(r4.json(), indent=2))

# Check spend KPIs
r5 = requests.get('http://localhost:8000/api/v1/spend/summary', headers=H)
print('\nSpend KPIs:', json.dumps(r5.json(), indent=2))
