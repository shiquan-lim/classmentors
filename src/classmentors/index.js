/* globals document: true */
import angular from 'angular';
import firebase from 'firebase';
import 'angular-animate';
import 'angular-loading-bar';
import 'angular-material';
import 'angular-messages';
import 'angular-route';
import 'angularfire';
import 'angular-timer';

// polyfills
import 'core-js/fn/array/every.js';
import 'core-js/fn/array/find-index.js';
import 'core-js/fn/array/find.js';
import 'core-js/fn/array/from.js';
import 'core-js/fn/array/some.js';
import 'core-js/fn/function/bind.js';
import 'core-js/fn/object/assign.js';
import 'core-js/fn/string/starts-with.js';

import {module as spfShared} from 'singpath-core';

import * as services from 'classmentors/services.js';
import * as filters from 'classmentors/filters.js';
import * as directives from 'classmentors/directives.js';
import components from 'classmentors/components/index.js';

const module = angular.module('clm', [
  'angular-loading-bar',
  'firebase',
  'ngAnimate',
  'ngMessages',
  'ngRoute',
  'timer',
  spfShared.name
]);

module.value('clmServicesUrl', {
  backend: 'http://api.singpath.com/',
  singPath: 'http://www.singpath.com/',
  codeCombat: 'https://codecombat.com',
  codeSchool: 'https://www.codeschool.com'
});

// module.component('challenges', components.challenges.component);
module.component('ace', components.ace.component);
module.component('classmentors', components.classmentors.component);
module.component('clmAdmin', components.admin.component);
module.component('clmServiceCard', components.serviceCard.component);
module.component('clmServiceForm', components.serviceCard.serviceForm.component);
module.config(components.ace.configRoute);
module.config(components.admin.configRoute);
module.constant('aceStatsUrl', components.ace.ACE_STATS_URL);
module.constant('clmRefreshTimout', 60000);
module.constant('spfProfilesPath', 'classMentors/userProfiles');
module.directive('clmCohortsRankingPage', components.cohorts.clmCohortRankPageFactory);
module.directive('clmCohortsStatsPage', components.cohorts.clmCohortsStatsPageFactory);
module.directive('clmEventRankTable', components.events.clmEventRankTableFactory);
module.directive('clmEventResultsTable', components.events.clmEventResultsTableFactory);
module.directive('clmEventTable', components.events.clmEventTableFactory);
module.directive('clmPager', components.events.clmPagerFactory);
module.directive('cmContains', directives.cmContainsFactory);
module.directive('scrollBottom', components.challenges.scrollBottom);
module.factory('aceStats', components.ace.factory);
module.factory('challengeService', components.challenges.challengeServiceFactory);
module.factory('clmDataStore', services.clmDataStoreFactory);
module.factory('clmPagerOption', components.events.clmPagerOptionFactory);
module.factory('clmRowPerPage', components.events.clmRowPerPageFactory);
module.factory('clmServices', services.clmServicesFactory);
module.factory('eventService', components.events.eventServiceFactory);
module.filter('cmTruncate', filters.cmTruncateFilterFactory);
module.filter('cmTruncated', filters.cmTruncateFilterBooleanFactory);
module.filter('showSchool', filters.showSchoolFilterFactory);
module.filter('showTeamMembers', filters.showTeamMembersFilterFactory);
// module.filter('reverseArray', filters.reverseArray);
//for page controls in trat
module.run(components.profiles.configServices);
module.factory('quizFactory', components.challenges.tratQuestionFactory);

// TODO: convert those view controller/template to component and move them above
module.config(components.cohorts.configRoute);
module.config(components.feedback.configRoute);
module.config(components.questionQueue.configRoute);
module.config(components.events.configRoute);
module.config(components.profiles.configRoute);
module.config(components.challenges.configRoute);
// module.config(components.challenges.teamActivity.configRoute);

// added new survey factory for tryout purpose
module.factory('clmSurvey', components.events.clmSurveyTaskFactory);

/**
 * Label route paths.
 *
 * Required for singpath-core/services/routes.js and its "urlFor" service and
 * filter.
 *
 * Should be used to configure $routeProvider.
 *
 */
module.constant('routes', {
  home: '/ace-of-coders', // The default route
  aceOfCoders: '/ace-of-coders',
  admin: '/admin',
  events: '/events',
  newEvent: '/new-event',
  oneEvent: '/events/:eventId',
  editEvent: '/events/:eventId/edit',
  editEventTask: '/events/:eventId/task/:taskId',
  addEventTask: '/events/:eventId/new-task',
  profile: '/profile/:publicId',
  editProfile: '/profile/',
  cohorts: '/cohorts',
  newCohort: '/new-cohort',
  viewCohort: '/cohorts/:cohortId',
  editCohort: '/cohorts/:cohortId/edit',
  viewMcq: '/challenges/mcq',
  startMcq: '/events/:eventId/challenges/:taskId/mcq/start',
  editMcq: '/challenges/mcq/edit',
  viewSurvey: '/challenges/survey',
  createTeamActivity: '/challenges/team-activity/create',
  viewIRAT: '/challenges/IRAT',
  viewTRAT: '/events/:eventId/challenges/:taskId/TRAT/start',
  feedback: '/feedback',
  questionQueue: '/question-queue'
});

export {module};

/**
 * Bootstrap classmentors Angular app and overwrite default settings.
 *
 * @param {{firebaseApp: string, singpathUrl: string, backendUrl: string}} options Application
 */
export function bootstrap(options) {
  const bootstrapModule = angular.module('classmentors.bootstrap', [module.name]);

  options = options || {};

  if (options.firebaseApp) {
    bootstrapModule.constant('firebaseApp', options.firebaseApp);
    bootstrapModule.constant('authFirebaseApp', options.firebaseApp);
  } else {

    // use singpath firebase by default
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

  bootstrapModule.run([
    'clmServicesUrl',
    function(clmServicesUrl) {
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
