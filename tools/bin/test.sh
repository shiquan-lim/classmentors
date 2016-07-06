#!/usr/bin/env bash
#
set -e

DEST=_tests
BUNDLE="${DEST}/bundle.js"

cleanup() {
	echo 'Removing "'${DEST}/'"...'
	rm -rf "${DEST}/"
}

trap cleanup EXIT
mkdir -p "${DEST}/"

echo 'Building test bumdle at "'${BUNDLE}'"...'
jspm build tests.js "$BUNDLE" --format cjs --skip-rollup

echo 'Running tests with mocha...'
mocha --require source-map-support/register "${BUNDLE}"
