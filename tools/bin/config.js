'use strict';

const path = require('path');
const pkg = require('../../package.json');

// user settings and default
const config = Object.assign({}, {
  buildDir: process.env.npm_package_config_buildDir || pkg.config.buildDir,
  certsDir: process.env.npm_package_config_certsDir || pkg.config.certsDir,
  exportAs: process.env.npm_package_config_exportAs || pkg.config.exportAs,
  port: process.env.npm_package_config_port || pkg.config.port
});
const externals = [{
  name: 'angular',
  entry: 'angular/angular.js',
  globalName: 'angular'
}, {
  name: 'angular-route',
  entry: 'angular-route/angular-route.js',
  globalName: 'angular'
}, {
  name: 'angular-messages',
  entry: 'angular-messages/angular-messages.js',
  globalName: 'angular'
}, {
  name: 'angular-aria',
  entry: 'angular-aria/angular-aria.js',
  globalName: 'angular'
}, {
  name: 'angular-animate',
  entry: 'angular-animate/angular-animate.js',
  globalName: 'angular'
}, {
  name: 'angular-material',
  entry: 'angular-material/angular-material.js',
  globalName: 'angular'
}, {
  name: 'firebase',
  entry: 'firebase',
  globalName: 'firebase'
}, {
  name: 'angularfire',
  entry: 'angularfire',
  globalName: 'angular'
}, {
  name: 'd3',
  entry: 'd3',
  globalName: 'd3'
}];

exports.name = pkg.name;

exports.build = {
  root: config.buildDir,
  app: {

    // entry point
    main: pkg.jspm.name,

    // name of the exported app (for bundles)
    name: config.exportAs,

    // external dependencies  (for bundles)
    deps: {
      names: externals.map(e => e.name),
      map: externals.reduce(
        (all, e) => Object.assign(all, {[e.entry]: e.globalName}),
        {}
      )
    },

    // composed properties
    get root() {
      return path.join(exports.build.root, exports.name);
    },

    get js() {
      return path.join(this.root, 'app.js');
    },

    get minJs() {
      return path.join(this.root, 'app.min.js');
    },

    get tree() {
      return path.join(this.root, 'tree.html');
    },

    get git() {
      return path.join(this.root, '.git');
    }

  },

  get archive() {
    return path.join(exports.build.root, `${exports.name}.zip`);
  }

};

exports.serve = {
  root: path.resolve(pkg.jspm.directories.baseURL),
  port: config.port,
  certs: {
    root: path.resolve(config.certsDir),

    get key() {
      return path.join(this.root, 'localhost.key');
    },
    get cert() {
      return path.join(this.root, 'localhost.cert');
    }
  }
};

exports.coverage = {root: 'coverage/'};
exports.test = {main: 'classmentors/index.specs.js'};
