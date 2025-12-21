#!/bin/bash
# test_cache.sh — verifica cache Redis + SSR Next.js (Opzione A)

REDIS_CLI="redis-cli"
BASE_URL="http://localhost:3000"

# =============================
# URL da testare
# =============================
API_URLS=(
  "/api/matches/latest"
  "/api/tournaments"
  "/api/tournaments/580"
  "/api/tournaments/580/header"
)
PAGE_URLS=(
  "/tournaments/580"
  "/about"
)
HOMEPAGE="/"
ASSETS=(
  "/UnderCostruction.png"
)

# =============================
# Funzioni
# =============================
check_api() {
  local url=$1
  echo "🟢 Test API: $url"
  curl -s -I "$BASE_URL$url" | grep -E "X-Cache"
}

check_page() {
  local url=$1
  echo "🟢 Test PAGE: $url"
  headers=$(curl -s -I "$BASE_URL$url" | grep -E "X-Cache|X-SSR-COMPLETE")
  echo "$headers"
  # Controllo __NEXT_DATA__
  content=$(curl -s "$BASE_URL$url")
  if [[ "$content" == *"__NEXT_DATA__"* ]]; then
    echo "✅ __NEXT_DATA__ presente"
  else
    echo "⚠️ HTML incompleto / minimal"
  fi
}

check_homepage() {
  echo "🟢 Test HOMEPAGE: $HOMEPAGE"
  headers=$(curl -s -I "$BASE_URL$HOMEPAGE" | grep -E "X-Cache|X-SSR-COMPLETE")
  echo "$headers"
  [[ "$headers" == *"UNCACHED"* ]] && echo "✅ Homepage non cachata"
}

check_assets() {
  local url=$1
  echo "🟢 Test ASSET: $url"
  headers=$(curl -s -I "$BASE_URL$url" | grep -E "X-Cache")
  echo "$headers"
  [[ "$headers" == *"UNCACHED"* ]] && echo "✅ Asset non cachato"
}

# =============================
# Pulizia Redis (opzionale)
# =============================
echo "🟡 Pulizia cache Redis test"
for key in $($REDIS_CLI KEYS "tennismylife:*"); do
  $REDIS_CLI DEL "$key"
done

# =============================
# TEST API
# =============================
echo "===================="
echo "📌 TEST API"
echo "===================="
for url in "${API_URLS[@]}"; do
  check_api "$url"
done

# =============================
# TEST PAGES
# =============================
echo "===================="
echo "📌 TEST PAGES"
echo "===================="
for url in "${PAGE_URLS[@]}"; do
  check_page "$url"
done

# =============================
# TEST HOMEPAGE
# =============================
echo "===================="
echo "📌 TEST HOMEPAGE"
echo "===================="
check_homepage

# =============================
# TEST ASSETS
# =============================
echo "===================="
echo "📌 TEST ASSETS"
echo "===================="
for url in "${ASSETS[@]}"; do
  check_assets "$url"
done

echo "===================="
echo "✅ TEST COMPLETATI"
echo "===================="
