import angular from 'angular';
import 'firebase';
import 'angularfire';
import 'angular-material';
import 'angular-loading-bar';
import 'angular-animate';
import 'angular-messages';
import 'angular-route';
import 'angular-timer';

// import 'd3';
// import 'c3';

import {spfShared} from 'singpath-core';

const classMentors = angular.module('clm', [
  'angular-loading-bar',
  'firebase',
  'ngAnimate',
  'ngMessages',
  'ngRoute',
  spfShared.name,
  'timer'
]);

classMentors.value('clmServicesUrl', {
  backend: 'http://api.singpath.com/',
  singPath: 'http://www.singpath.com/',
  codeCombat: 'https://codecombat.com',
  codeSchool: 'https://www.codeschool.com'
});

export default classMentors;
