#!/usr/bin/env bash
# Internal test helper for booster repository only (NOT copied to integrating projects)
set -euo pipefail
IFS=$'\n\t'

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
if [ -f "$ROOT/booster/tools/runner.sh" ]; then
  BASE="$ROOT/booster"
else
  BASE="$ROOT"
fi
hook="$BASE/tools/git-hooks/hooks/commit-msg.bash"
util_js="$BASE/tools/commit-utils.js"

if [ ! -f "$hook" ]; then
  echo "commit-msg hook not found at $hook" >&2
  exit 2
fi
if [ ! -f "$util_js" ]; then
  echo "commit-utils.js not found at $util_js" >&2
  exit 2
fi

branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "unknown")
echo "Running hook self-test on current branch: $branch"

tmp_msg=$(mktemp)
trap 'rm -f "$tmp_msg"' EXIT
printf 'chore: hook self-test' >"$tmp_msg"

need_ticket=$(node "$util_js" --need-ticket 2>/dev/null || echo no)
footer_label=$(node "$util_js" --footer-label 2>/dev/null || echo Closes)

ticket_id=""
if [ "$need_ticket" = "yes" ]; then
  ticket_id=$(node "$util_js" --extract-ticket "$branch" 2>/dev/null || true)
  if [ -z "$ticket_id" ]; then
    echo "NOTE: Branch requires ticket but none extracted; expecting hook failure." >&2
  fi
fi

set +e
bash "$hook" "$tmp_msg"
rc=$?
set -e

if [ "$need_ticket" = "yes" ]; then
  if [ -z "$ticket_id" ]; then
    if [ $rc -eq 0 ]; then
      echo "✖ Expected failure (missing ticket) but hook exited 0" >&2
      cat "$tmp_msg"
      exit 1
    else
      echo "✔ Hook failed as expected (missing ticket)."
      exit 0
    fi
  else
    if [ $rc -ne 0 ]; then
      echo "✖ Hook failed unexpectedly (rc=$rc)" >&2
      cat "$tmp_msg"
      exit $rc
    fi
    if ! grep -q "${footer_label}: ${ticket_id}" "$tmp_msg"; then
      echo "✖ Footer '${footer_label}: ${ticket_id}' not appended" >&2
      cat "$tmp_msg"
      exit 1
    fi
    echo "✔ Hook passed and footer appended (${footer_label}: ${ticket_id})"
  fi
else
  if [ $rc -ne 0 ]; then
    echo "✖ Hook failed though ticket not required (rc=$rc)" >&2
    cat "$tmp_msg"
    exit $rc
  fi
  echo "✔ Hook passed (ticket not required)"
fi

exit 0
