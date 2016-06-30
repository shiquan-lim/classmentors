'use strict';

import module from 'classmentors/module.js';

import * as app from './classmentors/classmentors.js';
import * as ace from './ace/ace.js';
import './events/events.js';
import * as profiles from './profiles/profiles.js';

module.component('classmentors', app.component);
module.component('ace', ace.component);
module.directive('clmProfile', profiles.clmProfileFactory);
module.directive('clmSpfProfile', profiles.clmSpfProfileFactory);
module.directive('clmServiceUserIdExists', profiles.clmServiceUserIdExistsFactory);

module.constant('aceStatsUrl', ace.ACE_STATS_URL);
module.factory('aceStats', ace.factory);

module.config(ace.configRoute);
module.config(profiles.configRoute);
