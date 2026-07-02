#!/usr/bin/env bash
set -u

pass() {
  echo "PASS: $1"
}

fail() {
  echo "FAIL: $1"
  exit 1
}

tmp_out() {
  mktemp
}

tmp_err() {
  mktemp
}

OUT=$(tmp_out)
ERR=$(tmp_err)

cleanup() {
  rm -f "$OUT" "$ERR"
}

trap cleanup EXIT

node client.js show abc >"$OUT" 2>"$ERR"
code=$?
[[ $code -eq 1 ]] || fail "show abc should exit 1"
grep -q 'Error: Invalid requestId "abc". requestId must be a positive integer.' "$ERR" || fail "show abc should print requestId validation error"
pass "show abc"

node client.js audit-log --request abc >"$OUT" 2>"$ERR"
code=$?
[[ $code -eq 1 ]] || fail "audit-log --request abc should exit 1"
grep -q 'Error: Invalid value for --request: "abc". Expected a positive integer.' "$ERR" || fail "audit-log invalid request should print validation error"
pass "audit-log invalid request"

node client.js recommendation 11 >"$OUT" 2>"$ERR"
code=$?
[[ $code -eq 0 ]] || fail "recommendation 11 should exit 0"
grep -q 'Recommendation for request 11: Buy 20 monitors' "$OUT" || fail "recommendation heading missing"
grep -q 'Status: needs manual review' "$OUT" || fail "recommendation status missing"
pass "recommendation 11"

node client.js audit-log --request 11 --action auto-approval-blocked >"$OUT" 2>"$ERR"
code=$?
[[ $code -eq 0 ]] || fail "filtered audit-log should exit 0"
grep -q 'auto-approval-blocked' "$OUT" || fail "filtered audit-log should include blocked action"
if grep -q 'approval-skipped' "$OUT"; then
  fail "filtered audit-log should not include approval-skipped"
fi
pass "audit-log action filter"

node client.js audit-log 2 --request 11 --action auto-approval-blocked --full >"$OUT" 2>"$ERR"
code=$?
[[ $code -eq 0 ]] || fail "filtered full audit-log should exit 0"
grep -q '"requestId": 11' "$OUT" || fail "full audit-log should include requestId 11"
grep -q '"action": "auto-approval-blocked"' "$OUT" || fail "full audit-log should include blocked action"
pass "audit-log full filter"

echo "All smoke tests passed."