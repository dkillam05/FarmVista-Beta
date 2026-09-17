from pathlib import Path
import subprocess

ROOT = Path('.')

# Canonical destinations for every loose Grain JavaScript module.
def destination(name: str) -> str:
    if name.startswith('grain-contract'):
        return f'js/grain/contracts/{name}'
    if name.startswith('grain-hauling'):
        return f'js/grain/hauling-jobs/{name}'
    if name.startswith('grain-loadout'):
        return f'js/grain/load-out/{name}'
    if name.startswith('grain-inventory'):
        return f'js/grain/inventory/{name}'
    if name.startswith('grain-index'):
        return f'js/grain/shared/{name}'
    if name.startswith('grain-ticket-detail'):
        return f'js/grain/tickets/detail/{name}'
    if name.startswith('grain-ticket-image'):
        return f'js/grain/tickets/image/{name}'
    if name.startswith('grain-ticket-ocr') or name.startswith('grain-ticket-adm'):
        return f'js/grain/scanning/ocr/{name}'
    if name.startswith('grain-ticket-scan') or name.startswith('grain-ticket-ios'):
        return f'js/grain/scanning/capture/{name}'
    if name.startswith('grain-ticket'):
        return f'js/grain/tickets/{name}'
    if name in {'grain-capacity.js','grain-source-ui-consistency.js','grain-manual-close.js','grain-mobile-dnd-autoscroll.js','grain-mobile-dnd-autoscroll-core.js','grain-transfers.js'}:
        return f'js/grain/shared/{name}'
    return f'js/grain/shared/{name}'

moves = {}
for src in sorted((ROOT/'js').glob('grain-*.js')):
    moves[src.as_posix()] = destination(src.name)

# Move the existing ticket-template directory intact under Grain templates.
template_src = ROOT/'js/grain-ticket-templates'
template_dst = ROOT/'js/grain/templates/tickets'
if template_src.exists():
    template_dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['git','mv',template_src.as_posix(),template_dst.as_posix()], check=True)

for old, new in moves.items():
    src, dst = ROOT/old, ROOT/new
    if not src.exists():
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        raise SystemExit(f'Destination already exists: {new}')
    subprocess.run(['git','mv',src.as_posix(),dst.as_posix()], check=True)

# Rewrite all textual references to moved modules while preserving load order.
text_suffixes = {'.html','.js','.mjs','.json','.webmanifest','.yml','.yaml','.md','.py','.css'}
replacements = list(moves.items())
replacements.append(('js/grain-ticket-templates/', 'js/grain/templates/tickets/'))
replacements.append(('/grain-ticket-templates/', '/grain/templates/tickets/'))

for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts or path.suffix.lower() not in text_suffixes:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    updated = text
    for old, new in replacements:
        updated = updated.replace(old, new)
        updated = updated.replace('/' + old, '/' + new)
    if updated != text:
        path.write_text(updated, encoding='utf-8')

# Remove placeholder files where real modules now occupy the folders.
for keep in (ROOT/'js/grain').rglob('.gitkeep'):
    try:
        keep.unlink()
    except FileNotFoundError:
        pass

# Hard verification: no loose Grain JS files and no old template directory.
loose = sorted(p.as_posix() for p in (ROOT/'js').glob('grain-*.js'))
if loose:
    raise SystemExit('Loose Grain modules remain:\n' + '\n'.join(loose))
if template_src.exists():
    raise SystemExit('Old grain-ticket-templates directory still exists')

# Verify old path references no longer exist outside migration tooling/history docs.
stale = []
for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts or path.suffix.lower() not in text_suffixes:
        continue
    if path.as_posix().endswith('reorganize-grain-js.py'):
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    for old in moves:
        if old in text or ('/' + old) in text:
            stale.append(f'{path}: {old}')
    if 'js/grain-ticket-templates/' in text:
        stale.append(f'{path}: js/grain-ticket-templates/')
if stale:
    raise SystemExit('Stale Grain references remain:\n' + '\n'.join(stale[:100]))

print(f'Reorganized {len(moves)} loose Grain modules and template directory; references verified.')
