#!/bin/bash
# Pre-push checks: tests, coverage, build
# Outputs JSON to block or allow the push

set -e

cd "$(dirname "$0")/.."

# Run tests and check for failures
TEST_OUTPUT=$(npx vitest run 2>&1)
if echo "$TEST_OUTPUT" | grep -q "failed"; then
  echo '{"continue": false, "stopReason": "Push blocked: tests are failing. Fix failing tests before pushing."}'
  exit 0
fi

# Check coverage threshold (90% statements)
COV_OUTPUT=$(npx vitest run --coverage 2>&1)
COVERAGE=$(echo "$COV_OUTPUT" | grep "All files" | awk '{print $4}')
THRESHOLD=90
if [ -n "$COVERAGE" ] && [ "$(echo "$COVERAGE < $THRESHOLD" | bc)" -eq 1 ]; then
  echo "{\"continue\": false, \"stopReason\": \"Push blocked: test coverage is ${COVERAGE}% (minimum ${THRESHOLD}%). Add tests before pushing.\"}"
  exit 0
fi

# Check build
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo '{"continue": false, "stopReason": "Push blocked: npm run build failed. Fix build errors before pushing."}'
  exit 0
fi

echo "{\"continue\": true, \"systemMessage\": \"Pre-push checks passed: tests ✓, coverage ${COVERAGE}% ✓, build ✓\"}"
