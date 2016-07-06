#!/usr/bin/env bash
#
set -e

DEST=_tests
BUNDLE="${DEST}/bundle.js"
COVERAGE=coverage

cleanup() {
	echo 'Removing "'${DEST}/'"...'
	rm -rf "${DEST}/"
}

trap cleanup EXIT
mkdir -p "${DEST}/"

echo 'Building test bumdle at "'${BUNDLE}'"...'
jspm build tests.js "$BUNDLE" --skip-rollup --format cjs

echo 'Running tests with coverage...'
istanbul cover -v --es-modules --print none --report json _mocha -- "$BUNDLE" 2> /dev/null

echo "Remapping coverage..."
mv "${COVERAGE}/coverage-final.json" "${COVERAGE}/coverage.json"
remap-istanbul -i "${COVERAGE}/coverage.json" -o "${COVERAGE}/coverage.json" -e 'jspm_packages,.specs.js'

echo "Creating coverage report..."
istanbul report --es-modules lcov text

cleanup