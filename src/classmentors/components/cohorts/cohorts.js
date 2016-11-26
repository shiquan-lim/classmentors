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
        auth: spfAuth.$loaded(),
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
                spfAlert.success('Public id and display name saved.');
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
    var loggedIn = spfAuth.requireLoggedIn().catch(function() {
        return $q.reject(new Error('The user should be logged in to create an event.'));
    });

    profilePromise = loggedIn.then(function() {
        return clmDataStore.currentUserProfile();
    }).then(function(profile) {
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
            return $q.reject(new Error('Only premium users can create events.'));
        }

        return profile;
    });

    return $q.all({
        auth: spfAuth.$loaded(),
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
    spfAlert, urlFor, firebaseApp, spfAuthData, spfNavBarService, clmDataStore, $firebaseArray
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

    // this.taskType = null;
    //
    // //deciding what tasktype this is
    // this.updateTaskType = function(){
    //     if (this.eventChallenges.serviceId) {
    //         this.taskType = 'Service/Badge/Problem';
    //
    //     } else if (this.eventChallenges.linkPattern) {
    //         this.taskType = 'Link Pattern';
    //
    //     } else if (this.eventChallenges.lang) {
    //         this.taskType = 'Code';
    //
    //     } else if (this.eventChallenges.toEdit) {
    //         this.taskType = 'Profile Edit';
    //
    //     } else if (this.eventChallenges.textResponse) {
    //         this.taskType = 'Text Response';
    //
    //     } else if (this.eventChallenges.mcqQuestions) {
    //         this.taskType = 'Multiple Choice';
    //
    //     } else if (this.eventChallenges.survey) {
    //         this.taskType = 'Survey';
    //
    //     } else if (this.eventChallenges.teamFormationMethod) {
    //         this.taskType = 'Team Activities';
    //     }
    // }


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
            },getOptions()
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
                title: 'Edit This Cohort',
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

        // console.log("selected events are ",self.selectedEvents);

        // console.log("selected challenge is ", self.selectedChallenge);


        var eventIndex = 0;
        insertChallenge();
        function insertChallenge() {
            if(eventIndex < self.selectedEvents.length) {
                var eventId = self.selectedEvents[eventIndex];
                clmDataStore.events.addTask(eventId, self.selectedChallenge, true)
                    .then( function () {
                        console.log(self.selectedChallenge.title + " inserted into " + eventId +".");
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
                spfAlert.success(self.selectedChallenge.title + " inserted into selected events.");
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

    this.userQuery = '';
    this.foundUsers = null;

    this.startManageAsst = function () {
        self.selectedAction = 'cohortAsst';
    };
    this.findUsers = function () {
        var ref = db.ref(`classMentors/userProfiles`).orderByChild(`user/displayName`).startAt(self.userQuery).endAt(self.userQuery);

        var data = $firebaseArray(ref);

        data.$loaded().then(function (result) {
            self.foundUsers = result;
            console.log(self.foundUsers);
        })
    };

    this.assignCohortAssistant = function (user) {
        var asst = {
            name: user.user.displayName,
            canEdit: true,
            canReview: true
        };
        var assistantId = user.$id;
        for(let event in self.cohort.events) {
            let eventId = self.cohort.events[event];
            clmDataStore.events.addAssistant(eventId, assistantId, asst);
        };
        spfAlert.success('Added assistant.');
        this.foundUsers = null;
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
    'clmDataStore',
    '$firebaseArray'
];

/**
 * Used to resolve `initialData` for `EditCtrl`
 *
 */
function editCohortCtrlInitialData($q, $route, spfAuthData, clmDataStore) {
    var data = baseEditCtrlInitialData($q, $route, spfAuthData, clmDataStore);

    return $q.all(data);
}
editCohortCtrlInitialData.$inject = ['$q', '$route', 'spfAuthData', 'clmDataStore'];

function EditCohortCtrl(initialData, spfNavBarService, urlFor, spfAlert, clmDataStore) {
    var self = this;
    // console.log("initial data ", initialData);

    this.currentUser = initialData.currentUser;
    this.eventsArr = initialData.eventsArr;
    this.events = initialData.events;
    this.cohort = initialData.cohort;
    this.announcements = initialData.announcements;
    this.savingCohort = false;
    this.creatingNewAnnouncement = false;
    this.newAnnouncement = {};
    this.showingEvents = true;
    this.showingAnnouncements = true;
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
        }], [{
            title: 'View this Cohort',
            url: `#${urlFor('viewCohort', {cohortId: this.cohort.$id})}`,
            icon: 'arrow-back'
        }]
    );


    // spfNavBarService.update(
    //     {
    //         title: 'View this Cohort',
    //         url: `#${urlFor('viewCohort', {cohortId: this.cohort.$id})}`,
    //         icon: 'arrow-back'
    //     }
    // );

    this.removeCohortEvent = function(eventId, eventIndex) {
        var newEventArray = self.cohort.events;
        newEventArray.splice(eventIndex, 1);
        clmDataStore.cohorts.removeEvent(self.cohort.$id, newEventArray).then(function () {
            spfAlert.success('Removed event.');
        }).catch(function (err) {
            spfAlert.error('Failed to remove event.');
        });
    };

    this.saveAddedEvent = function () {
        clmDataStore.cohorts.addEvent(self.cohort.$id, self.selectedEvent.id, self.cohort.events.length).then(function() {
            self.addingEvent = false;
            spfAlert.success(self.selectedEvent.title + ' has been added to the cohort.');
            self.selectedEvent = null;
        }).catch(function(err) {
            spfAlert.error('Failed to add ' + self.selectedEvent.title + ' to the cohort.');
            self.selectedEvent = null;
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
            self.creatingNewAnnouncement = false;
            spfAlert.success('Announcement created.');
        }).catch(function () {
            spfAlert.error('Failed to create announcement.');
        }).finally(function () {
            self.newAnnouncement = {};
        })
    };

    this.featureAnnouncement = function(cohortId, announcementId) {
        clmDataStore.cohorts.featureAnnouncement(cohortId, announcementId).then(function() {
            spfAlert.success('Announcement featured.');
        }).catch(function() {
            spfAlert.error('Failed to feature announcement.');
        });
    };

    this.unfeatureAnnouncement = function(cohortId, announcementId) {
        clmDataStore.cohorts.unfeatureAnnouncement(cohortId, announcementId).then(function() {
            spfAlert.success('Announcement un-featured.');
        }).catch(function() {
            spfAlert.error('Failed to un-feature announcement.');
        });
    };

    this.showAnnouncement = function(cohortId, announcementId) {
        clmDataStore.cohorts.showAnnouncement(cohortId, announcementId).then(function() {
            spfAlert.success('Announcement is now visible.');
        }).catch(function() {
            spfAlert.error('Failed to make announcement visible.');
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
            profile: '=',
            events: '='
        },
        controller: ClmCohortStatsPageCtrl,
        controllerAs: 'ctrl'
    };
}

function ClmCohortStatsPageCtrl(
    $scope, $q, $log, $mdDialog, $document, $firebaseArray,
    urlFor, spfAlert, firebaseApp, clmServicesUrl, clmDataStore, $firebaseObject
) {
    var self = this;
    var db = firebaseApp.database();

    this.selectedStatistic = null;
    
    this.generateReportCard = function () {
        var iter = 0;
        var participantAchievements = {};
        loadParticipants();
        
        function loadParticipants() {
            var eventId = self.cohort.events[iter];

            if (iter < self.cohort.events.length) {
                var eventParticipants = $firebaseArray(db.ref(`classMentors/eventParticipants/${eventId}`));
                eventParticipants.$loaded().then(function () {
                    // console.log(eventParticipants);
                    for(let participantI in eventParticipants) {
                        let participant = eventParticipants[participantI];
                        if(!participantAchievements[participant.$id] && participant.$id != undefined) {
                            fetchParticipantInfo(participant.$id);
                        }
                    }
                    iter++;
                    loadParticipants();
                });
            }
        }
        
        function fetchParticipantInfo(participantId) {
            var participantAchievement = $firebaseObject(db.ref(`classMentors/userAchievements/${participantId}`));
            participantAchievement.$loaded().then(function () {
                if(participantAchievement.services) {
                    participantAchievements[participantId] = participantAchievement.services;
                }
            });
        }

        //after fetching all the stuff, now isolate by pivotalExpert, freeCodeCamp, codeSchool, and codeCombat. Each node has an acheivements object and a totalAchievements value.
    };

    this.renderDashboard = function() {
        if(self.selectedStatistic) {
            if(self.selectedStatistic == 'Submission time series') {
                // How formatted data should look like
                var dataObj = {};

                var dataArr = [];

                //Axis data object
                var axisParam = {};

                //Initialise dataObj
                for(var e = 0; e < self.cohort.events.length; e++) {
                    dataObj[self.events[self.cohort.events[e]].title + "_x"] = [];
                    dataObj[self.events[self.cohort.events[e]].title] = [];
                    axisParam[self.events[self.cohort.events[e]].title] = self.events[self.cohort.events[e]].title + "_x";
                }

                var actionsRef = db.ref('classMentors/userActions');
                var actionObj = $firebaseArray(actionsRef);

                actionObj.$loaded().then(function() {
                    self.submissionLogs = actionObj;
                }).then(function () {
                    for(var actionIndex = 0; actionIndex < self.submissionLogs.length; actionIndex++) {
                        var logHolder = self.submissionLogs[actionIndex];
                        if(self.cohort.events.indexOf(logHolder.eventId) >= 0) {
                            dataObj[self.events[logHolder.eventId].title + "_x"].push(logHolder.timestamp);
                            dataObj[self.events[logHolder.eventId].title].push(new Date(logHolder.timestamp).getHours()*60 + new Date(logHolder.timestamp).getMinutes());
                        }
                    }
                }).then(function () {
                    for(var obj in dataObj) {
                        var newArr = [obj];
                        dataArr.push(newArr.concat(dataObj[obj]));
                    }
                    // console.log()
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
                                    format: function (x) {
                                        var a = new Date(x);
                                        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                        var year = a.getFullYear();
                                        var month = months[a.getMonth()];
                                        var date = a.getDate();
                                        var hour = a.getHours();
                                        var min = a.getMinutes();
                                        var sec = a.getSeconds();
                                        var time = date + ' ' + month + ' ' + year;
                                        return time;
                                    },
                                    fit: false
                                }
                            },
                            y: {
                                label: 'Time of Action',
                                tick: {
                                    format: function (x) {
                                        return Math.floor(x/60) + ':' + x%60;
                                    },
                                    fit: false
                                }
                            }
                        },
                        point: {
                            r: 5
                        },
                        padding: {
                            left: 50,
                            right: 50
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
    'clmDataStore',
    '$firebaseObject'
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
    this.cohortTotalParticipants = [];
    // console.log(self.cohort);

    // *************************** Re-write code here ***************************

    var iter = 0;
    loadInitialData();

    function loadInitialData() {
        var oneEventData = {};
        var eventId = self.cohort.events[iter];

        if(iter < self.cohort.events.length) {
            var eventObj = $firebaseObject(db.ref(`classMentors/events/${eventId}`));
            eventObj.$loaded().then(
                () => (oneEventData.title = eventObj.title),
                err => {
                    oneEventData.participants = [];
                    $log.error(err);
                }
            ).then(function () {
                oneEventData.id = eventId;
                oneEventData.participants = [];
                oneEventData.qualifiedParticipants = [];
                self.cohortEventData.push(oneEventData);
                fetchParticipantInfo(eventId);
                iter++;
                loadInitialData();
            });
        }
    }

    function fetchParticipantInfo(eventId) {
        var participantsArray = $firebaseArray(db.ref(`classMentors/eventParticipants/${eventId}`));
        participantsArray.$loaded().then(
            () => (self.cohortEventData.find(e => e.id == eventId).participants = participantsArray)
        ).then(function () {
            self.cohortTotalParticipants = self.cohortTotalParticipants.concat(participantsArray);
            for(let participantIndex = 0; participantIndex < participantsArray.length; participantIndex++) {
                // console.log("User " + participantsArray[participantIndex].$id + " from event " + eventId);
                $firebaseObject(db.ref(`classMentors/userProfiles/${participantsArray[participantIndex].$id}/services`)).$loaded().then(function (result) {
                    if((result.freeCodeCamp && result.freeCodeCamp.totalAchievements >= 1) && (result.codeCombat && result.codeCombat.totalAchievements >= 1)) {
                        self.cohortEventData.find(e => e.id == eventId).qualifiedParticipants.push({displayName: participantsArray[participantIndex].user.displayName, userId: participantsArray[participantIndex].$id, score: parseInt(result.freeCodeCamp.totalAchievements) + parseInt(result.codeCombat.totalAchievements)});
                    }
                    if((result.freeCodeCamp && result.freeCodeCamp.totalAchievements >= 1) && (!result.codeCombat || result.codeCombat.totalAchievements < 1)) {
                        self.cohortEventData.find(e => e.id == eventId).qualifiedParticipants.push({displayName: participantsArray[participantIndex].user.displayName, userId: participantsArray[participantIndex].$id, score: result.freeCodeCamp.totalAchievements});
                    }
                    if((!result.freeCodeCamp || result.freeCodeCamp.totalAchievements < 1) && (result.codeCombat && result.codeCombat.totalAchievements >= 1)) {
                        self.cohortEventData.find(e => e.id == eventId).qualifiedParticipants.push({displayName: participantsArray[participantIndex].user.displayName, userId: participantsArray[participantIndex].$id, score: result.codeCombat.totalAchievements});
                    }
                    self.cohortEventData.find(e => e.id == eventId).qualifiedParticipants.sort(function(a,b) {
                        return b.score - a.score;
                    });
                })
            }
        });
    }
    // *************************** END ***************************

    // getAllEventData();
    // this.cohortTotalParticipants = 0;
    // this.showFilteredRanking = false;
    //
    // function getAllEventData() {
    //     var iter = 0;
    //     loopDBEvents();
    //     function loopDBEvents() {
    //         var oneEventData = {};
    //         var eventId = self.cohort.events[iter];
    //
    //         if(iter < self.cohort.events.length) {
    //             var participantsRef = db.ref(`classMentors/eventParticipants/${eventId}`);
    //             var participantsQuery = participantsRef;
    //             var participantsArray = $firebaseArray(participantsQuery);
    //
    //             participantsArray.$loaded().then(
    //                 () => (oneEventData.participants = participantsArray),
    //                 err => {
    //                     oneEventData.participants = [];
    //                     $log.error(err);
    //                 }
    //             ).then(function () {
    //                 var eventRef = db.ref(`classMentors/events/${eventId}`);
    //                 var eventObj = $firebaseObject(eventRef);
    //
    //                 eventObj.$loaded().then(function() {
    //                     var result = eventObj;
    //                     oneEventData.title = result.title;
    //                     self.cohortTotalParticipants += oneEventData.participants.length;
    //                     oneEventData.id = result.$id;
    //                     oneEventData.userRanks = [];
    //                     var userIndex = 0;
    //                     loadUserAchievements();
    //                     function loadUserAchievements() {
    //                         if(userIndex < oneEventData.participants.length) {
    //                             var participantRankingRef = db.ref(`classMentors/userProfiles/${oneEventData.participants[userIndex].$id}`);
    //                             var participantRankingObj = $firebaseObject(participantRankingRef);
    //                             participantRankingObj.$loaded().then(function () {
    //                                 var rankingResult = participantRankingObj;
    //                                 if(rankingResult.services && rankingResult.services.freeCodeCamp) {
    //                                     oneEventData.userRanks.push({"user": rankingResult.user, "total": parseInt(rankingResult.services.freeCodeCamp.totalAchievements)});
    //                                 } else {
    //                                     oneEventData.userRanks.push({"user": rankingResult.user, "total": 0});
    //                                 }
    //                                 userIndex++;
    //                                 loadUserAchievements();
    //                             });
    //                         } else {
    //                             self.cohortEventData.push(oneEventData);
    //                             iter++;
    //                             loopDBEvents();
    //                         }
    //                     }
    //                 });
    //             });
    //         }
    //     }
    // }
    //
    // this.fourEntryThreshold = 2;
    // this.twoEntryThreshold = 12;
    //
    // this.filterRanking = function() {
    //     if(self.showFilteredRanking) {
    //         for(let eventId in self.cohortEventData) {
    //             let event = self.cohortEventData[eventId];
    //             let totalEventScore = 0;
    //             for(let user in event.userRanks) {
    //                 let rankObj = event.userRanks[user];
    //                 if(rankObj.total) {
    //                     totalEventScore += rankObj.total;
    //                 }
    //             }
    //             self.cohortEventData[eventId].totalScore = totalEventScore;
    //         }
    //         self.cohortEventData.sort(function(a,b) {
    //             return b.totalScore - a.totalScore;
    //         });
    //         for(let placing = 0; placing < self.fourEntryThreshold; placing++) {
    //             let event = self.cohortEventData[placing];
    //             if(event) {
    //                 event.userRanks.sort(function (a,b) {
    //                     return b.total - a.total;
    //                 });
    //                 if(event.userRanks[0]) {
    //                     self.cohortEventData[placing].first = {"name": event.userRanks[0].user.displayName, "total": event.userRanks[0].total};
    //                 }
    //                 if(event.userRanks[1]) {
    //                     self.cohortEventData[placing].second = {"name": event.userRanks[1].user.displayName, "total": event.userRanks[1].total};
    //                 }
    //                 if(event.userRanks[2]) {
    //                     self.cohortEventData[placing].third = {"name": event.userRanks[2].user.displayName, "total": event.userRanks[2].total};
    //                 }
    //                 if(event.userRanks[3]) {
    //                     self.cohortEventData[placing].fourth = {"name": event.userRanks[3].user.displayName, "total": event.userRanks[3].total};
    //                 }
    //             }
    //         }
    //         for(let placing = self.fourEntryThreshold; placing < self.twoEntryThreshold; placing ++) {
    //             let event = self.cohortEventData[placing];
    //             if(event) {
    //                 event.userRanks.sort(function (a,b) {
    //                     return b.total - a.total;
    //                 });
    //                 if(event.userRanks[0]) {
    //                     self.cohortEventData[placing].first = {"name": event.userRanks[0].user.displayName, "total": event.userRanks[0].total};
    //                 }
    //                 if(event.userRanks[1]) {
    //                     self.cohortEventData[placing].second = {"name": event.userRanks[1].user.displayName, "total": event.userRanks[1].total};
    //                 }
    //             }
    //         }
    //     } else {
    //         self.cohortEventData.sort(function(a,b) {
    //             return b.participants.length - a.participants.length;
    //         });
    //     }
    // }
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
