from pathlib import Path
import subprocess

ROOT = Path('.')

moves = {
    'js/fv-yield-math.js': 'js/calculators/fv-yield-math.js',
    'js/trials-mh-yield-helper.js': 'js/calculators/trials-mh-yield-helper.js',
}

for old, new in moves.items():
    src, dst = ROOT / old, ROOT / new
    if not src.exists():
        raise SystemExit(f'Missing source: {old}')
    if dst.exists():
        raise SystemExit(f'Destination exists: {new}')
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['git', 'mv', src.as_posix(), dst.as_posix()], check=True)

suffixes = {'.html', '.js', '.mjs', '.json', '.webmanifest', '.md', '.css'}
for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts or '.github' in path.parts or path.suffix.lower() not in suffixes:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    updated = text
    for old, new in moves.items():
        updated = updated.replace('/' + old, '/' + new).replace(old, new)
    if updated != text:
        path.write_text(updated, encoding='utf-8')

stale = []
for old in moves:
    if (ROOT / old).exists():
        stale.append(old)
for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts or '.github' in path.parts or path.suffix.lower() not in suffixes:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    for old in moves:
        if old in text:
            stale.append(f'{path}: {old}')
if stale:
    raise SystemExit('Stale yield helper paths remain:\n' + '\n'.join(stale[:100]))

print('Moved yield math and multi-hybrid yield helper into calculators and updated every application reference.')
