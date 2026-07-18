import ast, sys
files = [
    'app/api/v1/auth.py',
    'app/api/v1/settings.py',
    'app/services/email_service.py',
    'app/config.py',
    'app/db/seed.py',
]
ok = True
for f in files:
    try:
        ast.parse(open(f).read())
        print(f'OK  {f}')
    except SyntaxError as e:
        print(f'ERR {f}: {e}')
        ok = False
sys.exit(0 if ok else 1)
