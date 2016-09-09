#!/usr/bin/env node
'use strict';

/**
 * Run example-app unit tests.
 */

const config = require('./config.js');
const sh = require('shelljs');
const tools = require('@singpath/tools');

// exit on error
sh.set('-e');

// test
tools.mocha(config.test.main, {
  config(loader) {
    loader.config({
      map: {
        'ace/mode-html.js': '@empty',
        'ace/mode-java.js': '@empty',
        'ace/mode-javascript.js': '@empty',
        'ace/mode-python.js': '@empty',
        'ace/theme-twilight.js': '@empty',
        'ace/theme-monokai.js': '@empty',
        ace: '@empty',
        firebase: '@empty',
        c3: '@empty'
      }
    });
  }
});
