#!/usr/bin/env node
'use strict';

/**
 * Run singpath-core unit tests.
 */

const sh = require('shelljs');
const tools = require('@singpath/tools');
const src = 'singpath-core/singpath-core.specs.js';
const coverage = './coverage';

// exit on error
sh.set('-e');

// setup
tools.clean(coverage, {message: 'Removing coverage data'});
sh.echo(`Setting up "${coverage}/"...`);
sh.mkdir('-p', coverage);

tools.instanbul(src, {
  coverage,
  config(loader) {
    loader.config({
      map: {
        css: loader.map.text,
        'ace/mode-html.js': '@empty',
        'ace/mode-java.js': '@empty',
        'ace/mode-javascript.js': '@empty',
        'ace/mode-python.js': '@empty',
        'ace/theme-twilight.js': '@empty',
        ace: '@empty'
      }
    });
  }
});
