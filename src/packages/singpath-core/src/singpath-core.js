import angular from 'angular';
import 'firebase';
import 'angularfire';
import 'angular-loading-bar';
import 'angular-animate';
import 'angular-messages';
import 'angular-route';
import 'angular-material';

import components from 'singpath-core/components/index';
import services from 'singpath-core/services/index';
import * as filters from 'singpath-core/filters.js';
import * as config from 'singpath-core/config.js';

export const spfShared = angular.module('spf.shared', [
  'angular-loading-bar',
  'firebase',
  'ngAnimate',
  'ngMessages',
  'ngRoute',
  'ngMaterial'
]);

//
// Register directives, services and filters.
//
// spfShared.factory('spfFirebase', services.firebase.spfFirebaseFactory);
// spfShared.provider('spfFirebaseRef', services.firebase.SpfFirebaseRefProvider);
spfShared.config(config.loadingBar);
spfShared.config(config.mdTheme);
spfShared.config(services.icons.config);
spfShared.constant('authFirebaseApp', null);
spfShared.constant('authProvider', null);
spfShared.constant('firebaseApp', null);
spfShared.constant('routes', services.routes.defaults);
spfShared.constant('SPF_COUNTRIES', services.countries);
spfShared.constant('spfCryptoHashKeySize', services.crypto.keySize);
spfShared.constant('spfCryptoIteration', services.crypto.iterations);
spfShared.constant('spfCryptoSaltSize', services.crypto.saltSize);
spfShared.constant('spfProfilesPath', null);
spfShared.controller('SpfSharedNavBarCtrl', components.navbar.SpfSharedNavBarCtrl);
spfShared.directive('spfEditor', components.ace.spfEditorDirectiveFactory);
spfShared.directive('spfSignForm', components.sign.spfSignFormDirectiveFactory);
spfShared.directive('spfUniqPublicId', components.sign.spfUniqPublicIdFactory);
spfShared.factory('spfAlert', components.alert.spfAlertFactory);
spfShared.factory('spfAuth', services.datastore.spfAuthFactory);
spfShared.factory('spfAuthData', services.datastore.spfAuthDataFactory);
spfShared.factory('spfNavBarService', components.navbar.spfNavBarServiceFactory);
spfShared.factory('spfSchools', services.datastore.spfSchoolsFactory);
spfShared.factory('urlFor', services.routes.urlForFactory);
spfShared.filter('spfEmpty', filters.spfEmptyFilterFactory);
spfShared.filter('spfLength', filters.spfLengthFilterFactory);
spfShared.filter('spfToArray', filters.spfToArrayFilterFactory);
spfShared.filter('urlFor', services.routes.urlForFilterFactory);
spfShared.run(components.navbar.initNavBar);
spfShared.run(services.datastore.run);
spfShared.run(services.firebase.run);
spfShared.run(services.icons.run);
spfShared.run(services.routes.run);
spfShared.service('spfCrypto', services.crypto.Service);
spfShared.service('spfCurrentUser', services.datastore.SpfCurrentUserService);

import './shared.css!';

export {spfShared as module};
