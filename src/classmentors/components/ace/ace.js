/**
 * classmentors/components/ace/ace.js - Define the ace component.
 */
import template from './2015-ace-view.html!text';

/**
 * Update navBar with a title and no action.
 *
 * @param {spfNavBarService} spfNavBarService
 */
function AceController(spfNavBarService) {
  spfNavBarService.update('Ace of Coders');
}

AceController.$inject = ['spfNavBarService'];

/**
 * ace component.
 *
 * @type {Object}
 */
export const component = {
  template,
  bindings: {
    // binds $ctrl.stats to the value of the stats attribute.
    stats: '<'
  },
  controller: AceController
};

export const ACE_STATS_URL = 'https://dl.dropboxusercontent.com/u/4972572/ace_of_coders_stats.json';

/**
 * Route resolver helper.
 *
 * This is not a service; this is not generating a singleton. If used in a route
 * configuration "resolve" map, the function will be run on each resolution of
 * that route.
 *
 * @param  {Object}  $http       $http service.
 * @param  {string}  aceStatsUrl URL to fetch stats from
 * @return {Promise}
 */
export function getStats($http, aceStatsUrl) {
  return $http.get(aceStatsUrl).then(
    response => response.data
  );
}
getStats.$inject = ['$http', 'aceStatsUrl'];

