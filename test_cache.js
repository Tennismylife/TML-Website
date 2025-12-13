// test-cache.js
import fetch from "node-fetch";

const URLS = [
  "https://stats.tennismylife.org/tournaments/580",
  "https://stats.tennismylife.org/players/C044?tab=matches"
];

async function testCache() {
  for (const URL of URLS) {
    console.log(`\n=== Testing URL: ${URL} ===`);
    
    for (let i = 1; i <= 10; i++) {
      const start = Date.now();

      try {
        const res = await fetch(URL, {
          method: "GET",
          headers: {
            "User-Agent": "CacheTestBot/1.0"
          }
        });

        const time = Date.now() - start;
        const xCache = res.headers.get("x-cache") || "NO-HEADER";

        console.log(
          `#${i} ? Status: ${res.status} | X-Cache: ${xCache} | Time: ${time}ms`
        );
      } catch (err) {
        console.error(`#${i} ? Errore:`, err);
      }

      // Piccola pausa per non sovraccaricare il server
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

testCache();
