from pathlib import Path
import subprocess

ROOT = Path('.')

moves = {
    # Reusable UI controls/components
    'js/fv-combo.js': 'js/shared/components/fv-combo.js',
    'js/fv-date-range-picker.js': 'js/shared/components/fv-date-range-picker.js',
    'js/fv-dictation.js': 'js/shared/components/fv-dictation.js',
    'js/fv-form-button.js': 'js/shared/components/fv-form-button.js',
    'js/fv-hero-card.js': 'js/shared/components/fv-hero-card.js',
    'js/fv-hero.js': 'js/shared/components/fv-hero.js',
    'js/fv-perms-hero.js': 'js/shared/components/fv-perms-hero.js',
    'js/fv-swipe-list.js': 'js/shared/components/fv-swipe-list.js',

    # Shared app services/data helpers
    'js/fv-auto-update.js': 'js/shared/services/fv-auto-update.js',
    'js/fv-data.js': 'js/shared/services/fv-data.js',

    # General reusable utilities
    'js/fv-map.js': 'js/shared/utils/fv-map.js',
    'js/fv-pdf.js': 'js/shared/utils/fv-pdf.js',

    # Application shell belongs to app infrastructure, not a generic helper bucket
    'js/fv-shell.js': 'js/app/fv-shell.js',
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
    raise SystemExit('Stale shared/app JavaScript paths remain:\n' + '\n'.join(stale[:100]))

print('Organized reusable UI, services, utilities, and app shell JavaScript and updated every application reference.')
