'use strict';

import {classMentors} from 'classmentors/module.js';

import * as app from './classmentors/classmentors.js';
import * as ace from './ace/ace.js';
import './events/events.js';
import * as profiles from './profiles/profiles.js';

classMentors.component('classmentors', app.component);
classMentors.component('ace', ace.component);
classMentors.directive('clmProfile', profiles.clmProfileFactory);
classMentors.directive('clmSpfProfile', profiles.clmSpfProfileFactory);
classMentors.directive('clmServiceUserIdExists', profiles.clmServiceUserIdExistsFactory);

classMentors.constant('aceStatsUrl', ace.ACE_STATS_URL);
classMentors.factory('aceStats', ace.factory);

classMentors.config(ace.configRoute);
classMentors.config(profiles.configRoute);
