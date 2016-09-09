/* global document */

import angular from 'angular';
import firebase from 'firebase';
import {module as spfShared} from 'singpath-core';

import * as demoApp from 'singpath-core/components/demo/demo.js';
import * as iconsDemo from 'singpath-core/services/icons/demo.js';

export const module = angular.module('singpath-core.demo', [spfShared.name]);

module.component('demo', demoApp.component);
module.component('iconsDemo', iconsDemo.component);
module.config(iconsDemo.config);
module.constant('spfProfilesPath', 'classMentors/userProfiles');

module.constant('routes', {
  home: '/icons',
  icons: '/icons'
});

module.config([
  '$routeProvider',
  'routes',
  function($routeProvider, routes) {
    $routeProvider.otherwise({redirectTo: routes.home});
  }
]);

/**
 * Bootstrap demo overwrite default settings.
 *
 * @param {{firebaseId: string}} options demo options
 */
export function bootstrap(options) {
  const bootstrapModule = angular.module('singpath-core.demo.bootstrap', [module.name]);

  options = options || {};

  if (options.firebaseApp) {
    bootstrapModule.constant('firebaseApp', options.firebaseApp);
    bootstrapModule.constant('authFirebaseApp', options.firebaseApp);
  } else {
    const firebaseApp = firebase.initializeApp({
      apiKey: 'AIzaSyBH01uLzdMqH0hkbDqvcgpzTDpo6yYtPDA',
      authDomain: 'singpath.firebaseapp.com',
      databaseURL: 'https://singpath.firebaseio.com'
    });

    bootstrapModule.constant('firebaseApp', firebaseApp);
    bootstrapModule.constant('authFirebaseApp', firebaseApp);
  }

  if (options.provider) {
    bootstrapModule.constant('authProvider', options.provider);
  } else {
    const provider = new firebase.auth.GoogleAuthProvider();

    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

    bootstrapModule.constant('authProvider', provider);
  }

  angular.element(document).ready(function() {
    angular.bootstrap(document, [bootstrapModule.name], {strictDi: true});
  });
}
