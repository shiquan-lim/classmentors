#!/usr/bin/env bash
#

if [[ -z $1 ]]; then
  echo "Bump package.json version and push the new release and tag to singpath/classmentors"
  echo ""
  echo "Usage:  $0 TYPE"
  echo ""
  echo "TYPE:  major, minor or patch."
  exit 1
fi

git co master
git pull git@github.com:singpath/classmentors.git master

NEW_VERSION=$(npm version "$1")
git push git@github.com:singpath/classmentors.git master "$NEW_VERSION"
