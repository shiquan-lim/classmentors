/**
 * classmentors/components/cohorts/cohorts.js- define cohort component.
 */
import {cleanObj} from 'singpath-core/services/firebase.js';
import cohortTmpl from './cohorts-view.html!text';
import newCohortTmpl from './cohorts-new-cohort.html!text';
import cohortViewTmpl from './cohorts-view-cohort.html!text';
import cohortEditTmpl from './cohorts-edit-cohort.html!text';
import cohortStatsPageTmpl from './cohorts-view-cohort-stats-page.html!text';
import cohortRankingPageTmpl from './cohorts-view-cohort-ranking-page.html!text';
import c3 from 'c3';
import d3 from 'd3';
import './cohorts.css!';

const noop = () => undefined;

export const component = {
    controller: ViewCohortCtrl
};

export function configRoute($routeProvider, routes) {
    $routeProvider
        .when(routes.cohorts, {
            template: cohortTmpl,
            controller: ClmListCohorts,
            controllerAs: 'ctrl',
            resolve: {
                initialData: classMentorsCohortResolver
            }
        })
        .when(routes.newCohort, {
            template: newCohortTmpl,
            controller: NewCohortCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: newCohortCtrlInitialData
            }
        })
        .when(routes.viewCohort, {
            template: cohortViewTmpl,
            controller: ViewCohortCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: viewCohortCtrlInitialData
            }
        })
        .when(routes.editCohort, {
            template: cohortEditTmpl,
            controller: EditCohortCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: editCohortCtrlInitialData
            }
        });
}
configRoute.$inject = ['$routeProvider', 'routes'];

function ClmListCohorts (initialData, spfNavBarService, urlFor, spfAuthData) {

    const title = 'Cohorts';
    const parentPages = [];
    const menuItems = [];

    this.currentUser = initialData.currentUser;
    this.profile = initialData.profile;
    this.allCohorts = initialData.allCohorts;
    this.featuredCohorts = initialData.featuredCohorts;
    this.createdCohorts = initialData.createdCohorts;
    this.joinedEvents = initialData.joinedEvents;
    this.auth = initialData.auth;

    // *** Populate joined cohorts out-of-DB

    this.joinedCohorts = [];

    for(var i=0; i<this.allCohorts.length; i++) {
        var cohort = this.allCohorts[i];
        var cohortEvents = cohort.events;
        for(var j=0; j<this.joinedEvents.length; j++) {
            var eventId = this.joinedEvents[j].$id;
            if(cohortEvents.indexOf(eventId) > -1) {
                this.joinedCohorts.push(cohort);
                break;
            }
        }
    }

    // ***


    if (
        this.profile &&
        this.profile.user &&
        this.profile.user.isPremium
    ) {
        menuItems.push({
            title: 'New Cohort',
            url: `#${urlFor('newCohort')}`,
            icon: 'add'
        });
    }

    spfNavBarService.update('Cohorts', undefined, menuItems);
}
ClmListCohorts.$inject = ['initialData', 'spfNavBarService', 'urlFor', 'spfAuthData'];

function classMentorsCohortResolver($q, spfAuth, spfAuthData, clmDataStore) {
    return $q.all({
        featuredCohorts: clmDataStore.cohorts.listFeaturedCohorts(),
        auth: spfAuth,
        currentUser: spfAuthData.user().catch(function() {
            return;
        }),
        profile: clmDataStore.currentUserProfile(),
        createdCohorts: clmDataStore.cohorts.listCreatedCohorts(),
        joinedEvents: clmDataStore.events.listJoinedEvents(),
        allCohorts: clmDataStore.cohorts.listAllCohorts()
    });
}
classMentorsCohortResolver.$inject = ['$q', 'spfAuth', 'spfAuthData', 'clmDataStore'];

/**
 * NewCohortCtrl
 *
 */
function NewCohortCtrl(
    $q, $location, initialData, urlFor, spfAuthData, spfAlert, spfNavBarService, clmDataStore
) {
    var self = this;

    this.auth = initialData.auth;
    this.currentUser = initialData.currentUser;
    this.profile = initialData.profile;
    this.events = initialData.events;
    this.createdEvents = initialData.createdEvents;
    this.joinedEvents = initialData.joinedEvents;

    this.selectedEvents = [];
    this.selectedEventsNames = [];
    this.featured = false;

    this.includeCreated = false;
    this.includeJoined = false;

    this.creatingEvent = false;
    this.profileNeedsUpdate = !this.currentUser.$completed();


    spfNavBarService.update(
        'New Cohorts',
        {
            title: 'Cohorts',
            url: `#${urlFor('cohorts')}`
        }, []
    );

    this.toggle = function(item, item2, list, list2) {
        var idx = list.indexOf(item);
        if (idx > -1) {
            list.splice(idx, 1);
        }
        else {
            list.push(item);
            list2.push(item2);
        }
    };

    this.exists = function(item, list) {
        return list.indexOf(item) > -1;
    };

    function cleanProfile() {
        self.currentUser.country = cleanObj(self.currentUser.country);
        self.currentUser.school = cleanObj(self.currentUser.school);
    }

    function updateProfile(profile) {
        spfAlert.success('Profile setup.');
        self.profile = profile;
        self.profileNeedsUpdate = !self.currentUser.$completed();
    }

    this.save = function(currentUser, newCohort, events, featured) {
        var next;

        self.creatingCohort = true;

        if (!self.profile) {
            cleanProfile();
            next = spfAuthData.publicId(currentUser).then(function() {
                spfAlert.success('Public id and display name saved');
                return clmDataStore.initProfile();
            }).then(updateProfile);
        } else if (self.profileNeedsUpdate) {
            cleanProfile();
            next = self.currentUser.$save().then(function() {
                return clmDataStore.currentUserProfile();
            }).then(updateProfile);
        } else {
            next = $q.when();
        }

        next.then(function() {
            var data = Object.assign({
                owner: {
                    publicId: currentUser.publicId,
                    displayName: currentUser.displayName,
                    gravatar: currentUser.gravatar
                },
                createdAt: {
                    '.sv': 'timestamp'
                },
                events: events,
                featured: featured
            }, newCohort);

            console.log(data);

            return clmDataStore.cohorts.create(data);
        }).then(function() {
            spfAlert.success('New cohort created.');
            $location.path(urlFor('cohorts'));
        }).catch(function(e) {
            spfAlert.error(e.toString());
        }).finally(function() {
            self.creatingCohort = false;
        });
    };

    this.reset = function(cohortForm) {
        this.newCohort = {
            data: {}
        };

        if (cohortForm && cohortForm.$setPristine) {
            cohortForm.$setPristine();
        }
    };

    this.reset();
}
NewCohortCtrl.$inject = [
    '$q',
    '$location',
    'initialData',
    'urlFor',
    'spfAuthData',
    'spfAlert',
    'spfNavBarService',
    'clmDataStore'
];

function newCohortCtrlInitialData($q, spfAuth, spfAuthData, clmDataStore) {
    var profilePromise;
    var errLoggedOff = new Error('The user should be logged in to create an event.');
    var errNotPremium = new Error('Only premium users can create events.');

    if (!spfAuth.user || !spfAuth.user.uid) {
        return $q.reject(errLoggedOff);
    }

    profilePromise = clmDataStore.currentUserProfile().then(function(profile) {
        if (profile && profile.$value === null) {
            return clmDataStore.initProfile();
        }

        return profile;
    }).then(function(profile) {
        if (
            !profile ||
            !profile.user ||
            !profile.user.isPremium
        ) {
            return $q.reject(errNotPremium);
        }

        return profile;
    });

    return $q.all({
        auth: spfAuth,
        currentUser: spfAuthData.user(),
        profile: profilePromise,
        events: clmDataStore.events.list(),
        createdEvents: clmDataStore.events.listCreatedEvents(),
        joinedEvents: clmDataStore.events.listJoinedEvents()
    });
}
newCohortCtrlInitialData.$inject = ['$q', 'spfAuth', 'spfAuthData', 'clmDataStore'];

/**
 * Used to resolve `initialData` of `ViewEventCtrl`.
 *
 */
function viewCohortCtrlInitialData($q, $route, spfAuth, spfAuthData, clmDataStore) {
    var errNoCohort = new Error('Cohort not found');
    var cohortId = $route.current.params.cohortId;

    var profilePromise = clmDataStore.currentUserProfile().catch(noop);

    var cohortPromise = clmDataStore.cohorts.get(cohortId).then(function(cohort) {
        if (cohort.$value === null) {
            return $q.reject(errNoCohort);
        }
        return cohort;
    });

    var canviewPromise = $q.all({
        cohort: cohortPromise,
        profile: profilePromise
    }).then(function(data) {
        return $q.when(data.profile && data.profile.canView(data.cohort));
    });

    return $q.all({
        currentUser: spfAuthData.user().catch(noop),
        profile: profilePromise,
        cohort: cohortPromise,
        canView: canviewPromise,
        announcements: clmDataStore.cohorts.getAnnouncements(cohortId),
        events: clmDataStore.events.listAll(),
        joinedEvents: clmDataStore.events.listJoinedEventsObj(),
        createdEvents: clmDataStore.events.listCreatedEvents()
    });
}
viewCohortCtrlInitialData.$inject = [
    '$q',
    '$route',
    'spfAuth',
    'spfAuthData',
    'clmDataStore'
];

function ViewCohortCtrl(
    $log, $scope, initialData, $document, $mdDialog, $route, $firebaseObject,
    spfAlert, urlFor, firebaseApp, spfAuthData, spfNavBarService, clmDataStore
) {
    var self = this;
    var db = firebaseApp.database();
    var monitorHandler;

    this.currentUser = initialData.currentUser;
    this.cohort = initialData.cohort;
    this.participants = initialData.participants;
    this.profile = initialData.profile;
    this.announcements = initialData.announcements;
    this.events = initialData.events;
    this.isOwner = false;
    this.joinedEvents = initialData.joinedEvents;
    this.createdEvents = initialData.createdEvents;

    this.selectedEvent = null;
    this.eventChallenges = null;
    this.selectedAction = null;

    if (
        self.cohort &&
        self.cohort.owner &&
        self.cohort.owner.publicId &&
        self.currentUser &&
        self.cohort.owner.publicId === self.currentUser.publicId
    ) {
        this.isOwner = true;
    }

    updateNavbar();

    function updateNavbar() {
        spfNavBarService.update(
            self.cohort.title, {
                title: 'Cohorts',
                url: `#${urlFor('cohorts')}`
            }, getOptions()
        );
    }

    function getOptions() {
        var options = [];

        if (!self.currentUser || !self.currentUser.publicId) {
            return options;
        }

        // Add edit button
        if (self.cohort.owner.publicId === self.currentUser.publicId) {
            options.push({
                title: 'Edit',
                url: `#${urlFor('editCohort', {cohortId: self.cohort.$id})}`,
                icon: 'create'
            });
        }

        return options;
    }

    this.loadEventChallenges = function () {
      var ref = db.ref(`classMentors/eventTasks/${self.selectedEvent}`);
      var obj = $firebaseObject(ref);

      obj.$loaded().then(function() {
        self.eventChallenges = obj;
      }).catch(function(err) {
        $log.error(err);
      });
    };

    this.duplicateChallenges = function() {
        self.selectedChallenge.archived = false;
        delete self.selectedChallenge.$$mdSelectId;
        var eventIndex = 0;
        insertChallenge();
        function insertChallenge() {
            if(eventIndex < self.selectedEvents.length) {
                var eventId = self.selectedEvents[eventIndex];
                clmDataStore.events.addTask(eventId, self.selectedChallenge, true)
                    .then( function () {
                        console.log(self.selectedChallenge.title + " inserted into " + eventId);
                        eventIndex++;
                    })
                    .then(function () {
                        insertChallenge();
                    })
                    .catch(function (err) {
                        $log.error(err);
                        return err;
                    });
            } else {
                spfAlert.success(self.selectedChallenge.title + " inserted into selected events");
                self.selectedEvent = null;
                self.selectedChallenge = null;
                self.selectedEvents = null;
            }
        }
    };

    this.viewFullAnnouncement = function(content, title) {
        $mdDialog.show({
            clickOutsideToClose: true,
            parent: $document.body,
            template: '<md-dialog aria-label="Announcement dialog" class="announcement-dialog">' +
            '  <md-dialog-content class="sticky-container">'+
            '<md-subheader class="md-sticky-no-effect">{{ctrl.title}}</md-subheader>' +
            '    <div style="white-space: pre-wrap;">{{ctrl.content}}</div>'+
            '  </md-dialog-content>' +
            '  <md-dialog-actions>' +
            '    <md-button ng-click="ctrl.closeDialog()" class="md-primary">' +
            '      Close' +
            '    </md-button>' +
            '  </md-dialog-actions>' +
            '</md-dialog>',
            controller: viewAnnouncementController,
            controllerAs: 'ctrl'
        });

        function viewAnnouncementController() {
            this.content = content;
            this.title = title;
            this.closeDialog = function() {
                $mdDialog.hide();
            };
        }
    };

    //
    // function promptPassword() {
    //     if (
    //         self.event.schoolEvent && (
    //             !self.profile ||
    //             !self.profile.user ||
    //             !self.profile.user.school
    //         )
    //     ) {
    //         spfAlert.warning(
    //             'Only Students from Singapore can join this event. ' +
    //             'Maybe you profile needs to be updated.');
    //         return;
    //     }
    //     $mdDialog.show({
    //         parent: $document.body,
    //         template: passwordTmpl,
    //         controller: DialogController,
    //         controllerAs: 'ctrl'
    //     });
    //
    //     function DialogController() {
    //         this.pw = '';
    //
    //         this.join = function(pw) {
    //             clmDataStore.events.join(self.event, pw).then(function() {
    //                 spfAlert.success('You joined this event');
    //                 $mdDialog.hide();
    //                 $route.reload();
    //             }).catch(function(err) {
    //                 spfAlert.error(`Failed to add you: ${err}`);
    //             });
    //         };
    //
    //         this.closeDialog = function() {
    //             $mdDialog.hide();
    //         };
    //     }
    // }
    //
    // function cleanProfile(currentUser) {
    //     currentUser.country = cleanObj(currentUser.country);
    //     currentUser.school = cleanObj(currentUser.school);
    // }
    //
    // this.register = function(currentUser) {
    //     cleanProfile(currentUser);
    //     spfAuthData.publicId(currentUser).then(function() {
    //         spfAlert.success('Public id and display name saved');
    //         return clmDataStore.initProfile();
    //     }).then(function() {
    //         $route.reload();
    //     }).catch(function(err) {
    //         spfAlert.error('Failed to save public id');
    //         return err;
    //     });
    // };
    //
    // this.removeParticipant = function(e, event, participant) {
    //     var confirm = $mdDialog.confirm()
    //         .parent($document.body)
    //         .title(`Would you like to remove ${participant.user.displayName}?`)
    //         .content('The participant progress will be kept but he/she will not show as participant')
    //         .ariaLabel('Remove participant')
    //         .ok('Remove')
    //         .cancel('Cancel')
    //         .targetEvent(e);
    //
    //     $mdDialog.show(confirm).then(function() {
    //         clmDataStore.events.removeParticpants(event.$id, participant.$id);
    //     });
    // };
}
ViewCohortCtrl.$inject = [
    '$log',
    '$scope',
    'initialData',
    '$document',
    '$mdDialog',
    '$route',
    '$firebaseObject',
    'spfAlert',
    'urlFor',
    'firebaseApp',
    'spfAuthData',
    'spfNavBarService',
    'clmDataStore'
];

/**
 * Used to resolve `initialData` for `EditCtrl`
 *
 */
function editCohortCtrlInitialData($q, $route, spfAuthData, clmDataStore) {
    var data = baseEditCtrlInitialData($q, $route, spfAuthData, clmDataStore);

    // data.tasks = data.event.then(function(event) {
    //     return clmDataStore.events.getTasks(event.$id);
    // });

    return $q.all(data);
}
editCohortCtrlInitialData.$inject = ['$q', '$route', 'spfAuthData', 'clmDataStore'];

function EditCohortCtrl(initialData, spfNavBarService, urlFor, spfAlert, clmDataStore) {
    var self = this;

    this.currentUser = initialData.currentUser;
    this.eventsArr = initialData.eventsArr;
    this.events = initialData.events;
    this.cohort = initialData.cohort;
    this.announcements = initialData.announcements;
    this.savingCohort = false;
    this.creatingNewAnnouncement = false;
    this.newAnnouncement = {};
    this.showingEvents = false;
    this.showingAnnouncements = false;
    this.addingEvent = false;

    // For searching events
    this.mappedEvents = mapAllEvents();
    this.selectedEvent = null;
    this.searchEvent = null;
    this.querySearch = querySearch;

    function querySearch (query) {
        return query ? self.mappedEvents.filter( createFilterFor(query) ) : self.mappedEvents;
    }

    function mapAllEvents() {
        return self.eventsArr.map( function (event) {
            return {
                id: event.$id,
                value: event.title.toLowerCase(),
                title: event.title
            };
        });
    }

    function createFilterFor(query) {
        var lowercaseQuery = angular.lowercase(query);
        return function filterFn(event) {
            // to filter results based on query and ensure that user cannot select events already in the cohort
            return (event.value.indexOf(lowercaseQuery) >= 0 && self.cohort.events.indexOf(event.id) < 0);
        };
    }

    spfNavBarService.update(
        'Edit', [{
            title: 'Cohorts',
            url: `#${urlFor('cohorts')}`
        }, {
            title: this.cohort.title,
            url: `#${urlFor('viewCohort', {cohortId: this.cohort.$id})}`
        }]
    );

    this.removeCohortEvent = function(eventId, eventIndex) {
        var newEventArray = self.cohort.events;
        newEventArray.splice(eventIndex, 1);
        clmDataStore.cohorts.removeEvent(self.cohort.$id, newEventArray).then(function () {
            spfAlert.success('Removed event');
        }).catch(function (err) {
            spfAlert.error('Failed to remove event');
        });
    };

    this.saveAddedEvent = function () {
        console.log(self.selectedEvent.id + "  " + self.cohort.$id);

        clmDataStore.cohorts.addEvent(self.cohort.$id, self.selectedEvent.id, self.cohort.events.length).then(function() {
            spfAlert.success(self.selectedEvent.title + ' has been added to the cohort!');
            self.selectedEvent = null;
        }).catch(function(err) {
            spfAlert.error('Failed to add ' + self.selectedEvent.title + ' to the cohort!');
            self.selectedEvent = null;
        }).finally(function() {
            self.addingEvent = false;
        });
    };

    this.addEvent = function () {
        self.addingEvent = true;
    };

    this.closeAddingEvent = function () {
        self.addingEvent = false;
    };

    this.toggleEvents = function () {
        if(self.showingEvents) {
            self.showingEvents = false;
        } else {
            self.showingEvents = true;
        }
    };

    this.toggleAnnouncements = function () {
        if(self.showingAnnouncements) {
            self.showingAnnouncements = false;
        } else {
            self.showingAnnouncements = true;
        }
    };

    this.createNewAnnouncement = function () {
        self.creatingNewAnnouncement = true;
        self.newAnnouncement.featured = false;
        self.newAnnouncement.visible = true;
    };

    this.closeNewAnnouncement = function() {
        self.creatingNewAnnouncement = false;
    };

    this.save = function(currentUser, cohort, editCohortForm) {
        self.savingCohort = true;
        cohort.owner.publicId = currentUser.publicId;
        cohort.owner.displayName = currentUser.displayName;
        cohort.owner.gravatar = currentUser.gravatar;
        return clmDataStore.cohorts.updateCohort(cohort).then(function() {
            spfAlert.success('Cohort saved.');
            editCohortForm.$setPristine(true);
        }).catch(function() {
            spfAlert.error('Failed to save cohort.');
        }).finally(function() {
            self.savingCohort = false;
        });
    };

    this.saveAnnouncement = function(cohortId) {
        clmDataStore.cohorts.addAnnouncement(cohortId, this.currentUser, this.newAnnouncement, false).then(function() {
            spfAlert.success('Announcement created');
        }).catch(function () {
            spfAlert.error('Failed to create announcement');
        }).finally(function () {
            self.creatingNewAnnouncement = false;
            self.newAnnouncement = {};
        })
    };

    this.featureAnnouncement = function(cohortId, announcementId) {
        clmDataStore.cohorts.featureAnnouncement(cohortId, announcementId).then(function() {
            spfAlert.success('Announcement featured.');
        }).catch(function() {
            spfAlert.error('Failed to feature announcement');
        });
    };

    this.unfeatureAnnouncement = function(cohortId, announcementId) {
        clmDataStore.cohorts.unfeatureAnnouncement(cohortId, announcementId).then(function() {
            spfAlert.success('Announcement un-featured.');
        }).catch(function() {
            spfAlert.error('Failed to un-feature announcement');
        });
    };

    this.showAnnouncement = function(cohortId, announcementId) {
        clmDataStore.cohorts.showAnnouncement(cohortId, announcementId).then(function() {
            spfAlert.success('Announcement is now visible.');
        }).catch(function() {
            spfAlert.error('Failed to make announcement visible');
        });
    };

    this.hideAnnouncement = function(cohortId, announcementId) {
        clmDataStore.cohorts.hideAnnouncement(cohortId, announcementId).then(function() {
            spfAlert.success('Announcement is now hidden.');
        }).catch(function() {
            spfAlert.error('Failed to hide announcement');
        });
    };


}
EditCohortCtrl.$inject = ['initialData', 'spfNavBarService', 'urlFor', 'spfAlert', 'clmDataStore'];

function baseEditCtrlInitialData($q, $route, spfAuthData, clmDataStore) {
    var errNoCohort = new Error('Cohort not found');
    var errNotAuthorized = new Error('You cannot edit this cohort');
    var cohortId = $route.current.params.cohortId;

    var cohortPromise = clmDataStore.cohorts.get(cohortId).then(function(cohort) {
        if (cohort.$value === null) {
            return $q.reject(errNoCohort);
        }
        return cohort;
    });

    var data = {
        currentUser: spfAuthData.user(),
        announcements: clmDataStore.cohorts.getAnnouncements(cohortId),
        eventsArr: clmDataStore.events.listAllArr(),
        events: clmDataStore.events.listAll(),
        cohort: cohortPromise
    };

    data.canEdit = $q.all({
        currentUser: spfAuthData.user(),
        announcements: clmDataStore.cohorts.getAnnouncements(cohortId),
        cohort: cohortPromise
    }).then(function(result) {
        if (
            !result.currentUser.publicId ||
            !result.cohort.owner ||
            !result.cohort.owner.publicId ||
            result.cohort.owner.publicId !== result.currentUser.publicId
        ) {
            return $q.reject(errNotAuthorized);
        }
        return result;
    });
    return data;
}

export function clmCohortsStatsPageFactory() {
    return {
        template: cohortStatsPageTmpl,
        restrict: 'E',
        bindToController: true,
        scope: {
            cohort: '=',
            profile: '='
        },
        controller: ClmCohortStatsPageCtrl,
        controllerAs: 'ctrl'
    };
}

function ClmCohortStatsPageCtrl(
    $scope, $q, $log, $mdDialog, $document, $firebaseArray,
    urlFor, spfAlert, firebaseApp, clmServicesUrl, clmDataStore
) {
    var self = this;
    var db = firebaseApp.database();

    this.selectedStatistic = null;

    this.renderDashboard = function() {
        if(self.selectedStatistic) {
            if(self.selectedStatistic == 'Submission time series') {
                // How formatted data should look like
                var dataObj = {};
                // dataObj = {"setosa_x": [3.5, 3.0, 3.2, 3.1, 3.6, 3.9, 3.4, 3.4, 2.9, 3.1, 3.7, 3.4, 3.0, 3.0, 4.0, 4.4, 3.9, 3.5, 3.8, 3.8, 3.4, 3.7, 3.6, 3.3, 3.4, 3.0, 3.4, 3.5, 3.4, 3.2, 3.1, 3.4, 4.1, 4.2, 3.1, 3.2, 3.5, 3.6, 3.0, 3.4, 3.5, 2.3, 3.2, 3.5, 3.8, 3.0, 3.8, 3.2, 3.7, 3.3],
                //     "versicolor_x": [3.2, 3.2, 3.1, 2.3, 2.8, 2.8, 3.3, 2.4, 2.9, 2.7, 2.0, 3.0, 2.2, 2.9, 2.9, 3.1, 3.0, 2.7, 2.2, 2.5, 3.2, 2.8, 2.5, 2.8, 2.9, 3.0, 2.8, 3.0, 2.9, 2.6, 2.4, 2.4, 2.7, 2.7, 3.0, 3.4, 3.1, 2.3, 3.0, 2.5, 2.6, 3.0, 2.6, 2.3, 2.7, 3.0, 2.9, 2.9, 2.5, 2.8],
                //     "setosa": [0.2, 0.2, 0.2, 0.2, 0.2, 0.4, 0.3, 0.2, 0.2, 0.1, 0.2, 0.2, 0.1, 0.1, 0.2, 0.4, 0.4, 0.3, 0.3, 0.3, 0.2, 0.4, 0.2, 0.5, 0.2, 0.2, 0.4, 0.2, 0.2, 0.2, 0.2, 0.4, 0.1, 0.2, 0.2, 0.2, 0.2, 0.1, 0.2, 0.2, 0.3, 0.3, 0.2, 0.6, 0.4, 0.3, 0.2, 0.2, 0.2, 0.2],
                //     "versicolor": [1.4, 1.5, 1.5, 1.3, 1.5, 1.3, 1.6, 1.0, 1.3, 1.4, 1.0, 1.5, 1.0, 1.4, 1.3, 1.4, 1.5, 1.0, 1.5, 1.1, 1.8, 1.3, 1.5, 1.2, 1.3, 1.4, 1.4, 1.7, 1.5, 1.0, 1.1, 1.0, 1.2, 1.6, 1.5, 1.6, 1.5, 1.3, 1.3, 1.3, 1.2, 1.4, 1.2, 1.0, 1.3, 1.2, 1.3, 1.3, 1.1, 1.3]};

                var dataArr = [];
                // dataArr = [["setosa_x", 3.5, 3.0, 3.2, 3.1, 3.6, 3.9, 3.4, 3.4, 2.9, 3.1, 3.7, 3.4, 3.0, 3.0, 4.0, 4.4, 3.9, 3.5, 3.8, 3.8, 3.4, 3.7, 3.6, 3.3, 3.4, 3.0, 3.4, 3.5, 3.4, 3.2, 3.1, 3.4, 4.1, 4.2, 3.1, 3.2, 3.5, 3.6, 3.0, 3.4, 3.5, 2.3, 3.2, 3.5, 3.8, 3.0, 3.8, 3.2, 3.7, 3.3],
                //     ["versicolor_x", 3.2, 3.2, 3.1, 2.3, 2.8, 2.8, 3.3, 2.4, 2.9, 2.7, 2.0, 3.0, 2.2, 2.9, 2.9, 3.1, 3.0, 2.7, 2.2, 2.5, 3.2, 2.8, 2.5, 2.8, 2.9, 3.0, 2.8, 3.0, 2.9, 2.6, 2.4, 2.4, 2.7, 2.7, 3.0, 3.4, 3.1, 2.3, 3.0, 2.5, 2.6, 3.0, 2.6, 2.3, 2.7, 3.0, 2.9, 2.9, 2.5, 2.8],
                //     ["setosa", 0.2, 0.2, 0.2, 0.2, 0.2, 0.4, 0.3, 0.2, 0.2, 0.1, 0.2, 0.2, 0.1, 0.1, 0.2, 0.4, 0.4, 0.3, 0.3, 0.3, 0.2, 0.4, 0.2, 0.5, 0.2, 0.2, 0.4, 0.2, 0.2, 0.2, 0.2, 0.4, 0.1, 0.2, 0.2, 0.2, 0.2, 0.1, 0.2, 0.2, 0.3, 0.3, 0.2, 0.6, 0.4, 0.3, 0.2, 0.2, 0.2, 0.2],
                //     ["versicolor", 1.4, 1.5, 1.5, 1.3, 1.5, 1.3, 1.6, 1.0, 1.3, 1.4, 1.0, 1.5, 1.0, 1.4, 1.3, 1.4, 1.5, 1.0, 1.5, 1.1, 1.8, 1.3, 1.5, 1.2, 1.3, 1.4, 1.4, 1.7, 1.5, 1.0, 1.1, 1.0, 1.2, 1.6, 1.5, 1.6, 1.5, 1.3, 1.3, 1.3, 1.2, 1.4, 1.2, 1.0, 1.3, 1.2, 1.3, 1.3, 1.1, 1.3]];

                //Axis data object
                var axisParam = {};
                // axisParam = {
                //     setosa: 'setosa_x',
                //     versicolor: 'versicolor_x'
                // };

                //Initialise dataObj
                for(var e = 0; e < self.cohort.events.length; e++) {
                    dataObj[self.cohort.events[e] + "_x"] = [];
                    dataObj[self.cohort.events[e]] = [];
                    axisParam[self.cohort.events[e]] = self.cohort.events[e] + "_x";
                }

                console.log(dataObj);

                var actionsRef = db.ref('classMentors/userActions');
                var actionObj = $firebaseArray(actionsRef);

                actionObj.$loaded().then(function() {
                    self.submissionLogs = actionObj;
                }).then(function () {
                    for(var actionIndex = 0; actionIndex < self.submissionLogs.length; actionIndex++) {
                        var logHolder = self.submissionLogs[actionIndex];
                        if(self.cohort.events.indexOf(logHolder.eventId) >= 0) {
                            dataObj[logHolder.eventId + "_x"].push(logHolder.timestamp);
                            dataObj[logHolder.eventId].push(new Date(logHolder.timestamp).getMinutes());
                            // console.log(new Date(logHolder.timestamp).getDate());
                        }
                        // if(self.allLogs[actionIndex].action == 'submitLinkResponse') {
                        //     dataObj.Link.push(action.)
                        // }
                        // console.log(new Date(self.submissionLogs[actionIndex].timestamp));
                    }
                }).then(function () {
                    // var canvas = d3.select('#canvas').node(),
                    //     context = canvas.getContext("2d");
                    //
                    // var margin = {top: 20, right: 20, bottom: 30, left: 40},
                    //     width = canvas.width - margin.left - margin.right,
                    //     height = canvas.height - margin.top - margin.bottom;
                    //
                    // var svg = d3.select("svg").append("g")
                    //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                    //
                    // var x = d3.scaleLinear()
                    //     .rangeRound([0, width - 2]);
                    //
                    // var y = d3.scaleLinear()
                    //     .rangeRound([height - 2, 0]);
                    //
                    // context.translate(margin.left, margin.top);
                    // context.globalCompositeOperation = "multiply";
                    // context.fillStyle = "rgba(60,180,240,0.6)";
                    //
                    // d3.tsv("diamonds.tsv", type, function(error, diamonds) {
                    //     if (error) throw error;
                    //
                    //     x.domain(d3.extent(diamonds, function(d) { return d.carat; }));
                    //     y.domain(d3.extent(diamonds, function(d) { return d.price; }));
                    //
                    //     svg.append("g")
                    //         .attr("class", "grid grid--x")
                    //         .call(d3.axisLeft(y)
                    //             .tickSize(-width)
                    //             .tickFormat(""));
                    //
                    //     svg.append("g")
                    //         .attr("class", "grid grid--y")
                    //         .attr("transform", "translate(0," + height + ")")
                    //         .call(d3.axisBottom(x)
                    //             .tickSize(-height)
                    //             .tickFormat(""));
                    //
                    //     svg.append("g")
                    //         .attr("class", "axis axis--y")
                    //         .call(d3.axisLeft(y)
                    //             .ticks(10, "s"))
                    //         .append("text")
                    //         .attr("x", 10)
                    //         .attr("y", 10)
                    //         .attr("dy", ".71em")
                    //         .attr("fill", "#000")
                    //         .attr("font-weight", "bold")
                    //         .attr("text-anchor", "start")
                    //         .text("Price (US$)");
                    //
                    //     svg.append("g")
                    //         .attr("class", "axis axis--x")
                    //         .attr("transform", "translate(0," + height + ")")
                    //         .call(d3.axisBottom(x))
                    //         .append("text")
                    //         .attr("x", width - 10)
                    //         .attr("y", -10)
                    //         .attr("dy", "-.35em")
                    //         .attr("fill", "#000")
                    //         .attr("font-weight", "bold")
                    //         .attr("text-anchor", "end")
                    //         .text("Mass (carats)");
                    //
                    //     d3.shuffle(diamonds);
                    //     var t = d3.timer(function() {
                    //         for (var i = 0, n = 500, d; i < n; ++i) {
                    //             if (!(d = diamonds.pop())) return t.stop();
                    //             context.fillRect(x(d.carat), y(d.price), Math.max(2, x(d.carat + 0.01) - x(d.carat)), 2);
                    //         }
                    //     });
                    // });
                    //
                    // function type(d) {
                    //     d.carat = +d.carat;
                    //     d.price = +d.price;
                    //     return d;
                    // }
                    // var chart = c3.generate({
                    //     bindto: "#chart",
                    //     data: {
                    //         //Test data
                    //         // columns: [
                    //         // 	['data1', 50, 70, 30, 20, 10],
                    //         // 	['data2', 14, 56, 88, 34, 100]
                    //         // ],
                    //         json: dataObj,
                    //         type: "spline"
                    //     }
                    // });
                    for(var obj in dataObj) {
                        var newArr = [obj];
                        dataArr.push(newArr.concat(dataObj[obj]));
                        console.log(newArr.concat(dataObj[obj]));
                    }
                    console.log(dataArr);
                    console.log(axisParam);
                    console.log(dataObj);
                    var chart = c3.generate({
                        bindto: "#chart",
                        data: {
                            xs: axisParam,
                            columns: dataArr,
                            type: 'scatter'
                        },
                        axis: {
                            x: {
                                label: 'timestamp',
                                tick: {
                                    fit: false
                                }
                            },
                            y: {
                                label: 'Date of Action'
                            }
                        }
                    });
                }).catch(function (err) {
                    $log.error(err);
                });
            }
        }
    };

}
ClmCohortStatsPageCtrl.$inject = [
    '$scope',
    '$q',
    '$log',
    '$mdDialog',
    '$document',
    '$firebaseArray',
    'urlFor',
    'spfAlert',
    'firebaseApp',
    'clmServicesUrl',
    'clmDataStore'
];

export function clmCohortRankPageFactory() {
    return {
        template: cohortRankingPageTmpl,
        restrict: 'E',
        bindToController: true,
        scope: {
            cohort: '=',
            profile: '='
        },
        controller: ClmCohortRankPageCtrl,
        controllerAs: 'ctrl'
    };
}

function ClmCohortRankPageCtrl($q, $scope, $log, firebaseApp, $firebaseObject, $firebaseArray, clmDataStore, clmPagerOption) {

    var self = this;
    var db = firebaseApp.database();
    var unwatchers = [];
    this.cohortEventData = [];

    getAllEventData();
    this.cohortTotalParticipants = 0;
    function getAllEventData() {
        var iter = 0;
        loopDBEvents();
        function loopDBEvents() {
            var oneEventData = {};
            var event = self.cohort.events[iter];

            if(iter < self.cohort.events.length) {
                var participantsRef = db.ref(`classMentors/eventParticipants/${event}`);
                var participantsQuery = participantsRef.limitToLast(100);
                var participants = $firebaseArray(participantsQuery);

                participants.$loaded().then(function() {
                    var result = participants;
                    oneEventData.participants = result;
                }).catch(function (err) {
                    // prevent events with no participants from breaking the code by initialising their participant array to an empty one.
                    oneEventData.participants = [];
                    $log.error(err);
                    return err;
                }).then(function () {
                    var eventRef = db.ref(`classMentors/events/${event}`);
                    var event = $firebaseObject(eventRef);

                    event.$loaded().then(function() {
                        var result = event;
                        oneEventData.title = result.title;
                        self.cohortTotalParticipants += oneEventData.participants.length;
                        oneEventData.id = result.$id;
                        self.cohortEventData.push(oneEventData);
                        iter++;
                        loopDBEvents();
                    })
                })
            } else {
                self.cohortEventData.sort(function(a,b) {
                    return b.participants.length - a.participants.length;
                });
                var rank = 1;
                for(var i = 0; i < self.cohortEventData.length-1; i++) {
                    if(self.cohortEventData[i].participants.length > self.cohortEventData[i+1].participants.length) {
                        self.cohortEventData[i].rank = rank;
                        rank ++;
                    } else {
                        self.cohortEventData[i].rank = rank;
                    }
                }
                if(self.cohortEventData[self.cohortEventData.length-1].participants.length <= self.cohortEventData[self.cohortEventData.length-2].participants.length) {
                    self.cohortEventData[self.cohortEventData.length-1].rank = rank;
                } else {
                    rank--;
                    self.cohortEventData[self.cohortEventData.length-1].rank = rank;
                }
            }
        }
    }
}
ClmCohortRankPageCtrl.$inject = [
    '$q',
    '$scope',
    '$log',
    'firebaseApp',
    '$firebaseObject',
    '$firebaseArray',
    'clmDataStore',
    'clmPagerOption'
];
