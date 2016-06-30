/* globals document: true */

import angular from 'angular';
import module from 'classmentors/module.js';

import './directives.js';
import './filters.js';
import './services/index.js';
import './components/index.js';

export {module};

/**
 * Bootstrap classmentors Angular app and overwrite default settings.
 *
 * @param {{firebaseId: string, singpathUrl: string, backendUrl: string}} options
 */
export function bootstrap(options) {
  const bootstrapModule = angular.module('classmentors.bootstrap', [module.name]);

  options = options || {};

  bootstrapModule.config([
    '$routeProvider',
    'routes',
    'spfFirebaseRefProvider',
    function($routeProvider, routes, spfFirebaseRefProvider) {
      $routeProvider.otherwise({
        redirectTo: routes.home
      });

      if (!options.firebaseId) {
        return;
      }

      spfFirebaseRefProvider.setBaseUrl(`https://${options.firebaseId}.firebaseio.com/`);
    }
  ]);

  bootstrapModule.run([
    '$window',
    'clmServicesUrl',
    function($window, clmServicesUrl) {
      if (options.singpathURL) {
        clmServicesUrl.singPath = options.singpathURL.replace(/\/$/, '');
      }

      if (options.backendURL) {
        clmServicesUrl.backend = options.backendURL.replace(/\/$/, '');
      }
    }
  ]);

  angular.element(document).ready(function() {
    angular.bootstrap(document, [bootstrapModule.name], {strictDi: true});
  });
}
