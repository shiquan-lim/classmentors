#!/usr/bin/env node
'use strict';

/**
 * Run singpath-core unit tests.
 */

const sh = require('shelljs');
const tools = require('@singpath/tools');
const src = 'singpath-core/singpath-core.specs.js';

// exit on error
sh.set('-e');

tools.mocha(src, {
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
