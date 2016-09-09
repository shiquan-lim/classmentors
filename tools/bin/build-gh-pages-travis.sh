#!/bin/bash

# exit with nonzero exit code if anything fails
set -e

if [[ "$TRAVIS_BRANCH" != "master" ]]; then
	>&2 echo "Skipping github pages deployment: not master branch."
	exit 0
fi

if [[ -z "$GH_TOKEN" ]]; then
	>&2 echo "Skipping github pages deployment: GH_TOKEN is not set."
	exit 0
fi

if [[ -z "$TRAVIS_REPO_SLUG" ]]; then
	>&2 echo "Error: TRAVIS_REPO_SLUG is not set."
	exit 1
fi

if [[ -z "$PROD_FIREBASE_CONFIG_API_KEY" ]]; then
	echo '$PROD_FIREBASE_CONFIG_API_KEY is not set'
fi

if [[ -z "$PROD_FIREBASE_CONFIG_AUTH_DOMAIN" ]]; then
	echo '$PROD_FIREBASE_CONFIG_AUTH_DOMAIN is not set'
fi

if [[ -z "$PROD_FIREBASE_CONFIG_DATABASE_URL" ]]; then
	echo '$PROD_FIREBASE_CONFIG_DATABASE_URL is not set'
fi

if [[ -z "$PROD_FIREBASE_CONFIG_API_KEY" ]] || \
	 [[ -z "$PROD_FIREBASE_CONFIG_AUTH_DOMAIN" ]] || \
	 [[ -z "$PROD_FIREBASE_CONFIG_DATABASE_URL" ]]
then
	echo 'Will use default firebase database target.'
	PROD_FIREBASE_CONFIG='{}'
else
	PROD_FIREBASE_CONFIG='{
	"apiKey": "'$PROD_FIREBASE_CONFIG_API_KEY'",
	"authDomain": "'$PROD_FIREBASE_CONFIG_AUTH_DOMAIN'",
	"databaseURL": "'$PROD_FIREBASE_CONFIG_DATABASE_URL'"
}'
fi

cd src/packages/singpath-core; npm install; npm run build; cd -
cp -r src/packages/singpath-core/dist dist/classmentors/singpath-core

GIT_REMOTE_URL="https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git"
GIT_COMMIT_NAME="Travis"

npm run --silent build:gh-pages -- "$PROD_FIREBASE_ID" "$GIT_REMOTE_URL" "$GIT_COMMIT_NAME"
