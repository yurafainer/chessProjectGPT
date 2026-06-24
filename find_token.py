from pathlib import Path

root = Path('.')
secret = 'ghp_'
found = False
for path in root.rglob('*'):
    if path.is_file() and path.name not in ('find_token.py',):
        try:
            text = path.read_text(errors='ignore')
        except Exception:
            continue
        if secret in text:
            print('FOUND in', path)
            found = True
            break
if not found:
    print('NONE')
