#!/bin/bash

# exit with nonzero exit code if anything fails
set -e

__DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
__PWD="$(pwd)"
NODE_ENV=production

# Build variables.
# THEY SHOULD BE SET VIA NPM RUN.
if [[ -z "$npm_package_config_build_dir" ]]; then
	>&2 echo "npm_package_config_build_dir is not set"
	exit 1
else
	BUILD_DIR=$npm_package_config_build_dir
fi

if [[ -z "$npm_package_name" ]]; then
	>&2 echo "npm_package_name is not set"
	exit 2
else
	APP_NAME=$npm_package_name
fi

BUILD_DEST=${BUILD_DIR}${APP_NAME}

# Build variable
if [[ -z "$1" ]]; then
	PROD_FIREBASE_ID="singpath"
else
	PROD_FIREBASE_ID="$1"
fi

# Git push variables
if [[ -z "$2" ]]; then
	GIT_REMOTE_URL="$(git config --get remote.origin.url)"
else
	GIT_REMOTE_URL="$2"
fi

if [[ -z "$3" ]]; then
	GIT_COMMIT_NAME="$(git --no-pager show -s --format='%an' | xargs echo -n)"
else
	GIT_COMMIT_NAME="$3"
fi

if [[ -z "$4" ]]; then
	GIT_COMMIT_EMAIL="$(git --no-pager show -s --format='%ae' | xargs echo -n)"
else
	GIT_COMMIT_EMAIL="$4"
fi

# Build production app
if [[ -d "$BUILD_DEST" ]]; then
	echo "Skipping building app."
	rm -rf "${BUILD_DEST}/.git/"
else
  npm run build
fi

# go to the ${BUILD_DEST} directory and create a *new* Git repo
cd ${BUILD_DEST}
git init

# inside this git repo we'll pretend to be a new user
git config user.name "${GIT_COMMIT_NAME}"
git config user.email "${GIT_COMMIT_EMAIL}"

# Set Firebase database name the app should target.
sed -i.tmp "s/firebaseId: '[-a-zA-Z0-9]*'/firebaseId: '${PROD_FIREBASE_ID}'/g" index.html

# The first and only commit to this new Git repo contains all the
# files present with the commit message "Deploy to GitHub Pages".
git add .
git commit -m "Deploy to GitHub Pages"

# Revert Firebase DB target change
mv index.html.tmp index.html

# Force push from the current repo's master branch to the remote
# repo's gh-pages branch. (All previous history on the gh-pages branch
# will be lost, since we are overwriting it.) We redirect any ${BUILD_DEST}put to
# /dev/null to hide any sensitive credential data that might otherwise be exposed.
git push --force --quiet $GIT_REMOTE_URL master:gh-pages > /dev/null 2>&1
