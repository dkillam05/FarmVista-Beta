# Triggered 2026-09-17
from pathlib import Path
import subprocess

ROOT = Path('.')
JS = ROOT / 'js'

dir_moves = {'js/rainfallmap': 'js/field-readiness/rainfall-map'}
for old, new in dir_moves.items():
    src, dst = ROOT/old, ROOT/new
    if src.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists(): raise SystemExit(f'Destination already exists: {new}')
        subprocess.run(['git','mv',src.as_posix(),dst.as_posix()], check=True)

def destination(name: str) -> str:
    n = name.lower()
    if n.startswith('field-readiness'): return f'js/field-readiness/{name}'
    if n.startswith('rainfall'): return f'js/field-readiness/rainfall-map/{name}'
    if n.startswith('equipment'): return f'js/equipment/{name}'
    if n.startswith('report') or n.startswith('ai-report'): return f'js/reports/{name}'
    if n.startswith('calc') or 'calculator' in n: return f'js/calculators/{name}'
    if n.startswith(('office','employee','vendor','subcontractor','team')): return f'js/office/{name}'
    if n.startswith(('load','logistics','dispatch','boundary-drive')): return f'js/logistics/{name}'
    return ''

moves = {}
for src in sorted(JS.glob('*.js')):
    dst = destination(src.name)
    if dst: moves[src.as_posix()] = dst
for old,new in moves.items():
    src,dst=ROOT/old,ROOT/new
    dst.parent.mkdir(parents=True,exist_ok=True)
    if dst.exists(): raise SystemExit(f'Destination already exists: {new}')
    subprocess.run(['git','mv',src.as_posix(),dst.as_posix()],check=True)

text_suffixes={'.html','.js','.mjs','.json','.webmanifest','.md','.css'}
replacements=list(moves.items())+[(old+'/',new+'/') for old,new in dir_moves.items()]
for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts or '.github' in path.parts or path.suffix.lower() not in text_suffixes: continue
    try: text=path.read_text(encoding='utf-8')
    except UnicodeDecodeError: continue
    updated=text
    for old,new in replacements: updated=updated.replace('/'+old,'/'+new).replace(old,new)
    if updated!=text: path.write_text(updated,encoding='utf-8')

for folder in ['field-readiness','office','reports','calculators','equipment','logistics']:
    p=JS/folder/'.gitkeep'
    if p.exists(): p.unlink()

stale=[]
for old in moves:
    if (ROOT/old).exists(): stale.append(old)
for old in dir_moves:
    if (ROOT/old).exists(): stale.append(old)
for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts or '.github' in path.parts or path.suffix.lower() not in text_suffixes: continue
    try: text=path.read_text(encoding='utf-8')
    except UnicodeDecodeError: continue
    for old,_ in replacements:
        if old in text or ('/'+old) in text: stale.append(f'{path}: {old}')
if stale: raise SystemExit('Stale paths remain:\n'+'\n'.join(stale[:100]))
print(f'Moved {len(moves)} loose JS modules plus rainfall map directory; references verified.')
