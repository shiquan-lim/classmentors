/**
 * Created by limshiquan on 13/10/16.
 */
import qqHome from './question-queue.html!text';

/**
 * Update navBar with a title and no action.
 * @param {spfNavBarService} spfNavBarService
 * Load data required for executing controller functions
 * @param {initialData} initialData
 * Route routing directive
 * @param {urlFor} urlFor
 * Database reference
 * @param {firebaseApp} firebaseApp
 * Alert for success and errors
 * @param {spfAlert} spfAlert
 * Firebase reference for objects. Returns promise.
 * @param {$firebaseObject} $firebaseObject
 */
function qqController(initialData, spfNavBarService, urlFor, firebaseApp, spfAlert, $firebaseObject) {
    var self = this;
    var db = firebaseApp.database();

}

qqController.$inject = ['initialData', 'spfNavBarService', 'urlFor', 'firebaseApp', 'spfAlert', '$firebaseObject'];

export const component = {
    qqHome,
    controller: qqController
};

/**
 * Config route for ace of coders views.
 *
 * @param  {object} $routeProvider ngRoute $route service provider.
 * @param  {object} routes         classmentors route map.
 */
export function configRoute($routeProvider, routes) {
    $routeProvider
        .when(routes.questionQueue, {
            template: qqHome,
            controller: qqController,
            controllerAs: 'ctrl',
            resolve: {initialData: clmQQResolver}
        })
        .otherwise(routes.home);
}

configRoute.$inject = ['$routeProvider', 'routes'];

function clmQQResolver($q, spfAuth, spfAuthData, clmDataStore) {
    return $q.all({
        auth: spfAuth.$loaded(),
        currentUser: spfAuthData.user().catch(function(error) {
            return error;
        }),
        profile: clmDataStore.currentUserProfile(),
        createdCohorts: clmDataStore.cohorts.listCreatedCohorts(),
        joinedEvents: clmDataStore.events.listJoinedEvents(),
        allCohorts: clmDataStore.cohorts.listAllCohorts()
    });
}
clmQQResolver.$inject = ['$q', 'spfAuth', 'spfAuthData', 'clmDataStore'];
