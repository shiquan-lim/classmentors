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

/**
 * Configure ace of coders route
 *
 * @param  {$routeProvider} $routeProvider
 * @param  {Object}         routes
 */
export function configRoute($routeProvider, routes) {
  $routeProvider.when(routes.aceOfCoders, {
    template: '<ace stats="$resolve.stats"></ace>',
    resolve: {
      // ngRoute will wait for the promise aceStats to resolve before assigning
      // it to $resolve.stats. Once, it's resolved, the template will be run.
      stats: ['aceStats', aceStats => aceStats()]
    }
  });
}

configRoute.$inject = ['$routeProvider', 'routes'];

export const ACE_STATS_URL = 'https://dl.dropboxusercontent.com/u/4972572/ace_of_coders_stats.json';

/**
 * aceStats factory
 *
 * return the aceStats function.
 *
 * @param  {$http}    $http
 * @return {function}
 */
export function factory($http, aceStatsUrl) {

  /**
   * aceStats service
   *
   * Resolve to the Ace stats
   *
   * @return {Promise}
   */
  return function aceStats() {
    return $http.get(aceStatsUrl).then(
      response => response.data
    );
  };
}

factory.$inject = ['$http', 'aceStatsUrl'];

