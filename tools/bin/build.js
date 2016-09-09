#!/usr/bin/env node
'use strict';

const config = require('./config.js');
const sh = require('shelljs');
const tools = require('@singpath/tools');

sh.set('-e');

sh.echo(`NOTICE:

  Make sure to update JSPM to version "^0.17.0-beta.25".

  To update, reinstall all dependencies:

      rm -rf node_modules/ src/jspm_packages/ && npm install

  The build might freeze if you only update JSPM.

`);

// setup
tools.clean(config.build.root);
sh.echo(`Setting up "${config.build.app.root}/"...`);
sh.mkdir('-p', config.build.app.root);
sh.cp('-r', 'LICENSE', 'README.md', 'tools/assets/*', config.build.app.root);


// Bundles
const cmd = [
  'jspm build',
  `${config.build.app.main} - ${config.build.app.deps.names.join(' - ')}`
].join(' ');
const umdOpts = [
  '--format umd',
  `--global-name "${config.build.app.name}"`,
  `--global-deps '${JSON.stringify(config.build.app.deps.map)}'`
].join(' ');

sh.echo(`Buidling ${config.build.app.js}...`);
tools.exec(`${cmd} "${config.build.app.js}" ${umdOpts} --skip-source-maps`);

sh.echo(`Buidling ${config.build.app.minJs}...`);
tools.exec(`${cmd} "${config.build.app.minJs}" ${umdOpts} --minify`);


// Dependency tree
//
// You don't want the browser to load the source map file
// (the source map is often as big as the bundle).
// So we are stripping the source map directive in the bundle
// by stripping the last line.
sh.echo(`Removing source map directive from ${config.build.app.minJs}...`);
sh.sed('-i', /^\/\/# sourceMappingURL=.*$/, '', config.build.app.minJs);

sh.echo(`Analysing source map using ${config.build.app.minJs}...`);
tools.execPipe(
  `source-map-explorer --html "${config.build.app.minJs}" "${config.build.app.minJs}.map"`,
  {stdout: config.build.app.tree}
);

sh.echo(`open "${config.build.app.tree}" to find weight of each modules.`);

// Archive
sh.echo(`Creating archive in "${config.build.archive}".`);
tools.zip(config.build.app.root, config.build.archive).then(() => sh.echo('Archive created.'));
