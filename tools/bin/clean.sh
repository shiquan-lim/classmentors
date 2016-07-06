#!/usr/bin/env bash

# Build variables.
# SOME SHOULD BE SET VIA NPM RUN.

COVERAGE=coverage/

if [[ -z "$npm_package_config_build_dir" ]]; then
	>&2 echo "npm_package_config_build_dir is not set"
	exit 1
else
	BUILD_DIR=$npm_package_config_build_dir
fi

if [[ -d "$COVERAGE" ]]; then
	echo 'Removing "'$COVERAGE'"...'
	rm -r "$COVERAGE"
else
	echo 'No "'$COVERAGE'" directory to remove.'
fi

if [[ -d "$BUILD_DIR" ]]; then
	echo 'Removing "'$BUILD_DIR'"...'
	rm -r "$BUILD_DIR"
else
	echo 'No "'$BUILD_DIR'" directory to remove.'
fi
