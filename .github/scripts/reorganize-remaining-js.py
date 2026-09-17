from pathlib import Path
import subprocess

ROOT = Path('.')

moves = {
    # FarmVista application foundation
    'js/core.js': 'js/app/core.js',
    'js/theme-boot.js': 'js/app/theme-boot.js',
    'js/version.js': 'js/app/version.js',

    # Firebase infrastructure
    'js/firebase-config.js': 'js/firebase/firebase-config.js',
    'js/firebase-init.js': 'js/firebase/firebase-init.js',

    # Navigation and menu access control
    'js/menu.js': 'js/navigation/menu.js',
    'js/menu-acl.js': 'js/navigation/menu-acl.js',

    # Shared permissions UI
    'js/perm-ui.js': 'js/permissions/perm-ui.js',
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
    raise SystemExit('Stale final root JavaScript paths remain:\n' + '\n'.join(stale[:100]))

print('Organized final root JavaScript infrastructure and updated every application reference.')
