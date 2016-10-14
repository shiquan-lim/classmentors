/**
 * Created by limshiquan on 10/10/16.
 */
import template from './feedback.html!text';

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
function feedbackController(initialData, spfNavBarService, urlFor, firebaseApp, spfAlert, $firebaseObject) {
    var self = this;
    var db = firebaseApp.database();

    this.currentUser = initialData.currentUser;
    this.profile = initialData.profile;

    this.feedbackType = null;
    this.feedback = {};
    this.anonymity = false;
    this.allFeedback = {};

    spfNavBarService.update('Feedback');

    this.toggleFeedbackType = function (feedbackType) {
        self.feedbackType = feedbackType;
        self.feedback = {};
        if(self.feedbackType=='view' && (self.currentUser.$id=='HTIc4MVi5CWC4I9rsbM6x0AarN52' || self.currentUser.$id=='google:113933988995739437762')) {
            var path = db.ref('classMentors/userFeedback');
            var fb = $firebaseObject(path);
            fb.$loaded().then(function () {
                self.allFeedback = fb;
            });
        }
    };

    this.saveFeedback = function () {
        self.feedback.type = self.feedbackType;
        var stamp = new Date(Date.now());
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        self.feedback.timestamp = stamp.getDate() + "-" + months[stamp.getMonth()] + "-" + stamp.getFullYear() + " (" + stamp.getHours() + ":" + stamp.getMinutes() + ":" + stamp.getSeconds() + ")";

        if(!self.anonymity) {
            self.feedback.loggedBy = {};
            self.feedback.loggedBy.displayName = self.profile.user.displayName;
            self.feedback.loggedBy.id = self.profile.$id;
        } else {
            self.feedback.loggedBy = "anonymous";
        }

        var ref = db.ref('classMentors/userFeedback');
        ref.push(self.feedback).then(function () {
                self.feedbackType = null;
                self.feedback = {};
        }).then(
            spfAlert.success("Feedback successfully registered. Thank you!")
        ).catch(function (error) {
            spfAlert.error("error")
        });
    };
}

feedbackController.$inject = ['initialData', 'spfNavBarService', 'urlFor', 'firebaseApp', 'spfAlert', '$firebaseObject'];

export const component = {
    template,
    controller: feedbackController
};

/**
 * Config route for ace of coders views.
 *
 * @param  {object} $routeProvider ngRoute $route service provider.
 * @param  {object} routes         classmentors route map.
 */
export function configRoute($routeProvider, routes) {
    $routeProvider
        .when(routes.feedback, {
            template: template,
            controller: feedbackController,
            controllerAs: 'ctrl',
            resolve: {initialData: clmFeedbackResolver}
        })
        .otherwise(routes.home);
}

configRoute.$inject = ['$routeProvider', 'routes'];

function clmFeedbackResolver($q, spfAuth, spfAuthData, clmDataStore) {
    return $q.all({
        featuredCohorts: clmDataStore.cohorts.listFeaturedCohorts(),
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
clmFeedbackResolver.$inject = ['$q', 'spfAuth', 'spfAuthData', 'clmDataStore'];
