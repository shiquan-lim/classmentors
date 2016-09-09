#!/usr/bin/env node
'use strict';

const config = require('./config.js');
const sh = require('shelljs');
const tools = require('@singpath/tools');

sh.set('-e');

const stdoutGetter = cmd => () => sh.exec(cmd, {silent: true}).stdout.trim();
const getOriginUrl = stdoutGetter('git config --get remote.origin.url');
const getCommitName = stdoutGetter('git --no-pager show -s --format=\'%an\'');
const getCommitEmail = stdoutGetter('git --no-pager show -s --format=\'%ae\'');

const firebaseConfig = process.argv.slice(2).shift() || '{}';
const remoteUrl = process.argv.slice(3).shift() || getOriginUrl();
const commitName = process.argv.slice(4).shift() || getCommitName();
const commitEmail = process.argv.slice(5).shift() || getCommitEmail();

function switchConfig() {
  const options = JSON.parse(firebaseConfig);

  if (!options || Object.keys(options).length === 0) {
    sh.echo('No firebase options to switch.');

    return;
  }

  if (!options.apiKey) {
    sh.echo('apiKey is missing from firebase config.');
    sh.exit(2);
  }

  if (!options.authDomain) {
    sh.echo('authDomain is missing from firebase config.');
    sh.exit(2);
  }

  if (!options.databaseURL) {
    sh.echo('databaseURL is missing from firebase config.');
    sh.exit(3);
  }

  sh.cp('index.html', 'index.html.tmp');
  sh.sed('-i', /apiKey: ['"][-a-zA-Z0-9]+['"]/, `apiKey: '${options.apiKey}'`, 'index.html');
  sh.sed('-i', /authDomain: ['"][-.a-zA-Z0-9]+['"]/, `authDomain: '${options.authDomain}'`, 'index.html');
  sh.sed('-i', /databaseURL: ['"][-\/:.a-zA-Z0-9]+['"]/, `databaseURL: '${options.databaseURL}'`, 'index.html');
}

// Build app
if (sh.test('-d', config.build.app.root)) {
  sh.echo('Skipping building app.');
  sh.rm('-rf', config.build.app.git);
} else {
  tools.exec('npm run build');
}

// git init
sh.echo(`setup git repository in ${config.build.app.root}...`);
sh.pushd(config.build.app.root);
tools.exec('git init');
tools.exec(`git config user.name "${commitName}"`);
tools.exec(`git config user.email "${commitEmail}"`);

// Switch firebase id in
sh.echo('Switching firebase id in "index.html"');
switchConfig();

// Commit files
sh.echo('Committing files');
sh.rm('-f', '*.map');
tools.exec('git add .');
tools.exec('git commit -m "Deploy to GitHub Pages"');

if (sh.test('-e', 'index.html.tmp')) {
  sh.mv('index.html.tmp', 'index.html');
}

// # Force push from the current repo's master branch to the remote
// # repo's gh-pages branch. (All previous history on the gh-pages branch
// # will be lost, since we are overwriting it.) We redirect any ${BUILD_DEST}put to
// # /dev/null to hide any sensitive credential data that might otherwise be exposed.
sh.echo('Pushing gh-pages to origin remote repo (or provided one)...');
tools.exec(`git push --force ${remoteUrl} master:gh-pages`, {
  printCmd: true,
  ignoreStdout: false,
  ignoreStderr: false
});

// # cleanup dist directory
sh.popd();
sh.rm('-rf', config.build.app.git);
