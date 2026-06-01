import urllib.request, time, re
url = 'https://stats.tennismylife.org/players/jannik-sinner/clay'
mobile_ua = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.204 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
req = urllib.request.Request(url, headers={'User-Agent': mobile_ua})
t0 = time.time()
try:
    res = urllib.request.urlopen(req, timeout=60)
    elapsed = round(time.time()-t0,2)
    print('STATUS:', res.status)
    print('FINAL URL:', res.geturl())
    print('TIME:', elapsed, 's')
    for h in ['x-robots-tag','cache-control','content-type','x-nextjs-cache']:
        v = res.headers.get(h)
        if v: print(h+':', v)
    text = res.read(8000).decode('utf-8','replace')
    print('BYTES READ:', len(text))
    m = re.search(r'<title[^>]*>(.*?)</title>', text, re.I|re.S)
    print('TITLE:', m.group(1)[:120] if m else 'NOT FOUND in first 8000 bytes')
    for kw in ['No matches found','Player not found','noindex','nofollow','Not found','Soft 404','0-0','no results']:
        if kw.lower() in text.lower():
            print('FOUND KEYWORD:', kw)
    c = re.findall(r'<link[^>]+canonical[^>]*>', text, re.I)
    print('CANONICAL TAGS:', c[:3])
except Exception as e:
    print('ERROR after', round(time.time()-t0,2), 's:', e)
