#!/usr/bin/env bash

__PWD="$(pwd)"
NODE_ENV=production


# Build variables.
# SOME SHOULD BE SET VIA NPM RUN.
if [[ -z "$npm_package_config_build_dir" ]]; then
	>&2 echo "npm_package_config_build_dir is not set"
	exit 1
else
	BUILD_DIR=$npm_package_config_build_dir
fi

if [[ -z "$npm_package_config_build_assets_dir" ]]; then
	>&2 echo "npm_package_config_build_assets_dir is not set"
	exit 2
else
	BUILD_ASSETS_DIR=$npm_package_config_build_assets_dir
fi

if [[ -z "$npm_package_name" ]]; then
	>&2 echo "npm_package_name is not set"
	exit 3
else
	APP_NAME=$npm_package_name
fi

if [[ -z "$npm_package_exportAs" ]]; then
	>&2 echo "npm_package_exportAs is not set"
	exit 4
else
	GLOBAL_NAME=$npm_package_exportAs
fi


BUILD_DEST="${BUILD_DIR}${APP_NAME}"
SOURCE=$APP_NAME
INDEX="${BUILD_DEST}/index.html"
OUTPUT_MIN="${BUILD_DEST}/app.js"
OUTPUT_TREE="${BUILD_DEST}/tree.html"


echo 'Setting up "'${BUILD_DEST}'"...'
if [[ -d "$BUILD_DIR" ]]; then
	rm -rf $BUILD_DIR
fi

mkdir -p $BUILD_DEST
cp -r ${BUILD_ASSETS_DIR}/* $BUILD_DEST


echo 'Building "'$SOURCE'" bundle in "'$OUTPUT_MIN'"...'
echo 'The app is exported as "'$GLOBAL_NAME'"'
jspm build \
	$SOURCE - angular - angular-route - angular-messages - angular-aria - angular-animate - angular-material - firebase - angularfire \
	"$OUTPUT_MIN" \
	--format umd --minify \
	--global-name "$GLOBAL_NAME" \
	--global-deps "{\
		'angular/angular.js': 'angular',\
		'angular-route/angular-route.js': 'angular',\
		'angular-messages/angular-messages.js': 'angular',\
		'angular-aria/angular-aria.js': 'angular',\
		'angular-animate/angular-animate.js': 'angular',\
		'angular-material/angular-material.js': 'angular',\
		'firebase/firebase.js': 'Firebase',\
		'angularfire/dist/angularfire.js': 'angular'\
	}"


echo 'Removing source map directive from "'${OUTPUT_MIN}'"...'
sed '$ d' "$OUTPUT_MIN" > "${OUTPUT_MIN}.temp"
mv "${OUTPUT_MIN}.temp" "$OUTPUT_MIN"


echo 'Building tree dependency in "'${OUTPUT_TREE}'"...'
source-map-explorer --html "$OUTPUT_MIN"{,.map} > "$OUTPUT_TREE"


echo 'Calculating bundle content hash...'
APP_HASH=$(shasum ${BUILD_DIR}/${APP_NAME}/app.js | cut -c 1-8)
OUTPUT_MIN_WITH_HASH="${BUILD_DEST}/app.${APP_HASH}.js"


echo 'Renaming "'$OUTPUT_MIN'" to "'$OUTPUT_MIN_WITH_HASH'"...'
mv "$OUTPUT_MIN" "$OUTPUT_MIN_WITH_HASH"


echo 'Replacing reference to "'$OUTPUT_MIN'" for "'$OUTPUT_MIN_WITH_HASH'"...'
sed 's/app\.js/app.'${APP_HASH}'.js/g' "$INDEX" > "${INDEX}.temp"
mv "${INDEX}.temp" "$INDEX"

if hash zip 2>/dev/null; then
	echo 'Creating archive in "'$BUILD_DIR'/'${APP_NAME}'.zip"...'
	cd "$BUILD_DIR"
	zip -r "${APP_NAME}.zip" "$APP_NAME"
	cd "$__PWD"
else
	echo '"zip" was not found.'
	echo 'Skipping creating app archive.'
fi