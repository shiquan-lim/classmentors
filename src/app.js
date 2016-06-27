/* eslint-env browser */
import angular from 'angular';
import {classMentors} from './classmentors/index.js';

classMentors.config([
  '$routeProvider',
  'routes',
  'spfFirebaseRefProvider',
  function($routeProvider, routes, spfFirebaseRefProvider) {
    const id = (window.SINGPATH && window.SINGPATH.firebaseId) || 'singpath';

    spfFirebaseRefProvider.setBaseUrl(`https://${id}.firebaseio.com/`);

    $routeProvider.otherwise({
      redirectTo: routes.home
    });
  }
]);

classMentors.run([
  '$window',
  'clmServicesUrl',
  function($window, clmServicesUrl) {
    const singpath = ($window.SINGPATH && $window.SINGPATH.singpathURL) || 'http://www.singpath.com';
    const backend = ($window.SINGPATH && $window.SINGPATH.backendURL) || 'http://api.singpath.com';

    clmServicesUrl.singPath = singpath.replace(/\/$/, '');
    clmServicesUrl.backend = backend.replace(/\/$/, '');
  }
]);

angular.element(document).ready(function() {
  angular.bootstrap(document, [classMentors.name], {strictDi: true});
});
