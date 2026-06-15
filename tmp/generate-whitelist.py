from pathlib import Path
import re

p = Path('lib/seo/records-policy.ts')
text = p.read_text(encoding='utf-8')
start = text.index('const WHITELIST_RAW: WhitelistEntry[] = [')
end = text.index('];', start)
entries_text = text[start:end]
lines = entries_text.splitlines()
entries=[]
brace=0
cur=[]
for line in lines:
    if '{' in line:
        brace += line.count('{')
    if brace>0:
        cur.append(line)
    if '}' in line and brace>0:
        brace -= line.count('}')
        if brace==0 and cur:
            entries.append('\n'.join(cur))
            cur=[]


def title_to_slug(title):
    trimmed = title.split('–')[0].strip()
    normalized = re.sub(r'\bmatch\s+wins\b','wins', trimmed, flags=re.I)
    normalized = re.sub(r'\bmatch\s+win\b','win', normalized, flags=re.I)
    slug = re.sub(r'[^\w\s-]','', normalized.lower())
    slug = re.sub(r'\s+','-', slug)
    slug = re.sub(r'-+','-', slug)
    slug = re.sub(r'^-|-$','', slug)
    return '/records/' + slug


def parse_entry(obj):
    slug_m = re.search(r"slug\s*:\s*\[([^\]]*)\]", obj)
    slug=[s.strip().strip("'\"") for s in slug_m.group(1).split(',') if s.strip()] if slug_m else []
    filters={}
    filters_m=re.search(r"filters\s*:\s*\{([^\}]*)\}", obj, re.S)
    if filters_m:
        fbody=filters_m.group(1)
        for line in fbody.split(','):
            line=line.strip()
            if not line or ':' not in line: continue
            k,v=line.split(':',1); k=k.strip(); v=v.strip()
            if v.startswith('['):
                arr=re.findall(r"'([^']*)'|\"([^\"]*)\"", v)
                filters[k]=[a[0] or a[1] for a in arr]
            elif v.startswith("'") or v.startswith('"'):
                filters[k]=v.strip("'\"")
            else:
                try: filters[k]=int(v)
                except ValueError: filters[k]=v
    title_m=re.search(r"title\s*:\s*'([^']*)'", obj)
    title=title_m.group(1) if title_m else None
    canonical_m=re.search(r"canonicalPath\s*:\s*'([^']*)'", obj)
    canonical=canonical_m.group(1) if canonical_m else None
    if canonical: path=canonical
    elif title: path=title_to_slug(title)
    else:
        qs=[]
        if 'level' in filters:
            vals=[v.upper() for v in filters['level']]
            for val in sorted(vals): qs.append(f'level={val}')
        if 'surface' in filters:
            vals=[v.capitalize() for v in filters['surface']]
            for val in sorted(vals): qs.append(f'surface={val}')
        if 'round' in filters:
            qs.append(f"round={filters['round'].upper()}")
        if 'bestOf' in filters:
            qs.append(f"bestOf={filters['bestOf']}")
        if 'subtab' in filters:
            qs.append(f"subtab={filters['subtab'].lower()}")
        path='/records/' + '/'.join(slug)
        if qs: path += '?' + '&'.join(qs)
    return {
        'slug': slug,
        'filters': filters,
        'title': title,
        'canonicalPath': canonical,
        'path': path,
        'raw': obj,
    }

parsed=[parse_entry(obj) for obj in entries]
canon_to_entry={p['path']: p for p in parsed}

user_paths=[
'/records/most-career-wins',
'/records/most-wins-on-hard-court',
'/records/most-wins-on-clay-court',
'/records/most-wins-on-grass-court',
'/records/most-wins-on-carpet-court',
'/records/most-grand-slam-wins',
'/records/most-masters-1000-wins',
'/records/most-wins-in-atp-finals',
'/records/most-atp-250-wins',
'/records/most-atp-500-wins',
'/records/most-davis-cup-wins',
'/records/most-wins-best-of-3',
'/records/most-wins-best-of-5',
'/records/most-matches-played',
'/records/most-matches-played-on-hard-court',
'/records/most-matches-played-on-clay-court',
'/records/most-matches-played-on-grass-court',
'/records/most-matches-played-on-carpet-court',
'/records/most-grand-slam-matches-played',
'/records/most-matches-played-at-masters-1000',
'/records/most-matches-played-at-atp-finals',
'/records/most-atp-250-matches-played',
'/records/most-atp-500-matches-played',
'/records/most-davis-cup-matches-played',
'/records/most-matches-played-best-of-3',
'/records/most-matches-played-best-of-5',
'/records/most-finals-reached',
'/records/most-semifinals-reached',
'/records/most-quarterfinals-reached',
'/records/most-grand-slam-finals-reached',
'/records/most-grand-slam-semifinals-reached',
'/records/most-grand-slam-quarterfinals-reached',
'/records/most-masters-1000-quarterfinals-reached',
'/records/most-masters-1000-semifinals-reached',
'/records/most-masters-1000-finals-reached',
'/records/most-atp-250-finals-reached',
'/records/most-atp-250-semifinals-reached',
'/records/most-atp-250-quarterfinals-reached',
'/records/most-atp-500-quarterfinals-reached',
'/records/most-atp-500-semifinals-reached',
'/records/most-atp-500-finals-reached',
'/records/most-hard-court-finals-reached',
'/records/most-clay-court-finals-reached',
'/records/most-grass-court-finals-reached',
'/records/most-carpet-court-finals-reached',
'/records/most-hard-court-semifinals-reached',
'/records/most-clay-court-semifinals-reached',
'/records/most-grass-court-semifinals-reached',
'/records/most-carpet-court-semifinals-reached',
'/records/most-hard-court-quarterfinals-reached',
'/records/most-clay-court-quarterfinals-reached',
'/records/most-grass-court-quarterfinals-reached',
'/records/most-carpet-court-quarterfinals-reached',
'/records/most-atp-titles',
'/records/most-titles-won-on-hard-court',
'/records/most-titles-won-on-clay',
'/records/most-titles-won-on-grass',
'/records/most-titles-won-on-carpet',
'/records/most-grand-slam-titles',
'/records/most-masters-1000-titles',
'/records/most-atp-finals-titles',
'/records/most-atp-250-titles',
'/records/most-atp-500-titles',
'/records/most-appearances',
'/records/most-appearances-on-hard-court',
'/records/most-appearances-on-clay-court',
'/records/most-appearances-on-grass-court',
'/records/most-appearances-on-carpet-court',
'/records/most-grand-slam-appearances',
'/records/most-masters-1000-appearances',
'/records/most-atp-finals-appearances',
'/records/most-atp-250-appearances',
'/records/most-atp-500-appearances',
'/records/oldest-players-in-main-draw',
'/records/oldest-players-in-main-draw-on-hard-court',
'/records/oldest-players-in-main-draw-on-clay-court',
'/records/oldest-players-in-main-draw-on-grass-court',
'/records/oldest-players-in-main-draw-on-carpet-court',
'/records/oldest-players-in-main-draw-at-grand-slam',
'/records/oldest-players-in-main-draw-at-masters-1000',
'/records/oldest-players-in-main-draw-at-atp-finals',
'/records/oldest-players-in-main-draw-at-atp-250',
'/records/oldest-players-in-main-draw-at-atp-500',
'/records/oldest-grand-slam-finalists',
'/records/oldest-grand-slam-semifinalists',
'/records/oldest-grand-slam-quarterfinalists',
'/records/oldest-masters-1000-finalists',
'/records/oldest-masters-1000-semifinalists',
'/records/oldest-masters-1000-quarterfinalists',
'/records/youngest-players-in-main-draw',
'/records/youngest-players-in-main-draw-on-hard-court',
'/records/youngest-players-in-main-draw-on-clay-court',
'/records/youngest-players-in-main-draw-on-grass-court',
'/records/youngest-players-in-main-draw-on-carpet-court',
'/records/youngest-players-in-main-draw-at-grand-slam',
'/records/youngest-players-in-main-draw-at-masters-1000',
'/records/youngest-players-in-main-draw-at-atp-finals',
'/records/youngest-players-in-main-draw-at-atp-250',
'/records/youngest-players-in-main-draw-at-atp-500',
'/records/youngest-grand-slam-finalists',
'/records/youngest-grand-slam-semifinalists',
'/records/youngest-grand-slam-quarterfinalists',
'/records/youngest-masters-1000-finalists',
'/records/youngest-masters-1000-semifinalists',
'/records/youngest-masters-1000-quarterfinalists',
'/records/oldest-title-winners',
'/records/oldest-hard-court-title-winners',
'/records/oldest-clay-court-title-winners',
'/records/oldest-grass-court-title-winners',
'/records/oldest-carpet-court-title-winners',
'/records/oldest-grand-slam-title-winners',
'/records/oldest-masters-1000-title-winners',
'/records/oldest-atp-finals-title-winners',
'/records/oldest-atp-250-title-winners',
'/records/oldest-atp-500-title-winners',
'/records/youngest-title-winners',
'/records/youngest-hard-court-title-winners',
'/records/youngest-clay-court-title-winners',
'/records/youngest-grass-court-title-winners',
'/records/youngest-carpet-court-title-winners',
'/records/youngest-grand-slam-title-winners',
'/records/youngest-masters-1000-title-winners',
'/records/youngest-atp-finals-title-winners',
'/records/youngest-atp-250-title-winners',
'/records/youngest-atp-500-title-winners',
'/records/longest-appearance-timespan',
'/records/longest-hard-court-appearance-timespan',
'/records/longest-clay-court-appearance-timespan',
'/records/longest-grass-court-appearance-timespan',
'/records/longest-carpet-court-appearance-timespan',
'/records/longest-appearance-timespan-at-grand-slam',
'/records/longest-appearance-timespan-at-masters-1000',
'/records/longest-appearance-timespan-at-atp-finals',
'/records/longest-appearance-timespan-at-atp-250',
'/records/longest-appearance-timespan-at-atp-500',
'/records/longest-timespan-between-two-finals',
'/records/longest-timespan-between-two-semifinals',
'/records/longest-timespan-between-two-quarterfinals',
'/records/best-winning-percentage',
'/records/best-win-percentage-on-hard-court',
'/records/best-win-percentage-on-clay-court',
'/records/best-win-percentage-on-grass-court',
'/records/best-win-percentage-on-carpet-court',
'/records/best-win-percentage-at-grand-slams',
'/records/best-win-percentage-at-masters-1000',
'/records/best-win-percentage-at-atp-250',
'/records/best-win-percentage-at-atp-500',
'/records/most-titles-per-appearance',
'/records/most-hard-court-titles-per-appearance',
'/records/most-clay-court-titles-per-appearance',
'/records/most-grass-court-titles-per-appearance',
'/records/most-carpet-court-titles-per-appearance',
'/records/most-grand-slam-titles-per-appearance',
'/records/most-masters-1000-titles-per-appearance',
'/records/most-atp-finals-titles-per-appearance',
'/records/most-atp-250-titles-per-appearance',
'/records/most-atp-500-titles-per-appearance',
'/records/finals-reached-per-appearance',
'/records/semifinals-reached-per-appearance',
'/records/quarterfinals-reached-per-appearance',
'/records/most-wins-at-single-tournament',
'/records/most-wins-at-single-hard-court-tournament',
'/records/most-wins-at-single-clay-court-tournament',
'/records/most-wins-at-single-grass-court-tournament',
'/records/most-wins-at-single-carpet-court-tournament',
'/records/most-wins-at-single-grand-slam-tournament',
'/records/most-wins-at-single-masters-1000-tournament',
'/records/most-wins-at-single-atp-250-tournament',
'/records/most-wins-at-single-atp-500-tournament',
'/records/most-matches-played-at-single-tournament',
'/records/most-matches-played-at-single-hard-court-tournament',
'/records/most-matches-played-at-single-clay-court-tournament',
'/records/most-matches-played-at-single-grass-court-tournament',
'/records/most-matches-played-at-single-carpet-court-tournament',
'/records/most-matches-played-at-single-grand-slam-tournament',
'/records/most-matches-played-at-single-masters-1000-tournament',
'/records/most-matches-played-at-single-atp-250-tournament',
'/records/most-matches-played-at-single-atp-500-tournament',
'/records/most-appearances-at-single-tournament',
'/records/most-appearances-at-single-hard-court-tournament',
'/records/most-appearances-at-single-clay-court-tournament',
'/records/most-appearances-at-single-grass-court-tournament',
'/records/most-appearances-at-single-carpet-court-tournament',
'/records/most-appearances-at-single-grand-slam-tournament',
'/records/most-appearances-at-single-masters-1000-tournament',
'/records/most-appearances-at-single-atp-250-tournament',
'/records/most-appearances-at-single-atp-500-tournament',
'/records/most-titles-at-single-tournament',
'/records/most-titles-at-single-hard-court-tournament',
'/records/most-titles-at-single-clay-court-tournament',
'/records/most-titles-at-single-grass-court-tournament',
'/records/most-titles-at-single-carpet-court-tournament',
'/records/most-titles-at-single-grand-slam-tournament',
'/records/most-titles-at-single-masters-1000-tournament',
'/records/most-titles-at-single-atp-finals-tournament',
'/records/most-titles-at-single-atp-250-tournament',
'/records/most-titles-at-single-atp-500-tournament',
'/records/most-finals-at-single-tournament',
'/records/most-semifinals-at-single-tournament',
'/records/most-quarterfinals-at-single-tournament',
'/records/most-finals-in-a-single-grand-slam-tournament',
'/records/most-semifinals-in-a-single-grand-slam-tournament',
'/records/most-quarterfinals-in-a-single-grand-slam-tournament',
'/records/most-finals-in-a-single-masters-1000-tournament',
'/records/most-semifinals-in-a-single-masters-1000-tournament',
'/records/most-quarterfinals-in-a-single-masters-1000-tournament',
'/records/most-wins-in-single-season',
'/records/most-hard-court-wins-in-a-single-season',
'/records/most-clay-court-wins-in-a-single-season',
'/records/most-grass-court-wins-in-a-single-season',
'/records/most-carpet-court-wins-in-a-single-season',
'/records/most-grand-slam-wins-in-a-single-season',
'/records/most-masters-1000-wins-in-a-single-season',
'/records/most-atp-250-wins-in-a-single-season',
'/records/most-atp-500-wins-in-a-single-season',
'/records/most-matches-played-in-a-single-season',
'/records/most-hard-court-matches-played-in-a-single-season',
'/records/most-clay-court-matches-played-in-a-single-season',
'/records/most-grass-court-matches-played-in-a-single-season',
'/records/most-carpet-court-matches-played-in-a-single-season',
'/records/most-grand-slam-matches-played-in-a-single-season',
'/records/most-masters-1000-matches-played-in-a-single-season',
'/records/most-atp-250-matches-played-in-a-single-season',
'/records/most-atp-500-matches-played-in-a-single-season',
'/records/most-titles-in-a-single-season',
'/records/most-hard-court-titles-in-a-single-season',
'/records/most-clay-court-titles-in-a-single-season',
'/records/most-grass-court-titles-in-a-single-season',
'/records/most-carpet-court-titles-in-a-single-season',
'/records/most-grand-slam-titles-in-a-single-season',
'/records/most-masters-1000-titles-in-a-single-season',
'/records/most-atp-250-titles-in-a-single-season',
'/records/most-atp-500-titles-in-a-single-season',
'/records/most-finals-in-a-single-season',
'/records/most-semifinals-in-a-single-season',
'/records/most-quarterfinals-in-a-single-season',
'/records/seasons/round?level=M&round=F',
'/records/seasons/round?level=M&round=SF',
'/records/most-masters-1000-quarterfinals-in-a-single-season',
'/records/best-win-percentage-in-single-season',
'/records/most-played-h2h',
'/records/longest-win-streak',
'/records/longest-winning-streak-on-hard-court',
'/records/longest-winning-streak-on-clay',
'/records/longest-winning-streak-on-grass',
'/records/longest-winning-streak-on-carpet',
'/records/longest-winning-streak-at-grand-slams',
'/records/longest-winning-streak-at-masters-1000',
'/records/longest-winning-streak-at-atp-finals',
'/records/longest-winning-streak-at-atp-250',
'/records/longest-winning-streak-at-atp-500',
'/records/longest-streak-of-consecutive-finals',
'/records/longest-streak-of-consecutive-semifinals',
'/records/longest-streak-of-consecutive-quarterfinals',
'/records/longest-streak-of-consecutive-grand-slam-finals',
'/records/longest-streak-of-consecutive-grand-slam-semifinals',
'/records/longest-streak-of-consecutive-grand-slam-quarterfinals',
'/records/longest-streak-of-consecutive-masters-1000-finals',
'/records/longest-streak-of-consecutive-masters-1000-semifinals',
'/records/longest-streak-of-consecutive-masters-1000-quarterfinals'
]
missing=[]
for path in user_paths:
    if path not in canon_to_entry:
        missing.append(path)
print('missing', len(missing))
for m in missing:
    print('MISSING', m)
