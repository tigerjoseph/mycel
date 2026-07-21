#!/usr/bin/env bash
# Quick smoke test for the Mycel Saver local API (same contract as the Chrome extension).
set -euo pipefail

PORT=17321
BASE="http://127.0.0.1:${PORT}"

echo "→ GET /health"
HEALTH=$(curl -sf "${BASE}/health") || {
  echo "✗ Mycel is not running or library server is down on port ${PORT}"
  echo "  Launch Mycel first, then re-run this script."
  exit 1
}

TOKEN=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "✓ Connected (token ${#TOKEN} chars)"

echo "→ POST /save (unauthorized)"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/save" \
  -H "Authorization: Bearer invalid" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/unauth"}')
[[ "$CODE" == "401" ]] || { echo "✗ Expected 401, got $CODE"; exit 1; }
echo "✓ Rejects bad token"

echo "→ POST /save"
RESP=$(curl -sf -X POST "${BASE}/save" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com/extension-smoke-$(date +%s)\",\"title\":\"Extension API smoke test\",\"source\":\"web\",\"mediaType\":\"page\",\"tags\":[\"smoke-test\"]}")

ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['item']['id'])")
echo "✓ Saved item ${ID}"
echo ""
echo "Open Mycel → Library → Mindspace to confirm the item appears."
