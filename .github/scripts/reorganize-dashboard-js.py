from pathlib import Path

ROOT = Path('.')
MOVES = {
    'js/dash-weather-modal.js': 'js/dashboard/weather/modal.js',
    'js/dash-markets-style.js': 'js/dashboard/markets/style.js',
    'js/dash-markets-chart.js': 'js/dashboard/markets/chart.js',
    'js/dash-markets-series.js': 'js/dashboard/markets/series.js',
    'js/dash-markets-quotes.js': 'js/dashboard/markets/quotes.js',
    'js/dash-markets-ui.js': 'js/dashboard/markets/ui.js',
    'js/dash-perms.js': 'js/dashboard/permissions.js',
    'js/dash-message-board.js': 'js/dashboard/message-board.js',
    'js/dash-kpi-wo.js': 'js/dashboard/kpi/work-orders.js',
    'js/dash-kpi-boundary.js': 'js/dashboard/kpi/boundaries.js',
    'js/dash-kpi-bags.js': 'js/dashboard/kpi/grain-bags.js',
    'js/dash-kpi-dynamic.js': 'js/dashboard/kpi/dynamic.js',
}

# Move first so there is exactly one canonical copy of each module.
for old, new in MOVES.items():
    src = ROOT / old
    dst = ROOT / new
    if not src.exists():
        raise SystemExit(f'Missing expected source: {old}')
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        raise SystemExit(f'Destination already exists: {new}')
    src.rename(dst)

# Rewrite every textual reference, including HTML, JS, service-worker manifests,
# and developer tooling. This keeps the move atomic from the app's perspective.
text_suffixes = {'.html', '.js', '.mjs', '.json', '.webmanifest', '.yml', '.yaml', '.md', '.py', '.css'}
for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in text_suffixes:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    updated = text
    for old, new in MOVES.items():
        # Handles root-relative, relative, comments, cache lists, and import strings.
        updated = updated.replace(old, new)
    if updated != text:
        path.write_text(updated, encoding='utf-8')

# Verify no stale application references or old files remain.
errors = []
for old, new in MOVES.items():
    if (ROOT / old).exists():
        errors.append(f'Old file still exists: {old}')
    if not (ROOT / new).exists():
        errors.append(f'New file missing: {new}')

for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in text_suffixes:
        continue
    if path.as_posix().endswith('reorganize-dashboard-js.py'):
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    for old in MOVES:
        if old in text:
            errors.append(f'Stale reference {old} in {path.as_posix()}')

if errors:
    raise SystemExit('\n'.join(errors))

print(f'Reorganized {len(MOVES)} dashboard modules and verified references.')
