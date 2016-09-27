/* eslint
    brace-style: "off",
    consistent-return: "off",
    eqeqeq: "off",
    func-style: "off",
    indent: ["error", 4],
    keyword-spacing: "off",
    lines-around-comment: "off",
    max-len: "off",
    newline-after-var: "off",
    no-console: "off",
    no-else-return: "off",
    no-extra-semi: "off",
    no-multiple-empty-lines: "off",
    no-underscore-dangle: "off",
    no-warning-comments: "off",
    object-curly-newline: "off",
    prefer-template: "off",
    quote-props: "off",
    quotes: "off",
    space-before-blocks: "off",
    space-before-function-paren: "off",
    spaced-comment: "off",
    valid-jsdoc: "off"
*/

import {cleanObj} from 'singpath-core/services/firebase.js';
import firebase from 'firebase';
import editTmpl from './events-view-event-edit.html!text';
import eventTableParticipantsTmpl from './events-view-event-table-participants.html!text';
import eventTableRankTmpl from './events-view-event-table-rank.html!text';
import eventTableResultsTmpl from './events-view-event-table-results.html!text';
import eventTaskFormTmpl from './events-view-event-task-form.html!text';
import eventTmpl from './events-view-event.html!text';
import listTmpl from './events-view-list.html!text';
import newTmpl from './events-view-new.html!text';
import pagerTmpl from './events-view-pager.html!text';
import passwordTmpl from './events-view-password.html!text';
import linkTmpl from './events-view-provide-link.html!text';
import responseTmpl from './events-view-provide-response.html!text';
import editProfileTmpl from './events-view-edit-profile.html!text';
import codeTmpl from './events-view-provide-code.html!text';
import mcqTmpl from './events-view-provide-mcq.html!text';
import './events.css!';
import ace from 'ace';
import 'ace/theme-monokai.js';
import 'ace/mode-javascript.js';
import 'ace/mode-html.js';
import 'ace/mode-java.js';
import 'ace/mode-python.js';

import schEngageScaleTmpl from './events-view-schEngageScale-task-form.html!text';
import motiStratLearnTmpl from './events-view-motiStratLearn-task-form.html!text';
import eduDisLearnTmpl from './events-view-eduDisLearn-task-form.html!text';

//form team import
import * as team from '../challenges/teamActivity/teamactivity.js';
// import teamFormationTmpl from './teamactivity-view-teamFormation.html!text';

const noop = () => undefined;
const TIMESTAMP = {'.sv': 'timestamp'};

export function configRoute($routeProvider, routes) {
    $routeProvider
        .when(routes.events, {
            template: listTmpl,
            controller: ClmListEvent,
            controllerAs: 'ctrl',
            resolve: {
                initialData: classMentorsEventResolver
            }
        })

        .when(routes.newEvent, {
            template: newTmpl,
            controller: NewEventCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: newEventCtrlInitialData
            }
        })

        .when(routes.oneEvent, {
            template: eventTmpl,
            controller: ViewEventCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: viewEventCtrlInitialData
            }
        })

        .when(routes.editEvent, {
            template: editTmpl,
            controller: EditEventCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: editEventCtrllInitialData
            }
        })

        .when(routes.addEventTask, {
            template: eventTaskFormTmpl,
            controller: AddEventTaskCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: addEventTaskCtrlInitialData
            }
        })

        .when(routes.editEventTask, {
            template: eventTaskFormTmpl,
            controller: EditEventTaskCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: editEventTaskCtrlInitialData
            }
        })

        .when('/events/:eventId/:taskId/survey1/:surveyTask', {

            template: schEngageScaleTmpl,
            controller: SurveyFormFillCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: addSurveyEventTaskCtrlInitialData
            }


        })
        .when('/events/:eventId/:taskId/survey2/:surveyTask', {

            template: motiStratLearnTmpl,
            controller: SurveyFormFillCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: addSurveyEventTaskCtrlInitialData
            }
        })

        .when('/events/:eventId/:taskId/survey3/:surveyTask', {

            template: eduDisLearnTmpl,
            controller: SurveyFormFillCtrl,
            controllerAs: 'ctrl',
            resolve: {
                initialData: addSurveyEventTaskCtrlInitialData
            }

        });
}

configRoute.$inject = ['$routeProvider', 'routes'];


//Create eventServiceFactory
//TODO: Edit
export function eventServiceFactory($q, $route, spfAuthData, clmDataStore, $log, spfAlert) {
    var self = this;
    var savedData = {};
    var eventService = {
        set: function (data) {
            savedData = data;
            console.log(savedData);
        },
        get: function () {
            return savedData;
        },
        save: function (event, _, task, taskType, isOpen) {
            var copy = cleanObj(task);
            console.log('Copy is.. : ', copy);

            if (taskType === 'linkPattern') {
                delete copy.badge;
                delete copy.serviceId;
                delete copy.singPathProblem;

            } else if (copy.serviceId === 'singPath') {
                delete copy.badge;
                if (copy.singPathProblem) {
                    copy.singPathProblem.path = cleanObj(task.singPathProblem.path);
                    copy.singPathProblem.level = cleanObj(task.singPathProblem.level);
                    copy.singPathProblem.problem = cleanObj(task.singPathProblem.problem);
                }
            } else {
                delete copy.singPathProblem;
                copy.badge = cleanObj(task.badge);
            }

            if (!copy.link) {
                // delete empty link. Can't be empty string
                delete copy.link;
            }

            self.creatingTask = true;
            clmDataStore.events.addTask(event.$id, copy, isOpen);
            // .then(function() {
            // spfAlert.success('Challenge created');
            // $location.path(urlFor('editEvent', {eventId: self.event.$id}));
            // }).catch(function(err) {
            //     $log.error(err);
            //     spfAlert.error('Failed to created new challenge');
            // }).finally(function() {
            //     self.creatingTask = false;
            // });
        }

    };
    return eventService;
}

eventServiceFactory.$inject = [
    '$q', '$route', 'spfAuthData', 'clmDataStore', '$log', 'spfAlert'
];
/**
 * Used to resolve `initialData` of `ClmListEvent`.
 *
 */

function classMentorsEventResolver($q, spfAuth, spfAuthData, clmDataStore) {
    return $q.all({
        events: clmDataStore.events.list(),
        auth: spfAuth.$loaded(),
        currentUser: spfAuthData.user().catch(function () {
            return;
        }),
        profile: clmDataStore.currentUserProfile(),
        createdEvents: clmDataStore.events.listCreatedEvents(),
        joinedEvents: clmDataStore.events.listJoinedEvents()
    });
}
classMentorsEventResolver.$inject = ['$q', 'spfAuth', 'spfAuthData', 'clmDataStore'];

/**
 * ClmListEvent
 *
 */
function ClmListEvent(initialData, spfNavBarService, urlFor) {
    var opts = [];

    this.currentUser = initialData.currentUser;
    this.profile = initialData.profile;
    this.events = initialData.events;
    this.createdEvents = initialData.createdEvents;
    this.joinedEvents = initialData.joinedEvents;
    this.auth = initialData.auth;

    if (
        this.profile &&
        this.profile.user &&
        this.profile.user.isPremium
    ) {
        opts.push({
            title: 'New event',
            url: `#${urlFor('newEvent')}`,
            icon: 'add'
        });
    }

    spfNavBarService.update('Events', undefined, opts);
}
ClmListEvent.$inject = ['initialData', 'spfNavBarService', 'urlFor'];

/**
 * Used to resolve `initialData` of `NewEventCtrl`.
 *
 */
function newEventCtrlInitialData($q, spfAuth, spfAuthData, clmDataStore) {
    var profilePromise;
    var loggedIn = spfAuth.requireLoggedIn().catch(function() {
        return $q.reject(new Error('The user should be logged in to create an event.'));
    });

    profilePromise = loggedIn.then(function() {
        return clmDataStore.currentUserProfile();
    }).then(function (profile) {
        if (profile && profile.$value === null) {
            return clmDataStore.initProfile();
        }

        return profile;
    }).then(function (profile) {
        if (
            !profile || !profile.user || !profile.user.isPremium
        ) {
            return $q.reject(new Error('Only premium users can create events.'));
        }

        return profile;
    });

    return $q.all({
        auth: spfAuth.$loaded(),
        currentUser: spfAuthData.user(),
        profile: profilePromise
    });
}
newEventCtrlInitialData.$inject = ['$q', 'spfAuth', 'spfAuthData', 'clmDataStore'];

/**
 * NewEventCtrl
 *
 */
function NewEventCtrl($q, $location, initialData, urlFor, spfAuthData, spfAlert, spfNavBarService, clmDataStore) {
    var self = this;

    this.auth = initialData.auth;
    this.currentUser = initialData.currentUser;
    this.profile = initialData.profile;

    this.creatingEvent = false;
    this.profileNeedsUpdate = !this.currentUser.$completed();

    spfNavBarService.update(
        'New Events',
        {
            title: 'Events',
            url: `#${urlFor('events')}`
        }, []
    );

    function cleanProfile() {
        self.currentUser.country = cleanObj(self.currentUser.country);
        self.currentUser.school = cleanObj(self.currentUser.school);
    }

    function updateProfile(profile) {
        spfAlert.success('Profile setup.');
        self.profile = profile;
        self.profileNeedsUpdate = !self.currentUser.$completed();
    }

    this.save = function (currentUser, newEvent, password) {
        var next;

        self.creatingEvent = true;

        if (!self.profile) {
            cleanProfile();
            next = spfAuthData.publicId(currentUser).then(function () {
                spfAlert.success('Public id and display name saved.');
                return clmDataStore.initProfile();
            }).then(updateProfile);
        } else if (self.profileNeedsUpdate) {
            cleanProfile();
            next = self.currentUser.$save().then(function () {
                return clmDataStore.currentUserProfile();
            }).then(updateProfile);
        } else {
            next = $q.when();
        }

        next.then(function () {
            var data = Object.assign({
                owner: {
                    publicId: currentUser.publicId,
                    displayName: currentUser.displayName,
                    gravatar: currentUser.gravatar
                },
                createdAt: {
                    '.sv': 'timestamp'
                }
            }, newEvent);

            return clmDataStore.events.create(data, password);
        }).then(function () {
            spfAlert.success('New event created.');
            $location.path(urlFor('events'));
        }).catch(function (e) {
            spfAlert.error(e.toString());
        }).finally(function () {
            self.creatingEvent = false;
        });
    };

    this.reset = function (eventForm) {
        this.newEvent = {
            data: {},
            password: ''
        };

        if (eventForm && eventForm.$setPristine) {
            eventForm.$setPristine();
        }
    };

    this.reset();
}
NewEventCtrl.$inject = [
    '$q',
    '$location',
    'initialData',
    'urlFor',
    'spfAuthData',
    'spfAlert',
    'spfNavBarService',
    'clmDataStore'
];

/**
 * Used to resolve `initialData` of `ViewEventCtrl`.
 *
 */
function viewEventCtrlInitialData($q, $route, spfAuth, spfAuthData, clmDataStore) {
    var errNoEvent = new Error('Event not found-1');
    var eventId = $route.current.params.eventId;

    var profilePromise = clmDataStore.currentUserProfile().catch(noop);

    var eventPromise = clmDataStore.events.get(eventId).then(function (event) {
        if (event.$value === null) {
            return $q.reject(errNoEvent);
        }
        return event;
    });

    var canviewPromise = $q.all({
        event: eventPromise,
        profile: profilePromise
    }).then(function (data) {
        return $q.when(data.profile && data.profile.canView(data.event));
    });

    return $q.all({
        currentUser: spfAuthData.user().catch(noop),
        profile: profilePromise,
        event: eventPromise,
        canView: canviewPromise,
        tasks: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.getTasks(eventId);
            }
        }),
        participants: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.participants(eventId);
            }
        }),
        progress: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.getProgress(eventId);
            }
        }),
        solutions: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.getSolutions(eventId);
            }
        }),
        scores: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.getScores(eventId);
            }
        }),
        assistants: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.getAssistants(eventId);
            }
        }),
        assistantObj: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.getAsstObj(eventId);
            }
        })
    });
}
viewEventCtrlInitialData.$inject = [
    '$q',
    '$route',
    'spfAuth',
    'spfAuthData',
    'clmDataStore'
];

/**
 * ViewEventCtrl
 *
 */
function ViewEventCtrl($scope, initialData, $document, $mdDialog, $route,
                       spfAlert, urlFor, spfAuthData, spfNavBarService, clmDataStore) {
    var self = this;
    var monitorHandler;

    this.currentUser = initialData.currentUser;
    this.event = initialData.event;
    this.participants = initialData.participants;
    this.profile = initialData.profile;
    this.tasks = initialData.tasks;
    this.progress = initialData.progress;
    this.solutions = initialData.solutions;
    this.scores = initialData.scores;
    this.canView = initialData.canView;
    this.viewArchived = false;
    this.selected = null;
    this.isOwner = false;
    this.assistants = initialData.assistants;
    this.assistantObj = initialData.assistantObj;
    this.asstArr = [];
    this.isReviewSuperUser = false;
    for (let asst in self.assistants) {
        if (self.assistants[asst].$id) {
            self.asstArr.push(self.assistants[asst].$id);
        }
    }

    if (
        self.event &&
        self.event.owner &&
        self.event.owner.publicId &&
        self.currentUser &&
        self.event.owner.publicId === self.currentUser.publicId
    ) {
        monitorHandler = clmDataStore.events.monitorEvent(
            this.event, this.tasks, this.participants, this.solutions, this.progress
        );
        this.isOwner = true;
    } else {
        monitorHandler = {
            update: noop,
            unwatch: noop
        };
    }

    if (self.event && self.currentUser && self.asstArr.indexOf(self.currentUser.publicId) >= 0) {
        var asst = self.assistantObj[self.currentUser.publicId];
        if (asst.canReview) {
            this.isReviewAssistant = true;
        }
        if (asst.canEdit) {
            this.isEditAssistant = true;
        }
    }

    if (self.isReviewAssistant || self.isOwner) {
        self.isReviewSuperUser = true;
    }

    $scope.$on('$destroy', function () {
        /* eslint no-unused-expressions: 0 */
        monitorHandler.unwatch();
        self.event && self.event.$destroy && self.event.$destroy();
        self.participants && self.participants.$destroy && self.participants.$destroy();
        self.profile && self.profile.$destroy && self.profile.$destroy();
        self.progress && self.progress.$destroy && self.progress.$destroy();
        self.solutions && self.solutions.$destroy && self.solutions.$destroy();
    });

    updateNavbar();

    function updateNavbar() {
        spfNavBarService.update(
            self.event.title, {
                title: 'Events',
                url: `#${urlFor('events')}`
            }, getOptions()
        );
    }

    function getOptions() {
        var options = [];

        if (!self.currentUser || !self.currentUser.publicId) {
            return options;
        }

        // add join/leave button
        if (
            self.participants &&
            self.participants.$indexFor(self.currentUser.publicId) > -1
        ) {
            options.push({
                title: 'Leave',
                onClick: function () {
                    clmDataStore.events.leave(self.event.$id).then(function () {
                        $route.reload();
                    });
                },
                icon: 'clear'
            });
        } else {
            options.push({
                title: 'Join',
                onClick: promptPassword,
                icon: 'add'
            });
        }

        // Add edit and update button
        //self.event.owner.publicId === self.currentUser.publicId
        if (self.isOwner || self.isEditAssistant) {
            options.push({
                title: 'Edit',
                url: `#${urlFor('editEvent', {eventId: self.event.$id})}`,
                icon: 'create'
            });
            options.push({
                title: 'Update',
                onClick: function () {
                    monitorHandler.update();
                },
                icon: 'loop'
            });
        }

        return options;
    }

    function promptPassword() {
        if (
            self.event.schoolEvent && (
                !self.profile || !self.profile.user || !self.profile.user.school
            )
        ) {
            spfAlert.warning(
                'Only Students from Singapore can join this event. ' +
                'Maybe your profile needs to be updated.');
            return;
        }
        $mdDialog.show({
            parent: $document.body,
            template: passwordTmpl,
            controller: DialogController,
            controllerAs: 'ctrl'
        });

        function DialogController() {
            this.pw = '';

            this.join = function (pw) {
                clmDataStore.events.join(self.event, pw).then(function () {
                    spfAlert.success('You joined this event.');
                    $mdDialog.hide();
                    $route.reload();
                }).catch(function (err) {
                    spfAlert.error(`Failed to join event. Please ensure that your password is valid and try again.`);
                    console.log(`Failed to add you: ${err}`);
                    // spfAlert.error(`Failed to add you: ${err}`);
                });
            };

            this.closeDialog = function () {
                $mdDialog.hide();
            };
        }
    }

    function cleanProfile(currentUser) {
        currentUser.country = cleanObj(currentUser.country);
        currentUser.school = cleanObj(currentUser.school);
    }

    this.register = function (currentUser) {
        cleanProfile(currentUser);
        spfAuthData.publicId(currentUser).then(function () {
            spfAlert.success('Public id and display name saved.');
            return clmDataStore.initProfile();
        }).then(function () {
            $route.reload();
        }).catch(function (err) {
            spfAlert.error('Failed to save public id.');
            return err;
        });
    };

    this.removeParticipant = function (e, event, participant) {
        var confirm = $mdDialog.confirm()
            .parent($document.body)
            .title(`Would you like to remove ${participant.user.displayName}?`)
            .content('The participant progress will be kept but he/she will not show as participant')
            .ariaLabel('Remove participant')
            .ok('Remove')
            .cancel('Cancel')
            .targetEvent(e);

        $mdDialog.show(confirm).then(function () {
            clmDataStore.events.removeParticpants(event.$id, participant.$id);
        });
    };
}
ViewEventCtrl.$inject = [
    '$scope',
    'initialData',
    '$document',
    '$mdDialog',
    '$route',
    'spfAlert',
    'urlFor',
    'spfAuthData',
    'spfNavBarService',
    'clmDataStore'
];

/**
 * Minimal resolver for `EditCtrl` and `AddEventTaskCtrl`.
 *
 * Load the event data and the current user data.
 *
 * The promise will resolved to an error if the the current user
 * is not the owner of the event.
 *
 */
function baseEditCtrlInitialData($q, $route, spfAuthData, clmDataStore) {
    var errNoEvent = new Error('Event not found-2');
    var errNotAuthaurized = new Error('You cannot edit this event');
    var eventId = $route.current.params.eventId;

    var eventPromise = clmDataStore.events.get(eventId).then(function (event) {
        if (event.$value === null) {
            return $q.reject(errNoEvent);
        }
        return event;
    });

    var data = {
        currentUser: spfAuthData.user(),
        event: eventPromise,
        participants: clmDataStore.events.participants(eventId)
    };

    data.canEdit = $q.all({
        currentUser: spfAuthData.user(),
        event: eventPromise,
        assistants: clmDataStore.events.getAsstObj(eventId)
    }).then(function (result) {
        if (
            !result.currentUser.publicId || !result.event.owner || !result.event.owner.publicId ||
            (result.event.owner.publicId !== result.currentUser.publicId)
        ) {

            if (result.assistants[result.currentUser.publicId]) {
                if (!result.assistants[result.currentUser.publicId].canEdit) {
                    return $q.reject(errNotAuthaurized);
                }
            } else {
                return $q.reject(errNotAuthaurized);
            }
        }

        return result;
    });

    return data;
}

/**
 * Used to resolve `initialData` for `EditCtrl`
 *
 */
function editEventCtrllInitialData($q, $route, spfAuthData, clmDataStore) {
    var data = baseEditCtrlInitialData($q, $route, spfAuthData, clmDataStore);

    data.tasks = data.event.then(function (event) {
        return clmDataStore.events.getTasks(event.$id);
    });

    data.assistants = data.event.then(function (event) {
        return clmDataStore.events.getAssistants(event.$id);
    });

    return $q.all(data);
}
editEventCtrllInitialData.$inject = ['$q', '$route', 'spfAuthData', 'clmDataStore'];

/**
 * EditEventCtrl
 *
 */
function EditEventCtrl(initialData, spfNavBarService, urlFor, spfAlert, clmDataStore) {
    var self = this;

    this.currentUser = initialData.currentUser;
    this.participants = initialData.participants;
    this.event = initialData.event;
    this.tasks = initialData.tasks;
    this.showingAssistants = false;
    this.showingTasks = true;
    this.assistants = initialData.assistants;
    this.newPassword = '';
    this.isOwner = false;
    this.savingEvent = false;

    if (
        self.event &&
        self.event.owner &&
        self.event.owner.publicId &&
        self.currentUser &&
        self.event.owner.publicId === self.currentUser.publicId
    ) {
        this.isOwner = true;
    }

    this.addingNewAssistant = false;
    this.newAssistant = {
        canEdit: false,
        canReview: true
    };

    // Search form variables
    this.users = mapAllUsers();
    this.selectedUser = null;
    this.searchUser = null;
    this.querySearch = querySearch;

    this.assistantArr = [];
    for (var asst in self.assistants) {
        if (self.assistants[asst].$id) {
            self.assistantArr.push(self.assistants[asst].$id);
        }
    }

    function querySearch(query) {
        return query ? self.users.filter(createFilterFor(query)) : self.users;
    }

    function mapAllUsers() {
        return self.participants.map(function (user) {
            return {
                id: user.$id,
                value: user.user.displayName.toLowerCase(),
                displayName: user.user.displayName
            };
        });
    }

    function createFilterFor(query) {
        query = query || '';
        var lowercaseQuery = query.toLowerCase();
        return function filterFn(user) {
            //Filter results in auto complete. Ensure that users who are already assistants may not be selected again
            return (user.value.indexOf(lowercaseQuery) >= 0 && self.assistantArr.indexOf(user.id) < 0);
        };
    }

    spfNavBarService.update(
        'Edit', [{
            title: 'Events',
            url: `#${urlFor('events')}`
        }, {
            title: this.event.title,
            url: `#${urlFor('oneEvent', {eventId: this.event.$id})}`
        }], [{
            title: 'New Challenge',
            url: `#${urlFor('addEventTask', {eventId: this.event.$id})}`,
            icon: 'create'
        }]
    );

    this.toggleAssistants = function () {
        if (self.showingAssistants) {
            self.showingAssistants = false;
        } else {
            if (self.isOwner) {
                self.showingAssistants = true;
            } else {
                spfAlert.error('Only the event owner may manage assistants.');
            }
        }
    };

    this.toggleTaskEditView = function () {
        if (self.showingTasks) {
            self.showingTasks = false;
        } else {
            self.showingTasks = true;
        }
    };

    this.addAssistant = function () {
        self.addingNewAssistant = true;
    };

    this.enableReview = function (eventId, assistantId, assistantName) {
        clmDataStore.events.enableAssistantReviewing(eventId, assistantId).then(function () {
            spfAlert.success(assistantName + ' can now review event challenge submissions.');
        }).catch(function () {
            spfAlert.error('Failed to change assistant rights');
        });
    };

    this.disableReview = function (eventId, assistantId, assistantName) {
        clmDataStore.events.disableAssistantReviewing(eventId, assistantId).then(function () {
            spfAlert.success(assistantName + ' can no longer review event challenge submissions.');
        }).catch(function () {
            spfAlert.error('Failed to change assistant rights.');
        });
    };

    this.enableEdit = function (eventId, assistantId, assistantName) {
        clmDataStore.events.enableAssistantEditing(eventId, assistantId).then(function () {
            spfAlert.success(assistantName + ' can now edit the event.');
        }).catch(function () {
            spfAlert.error('Failed to change assistant rights.');
        });
    };

    this.disableEdit = function (eventId, assistantId, assistantName) {
        clmDataStore.events.disableAssistantEditing(eventId, assistantId).then(function () {
            spfAlert.success(assistantName + ' can no longer edit the event.');
        }).catch(function () {
            spfAlert.error('Failed to change assistant rights.');
        });
    };

    this.removeAssistant = function (eventId, assistantId, assistantName) {
        clmDataStore.events.removeAssistant(eventId, assistantId).then(function () {
            spfAlert.success(assistantName + ' removed as event assistant.');
            if (self.assistantArr.indexOf(assistantId) >= 0) {
                self.assistantArr.splice(assistantId, 1);
            }
        }).catch(function () {
            spfAlert.error('Failed to remove assistant.');
        });
    };

    this.saveNewAssistant = function (eventId) {
        self.newAssistant.name = self.selectedUser.displayName;
        clmDataStore.events.addAssistant(eventId, self.selectedUser.id, self.newAssistant);
        self.addingNewAssistant = false;
        self.selectedUser = null;
    };

    this.closeNewAssistant = function () {
        self.addingNewAssistant = false;
    };

    this.save = function (currentUser, event, newPassword, editEventForm) {
        self.savingEvent = true;
        event.owner.publicId = currentUser.publicId;
        event.owner.displayName = currentUser.displayName;
        event.owner.gravatar = currentUser.gravatar;
        return clmDataStore.events.updateEvent(event, newPassword).then(function () {
            spfAlert.success('Event saved.');
            self.newPassword = '';
            editEventForm.$setPristine(true);
        }).catch(function (err) {
            spfAlert.error('Failed to save event.');
        }).finally(function () {
            self.savingEvent = false;
        });
    };

    this.openTask = function (eventId, taskId) {
        clmDataStore.events.openTask(eventId, taskId).then(function () {
            spfAlert.success('Challenge opened.');
        }).catch(function () {
            spfAlert.error('Failed to open challenge.');
        });
    };

    this.closeTask = function (eventId, taskId) {
        clmDataStore.events.closeTask(eventId, taskId).then(function () {
            spfAlert.success('Challenge closed.');
        }).catch(function () {
            spfAlert.error('Failed to close challenge.');
        });
    };

    this.showTask = function (eventId, taskId) {
        clmDataStore.events.showTask(eventId, taskId).then(function () {
            spfAlert.success('Challenge visible.');
        }).catch(function () {
            spfAlert.error('Failed to make challenge visible.');
        });
    };

    this.hideTask = function (eventId, taskId) {
        clmDataStore.events.hideTask(eventId, taskId).then(function () {
            spfAlert.success('Challenge hidden.');
        }).catch(function () {
            spfAlert.error('Failed to make challenge hidden.');
        });
    };

    this.archiveTask = function (eventId, taskId) {
        clmDataStore.events.archiveTask(eventId, taskId).then(function () {
            spfAlert.success('Challenge archived.');
        }).catch(function () {
            spfAlert.error('Failed to archive challenge.');
        });
    };
}
EditEventCtrl.$inject = ['initialData', 'spfNavBarService', 'urlFor', 'spfAlert', 'clmDataStore'];

/**
 * AddEventTaskCtrl initial data
 *
 */
function addEventTaskCtrlInitialData($q, $route, spfAuthData, clmDataStore) {
    var data = baseEditCtrlInitialData($q, $route, spfAuthData, clmDataStore);

    data.badges = clmDataStore.badges.all();
    data.singPath = $q.all({
        paths: clmDataStore.singPath.paths(),
        levels: [],
        problems: []
    });
    return $q.all(data);
}
addEventTaskCtrlInitialData.$inject = ['$q', '$route', 'spfAuthData', 'clmDataStore'];

/**
 * AddEventTaskCtrl
 *
 */
function AddEventTaskCtrl(initialData, $location, $log, spfAlert, urlFor, spfNavBarService, clmDataStore, $mdDialog, $scope, eventService, clmSurvey) {

    var self = this;

    this.event = initialData.event;
    this.badges = initialData.badges;
    this.isOpen = true;
    this.singPath = initialData.singPath;
    this.savingTask = false;
    this.task = {archived: false, showProgress: true};
    this.enableBeta = true;
    var location;

    this.selectedMetaData = [];

    spfNavBarService.update(
        'New Challenge', [{
            title: 'Events',
            url: `#${urlFor('events')}`
        }, {
            title: this.event.title,
            url: `#${urlFor('oneEvent', {eventId: this.event.$id})}`
        }, {
            title: 'Challenges',
            url: `#${urlFor('editEvent', {eventId: this.event.$id})}`
        }]
    );

    this.toggle = function (item, list) {
        var idx = list.indexOf(item);
        if (idx > -1) {
            list.splice(idx, 1);
        }
        else {
            list.push(item);
        }
    };

    this.exists = function (item, list) {
        return list.indexOf(item) > -1;
    };


    this.loadLevels = function (selected) {
        return clmDataStore.singPath.levels(selected.path.id).then(function (levels) {
            self.singPath.levels = levels;
        });
    };


    this.loadProblems = function (selected) {
        return clmDataStore.singPath.problems(selected.path.id, selected.level.id).then(function (problems) {
            self.singPath.problems = problems;
        });
    };

    this.challengeRouteProvider = function (tasktype, task, isOpen) {
        if (tasktype == 'service') {
            console.log('service is clicked');
            return 'Save';
        } else if (tasktype == 'singPath') {
            console.log('singpath is clicked');
            return 'Save';

        } else if (tasktype == 'linkPattern') {
            console.log('linkPattern is clicked');
            return 'Save';

        } else if (tasktype == 'textResponse') {
            console.log('textResponse is clicked');
            return 'Save';

        } else if (tasktype == 'multipleChoice') {
            console.log('multipleChoice is clicked');
            location = '/challenges/mcq';
            return 'Continue';

        } else if (tasktype == 'code') {
            console.log('code is clicked');
            return 'Save';

        } else if (tasktype == 'video') {
            console.log('video is clicked');
            return 'Continue';

        } else if (tasktype == 'teamActivity') {
            console.log('teamActivity is clicked');
            location = '/challenges/team-activity/create';
            return 'Continue';

        } else if (tasktype == 'journalling') {
            console.log('journalling is clicked');
            return 'Continue';

        } else if (tasktype == 'survey') {
            // console.log("clicked clmdataa: ", initialData.event);

            clmSurvey.set(initialData.event.$id, initialData.event, task, tasktype, isOpen);
            var obj = clmSurvey.get();
            location = '/challenges/survey';

            return 'Continue';

        } else if (tasktype === 'profileEdit') {
            return 'Save';

        } else {
            return 'Save'; // by default should show 'save'
        }
    }

    //this function double checks with user if he wishes to go back and discard all changes thus far
    this.discardChanges = function (ev) {
        var confirm = $mdDialog.confirm()
            .title('You have not saved your input information')
            .textContent('All of the information input will be discarded. Are you sure you want to continue?')
            .ariaLabel('Discard all')
            .targetEvent(ev)
            .ok('Discard All')
            .cancel('Continue editing');
        $mdDialog.show(confirm).then(function () {
            // decided to discard data, bring user to previous page
            $location.path(urlFor('editEvent', {eventId: self.event.$id}));
        });
    };

    this.saveTask = function (event, taskId, task, taskType, isOpen) {
        if (taskType === 'profileEdit') {
            task.toEdit = self.selectedMetaData;
            task.textResponse = "Placeholder";
        }

        var copy = cleanObj(task);

        //check if user keys in http inside Link Pattern
        var checkLinkPattern = copy.linkPattern;
        if (checkLinkPattern != null) {
            if (checkLinkPattern.indexOf("http:") > -1) {
                checkLinkPattern = checkLinkPattern.replace("http:", "https:");
            }
            copy.linkPattern = checkLinkPattern;
        }

        var data = {
            taskType: taskType,
            isOpen: isOpen,
            event: event,
            task: task
        };

        if (taskType === 'linkPattern') {
            delete copy.badge;
            delete copy.serviceId;
            delete copy.singPathProblem;
        } else if (copy.serviceId === 'singPath') {
            delete copy.badge;
            if (copy.singPathProblem) {
                copy.singPathProblem.path = cleanObj(task.singPathProblem.path);
                copy.singPathProblem.level = cleanObj(task.singPathProblem.level);
                copy.singPathProblem.problem = cleanObj(task.singPathProblem.problem);
            }
        } else {
            delete copy.singPathProblem;
            copy.badge = cleanObj(task.badge);
        }

        if (!copy.link) {
            // delete empty link. Can't be empty string
            delete copy.link;
        }


        self.creatingTask = true;
        if (taskType === 'multipleChoice' || taskType === 'journalling' || taskType === 'video' || taskType === 'survey' || taskType === 'teamActivity') {
            var data = {
                taskType: taskType,
                isOpen: isOpen,
                event: event,
                task: task
            };
            console.log('Data shows... ', data);
            spfNavBarService.update(
                'Challenge Details', [{
                    title: 'Events',
                    url: `#${urlFor('events')}`
                }, {
                    title: this.event.title,
                    url: `#${urlFor('oneEvent', {eventId: this.event.$id})}`
                }, {
                    title: 'Challenges',
                    url: `#${urlFor('editEvent', {eventId: this.event.$id})}`
                }]
            );
            eventService.set(data);
            $location.path(location);
        } else {
            clmDataStore.events.addTask(event.$id, copy, isOpen).then(function () {
                spfAlert.success('Challenge created.');
                $location.path(urlFor('editEvent', {eventId: self.event.$id}));
            }).catch(function (err) {
                $log.error(err);
                spfAlert.error('Failed to created new challenge.');
            }).finally(function () {
                self.creatingTask = false;
            });
        }

    };
}
AddEventTaskCtrl.$inject = [
    'initialData',
    '$location',
    '$log',
    'spfAlert',
    'urlFor',
    'spfNavBarService',
    'clmDataStore',
    '$mdDialog',
    '$scope',
    'eventService',
    'clmSurvey'
];

//////////////////////////////implemented survey challenge//////////////////////////////////////
export function clmSurveyTaskFactory() {
    var sharedData = {};
    //console.log("it comes in here");
    function set(eventId, event, task, tasktype, isOpen) {
        sharedData.eventId = eventId;
        sharedData.event = event;
        sharedData.task = task;
        sharedData.taskType = tasktype;
        sharedData.isOpen = isOpen;
        //sharedData.currentUser = spfAuthData.user();

    }

    function get() {
        return sharedData;
    }

    return {
        set: set,
        get: get
    };
}


/**
 * Used to resolve `initialData` of `EditEventTaskCtrl`.
 *
 */
function editEventTaskCtrlInitialData($q, $route, spfAuthData, clmDataStore) {
    var errNoEvent = new Error('Event not found-3');
    var errNoTask = new Error('Event not found-4');
    var errNotAuthaurized = new Error('You cannot edit this event');
    var eventId = $route.current.params.eventId;
    var taskId = $route.current.params.taskId;

    var eventPromise = clmDataStore.events.get(eventId).then(function (event) {
        if (event.$value === null) {
            return $q.reject(errNoEvent);
        }

        return event;
    });

    var taskPromise = eventPromise.then(function () {
        return clmDataStore.events.getTask(eventId, taskId).then(function (task) {
            if (!task || task.$value === null) {
                return $q.reject(errNoTask);
            }

            return task;
        });
    });

    return $q.all({
        currentUser: spfAuthData.user(),
        event: eventPromise,
        badges: clmDataStore.badges.all(),
        taskId: taskId,
        task: taskPromise,
        assistants: clmDataStore.events.getAsstObj(eventId)
    }).then(function (data) {
        if (
            !data.currentUser.publicId || !data.event.owner || !data.event.owner.publicId ||
            (data.event.owner.publicId !== data.currentUser.publicId && data.currentUser.publicId)
        ) {
            if (data.assistants[data.currentUser.publicId]) {
                if (!data.assistants[data.currentUser.publicId].canEdit) {
                    return $q.reject(errNotAuthaurized);
                }
            } else {
                return $q.reject(errNotAuthaurized);
            }
        }

        return data;
    });
}
editEventTaskCtrlInitialData.$inject = ['$q', '$route', 'spfAuthData', 'clmDataStore'];

/**
 * EditEventTaskCtrl
 *
 */


/**Todo: enable edit to multiple choice, index card, etc. **/
function EditEventTaskCtrl(initialData, spfAlert, urlFor, spfNavBarService, clmDataStore, eventService, $mdDialog, $location) {
    var self = this;

    this.event = initialData.event;
    this.badges = initialData.badges;
    this.taskId = initialData.taskId;
    this.task = initialData.task;

    this.isOpen = Boolean(this.task.openedAt);
    this.savingTask = false;
    this.enableBeta = true;
    var location;

    this.taskType = null;

    /**todo: append tasktype here **/

    if (this.task.serviceId) {
        this.taskType = 'service';

    } else if (this.task.linkPattern) {
        this.taskType = 'linkPattern';

    } else if (this.task.lang) {
        this.taskType = 'code';

    } else if (this.task.textResponse) {
        this.taskType = 'textResponse';

    } else if (this.task.mcqQuestions) {
        this.taskType = 'multipleChoice';

    }
    // else if (this.task.profileEdit) {
    //     return 'Save';
    // }

    // md-select badge list and the the ng-model are compared
    // by reference.
    if (
        this.task.badge &&
        this.task.badge.id &&
        this.badges[this.task.serviceId] &&
        this.badges[this.task.serviceId][this.task.badge.id]
    ) {
        this.task.badge = this.badges[this.task.serviceId][this.task.badge.id];
    }

    spfNavBarService.update(
        this.task.title, [{
            title: 'Events',
            url: `#${urlFor('events')}`
        }, {
            title: this.event.title,
            url: `#${urlFor('oneEvent', {eventId: this.event.$id})}`
        }, {
            title: 'Challenges',
            url: `#${urlFor('editEvent', {eventId: this.event.$id})}`
        }]
    );

    this.challengeRouteProvider = function () {
        //console.log("task type passed in is",tasktype);
        //console.log("this task type passed in is", this.taskType);

        if (this.taskType == 'service') {
            console.log('service is clicked');
            return 'Save';

        } else if (this.taskType == 'singPath') {
            console.log('singpath is clicked');
            return 'Save';

        } else if (this.taskType == 'linkPattern') {
            console.log('linkPattern is clicked');
            return 'Save';

        } else if (this.taskType == 'textResponse') {
            console.log('textResponse is clicked');
            return 'Save';

        } else if (this.taskType == 'multipleChoice') {
            console.log('multipleChoice is clicked');
            // console.log("this event url", urlFor('oneEvent', {eventId: this.event.$id}));
            location = "/challenges/mcq/edit";
            return 'Continue';

        } else if (this.taskType == 'code') {
            console.log('code is clicked');
            return 'Save';

        } else if (this.taskType == 'video') {
            console.log('video is clicked');
            return 'Continue';

        } else if (this.taskType == 'journalling') {
            console.log('journalling is clicked');
            return 'Continue';

        } else if (this.tasktype == 'teamActivity') {
            console.log('teamActivity is clicked');
            location = '/challenges/team-activity/edit';
            return 'Continue';

        } else if (this.tasktype === 'profileEdit') {
            return 'Save';

        } else {
            return 'Save';
        }
    };

    //this function double checks with user if he wishes to go back and discard all changes thus far
    this.discardChanges = function (ev) {
        var confirm = $mdDialog.confirm()
            .title('You have not saved your changes')
            .textContent('All of your changes will be discarded. Are you sure you want to continue?')
            .ariaLabel('Discard changes')
            .targetEvent(ev)
            .ok('Discard my changes')
            .cancel('Continue editing');
        $mdDialog.show(confirm).then(function () {
            // decided to discard data, bring user to previous page
            $location.path(urlFor('editEvent', {eventId: self.event.$id}));

        });
    };

    this.saveTask = function (event, taskId, task, taskType, isOpen) {
        var copy = cleanObj(task);

        //check if user keys in http inside Link Pattern
        var checkLinkPattern = copy.linkPattern;
        if (checkLinkPattern != null) {
            if (checkLinkPattern.indexOf("http:") > -1) {
                checkLinkPattern = checkLinkPattern.replace("http:", "https:");
            }
            copy.linkPattern = checkLinkPattern;
        }

        var data = {
            taskType: taskType,
            isOpen: isOpen,
            event: event,
            task: task
        };

        if (taskType === 'linkPattern') {
            delete copy.badge;
            delete copy.serviceId;
            delete copy.singPathProblem;
        } else if (copy.serviceId === 'singPath') {
            delete copy.badge;
            if (copy.singPathProblem) {
                copy.singPathProblem.path = cleanObj(task.singPathProblem.path);
                copy.singPathProblem.level = cleanObj(task.singPathProblem.level);
                copy.singPathProblem.problem = cleanObj(task.singPathProblem.problem);
            }
        } else {
            delete copy.singPathProblem;
            copy.badge = cleanObj(task.badge);
        }

        if (!copy.link) {
            // delete empty link. Can't be empty string
            delete copy.link;
        }

        self.creatingTask = true;
        if (taskType === 'multipleChoice' || taskType === 'journalling' || taskType === 'video' || taskType === 'survey') {
            var data = {
                taskType: taskType,
                isOpen: isOpen,
                event: event,
                task: task
            };

            spfNavBarService.update(
                'New Challenge Details', [{
                    title: 'Events',
                    url: `#${urlFor('events')}`
                }, {
                    title: this.event.title,
                    url: `#${urlFor('oneEvent', {eventId: this.event.$id})}`
                }, {
                    title: 'Challenges',
                    url: `#${urlFor('editEvent', {eventId: this.event.$id})}`
                }]
            );

            eventService.set(data);

            $location.path(location);

        } else {
            self.savingTask = true;
            clmDataStore.events.updateTask(event.$id, taskId, copy).then(function () {
                if (
                    (isOpen && task.openedAt) ||
                    (!isOpen && task.closedAt)
                ) {
                    return;
                } else if (isOpen) {
                    return clmDataStore.events.openTask(event.$id, taskId);
                }

                return clmDataStore.events.closeTask(event.$id, taskId);
            }).then(function () {
                spfAlert.success('Challenge saved.');
            }).catch(function () {
                spfAlert.error('Failed to save the challenge.');
            }).then(function() {
                self.savingTask = false;
            });
        }

    };
}
EditEventTaskCtrl.$inject = [
    'initialData',
    'spfAlert',
    'urlFor',
    'spfNavBarService',
    'clmDataStore',
    'eventService',
    '$location',
    '$mdDialog',
    '$location',
    'eventService'
];


/**
 * Show event tasks and participants progress in a paged table.
 *
 */
export function clmEventTableFactory() {
    return {
        template: eventTableParticipantsTmpl,
        restrict: 'E',
        bindToController: true,
        scope: {
            event: '=',
            profile: '=',
            participants: '=',
            tasks: '=',
            progress: '=',
            solutions: '=',
        },
        controller: ClmEventTableCtrl,
        controllerAs: 'ctrl'
    };
}

function ClmEventTableCtrl($scope, $q, $log, $mdDialog, $document,
                           urlFor, spfAlert, clmServicesUrl, clmDataStore, clmPagerOption,
                           eventService, $location, routes, $route, spfAuthData, authFirebaseApp,
                           firebaseApp, $firebaseArray, $firebaseObject) {
    var authDb = authFirebaseApp.database();
    var self = this;
    var unwatchers = [];

    this.currentUserParticipant = undefined;
    this.participantsView = [];
    this.visibleTasks = [];
    this.taskCompletion = {};

    this.orderOptions = {
        key: undefined,
        reversed: false
    };

    //Find superReviewUser rights
    // console.log(self.profile);
    this.isReviewSuperUser = false;
    if (self.event.owner.publicId == self.profile.$id) {
        self.isReviewSuperUser = true;
    }
    if (self.event.assistants) {
        if (self.event.assistants[self.profile.$id]) {
            if (self.event.assistants[self.profile.$id].canReview) {
                self.isReviewSuperUser = true;
            }
        }
    }

    this.pagerOptions = clmPagerOption();
    unwatchers.push(self.pagerOptions.$destroy.bind(self.pagerOptions));

    /**
     * Get current user participant row
     */
    function currentUserParticipant() {
        if (
            !self.participants || !self.participants.$getRecord || !self.profile || !self.profile.$id
        ) {
            self.currentUserParticipant = undefined;
        }

        self.currentUserParticipant = self.participants.$getRecord(self.profile.$id);
    }

    /**
     * Set list of visible tasks and the % completion.
     *
     */
    function visibleTasks() {
        if (!self.tasks || !self.tasks.filter) {
            self.visibleTasks = [];
            return;
        }

        self.visibleTasks = self.tasks.filter(function (t) {
            return !t.hidden && !t.archived;
        });

        taskCompletion();
    }

    /**
     * Calculate all visible tasks completion rate.
     *
     */
    function taskCompletion() {
        self.taskCompletion = self.visibleTasks.reduce(function (all, task) {
            all[task.$id] = _taskCompletion(task.$id);
            return all;
        }, {});
    }

    /**
     * Return the completion rate of a task.
     *
     */
    function _taskCompletion(taskId) {
        var participantCount, participantsIds;

        if (!self.participants || !self.progress) {
            return 0;
        }
        participantCount = self.participants.length;
        participantsIds = self.participants.reduce(function (all, participant) {
            if (participant.$id) {
                all[participant.$id] = true;
            }
            return all;
        }, {});

        if (participantCount < 1) {
            return 0;
        }

        return Object.keys(self.progress).filter(function (publicId) {
                return (
                    participantsIds[publicId] && // Make sure user is still participating
                    // (user progress is kept when they leave)
                    self.progress[publicId] &&
                    self.progress[publicId][taskId] &&
                    self.progress[publicId][taskId].completed
                );
            }).length / participantCount * 100;
    }

    function _completionComparer(options) {
        var taskId = options.key;

        return function (a, b) {
            var aP = (
                self.progress &&
                self.progress[a.$id] &&
                self.progress[a.$id][taskId] &&
                self.progress[a.$id][taskId].completed
            );
            var bP = (
                self.progress &&
                self.progress[b.$id] &&
                self.progress[b.$id][taskId] &&
                self.progress[b.$id][taskId].completed
            );

            if (aP === bP) {
                return 0;
            } else if (aP) {
                return 1;
            }

            return -1;
        };
    }

    function _solutionComparer(options) {
        var taskId = options.key;
        var task = self.tasks.$getRecord(taskId);

        if (!task || (!task.textResponse && !task.linkPattern)) {
            return noop;
        }

        return function (a, b) {
            var aS = (
                    self.solutions &&
                    self.solutions[a.$id] &&
                    self.solutions[a.$id][taskId]
                ) || '';
            var bS = (
                    self.solutions &&
                    self.solutions[b.$id] &&
                    self.solutions[b.$id][taskId]
                ) || '';

            return aS.localeCompare(bS);
        };
    }

    function _compareName(a, b) {
        var aN = (a.user && a.user.displayName) || '';
        var bN = (b.user && b.user.displayName) || '';

        return aN.localeCompare(bN);
    }

    function sortedParticipants(participants, options) {
        var rows = participants.filter(function (p) {
            return p.$id !== self.profile.$id;
        });
        var comparer;

        if (options.key) {
            comparer = chainComparer([_completionComparer(options), _solutionComparer(options), _compareName]);
        } else {
            comparer = _compareName;
        }

        rows.sort(reverseComparer(options.reversed, comparer));
        return rows;
    }

    // Update the pager rowCount
    // (the pager should trigger a range update which will call participantsView)
    function updateParticipantRowCount() {
        currentUserParticipant();

        if (self.currentUserParticipant) {
            self.pagerOptions.setRowCount(self.participants.length - 1);
        } else {
            self.pagerOptions.setRowCount(self.participants.length);
        }
    }

    /**
     * Set the slice of participant to show.
     *
     */
    function participantsView() {
        var rows = sortedParticipants(self.participants, self.orderOptions);

        self.participantsView = rows.slice(self.pagerOptions.range.start, self.pagerOptions.range.end);
    }

    /**
     * Switch ordering key or ordering direction.
     *
     * If the ordering key is changing, the ordering direction should be
     * ascendent.
     *
     * If the order key is not changing, the direction should be switched.
     *
     */
    this.orderBy = function (taskId) {
        self.orderOptions.reversed = (
            !self.orderOptions.reversed &&
            (self.orderOptions.key === taskId)
        );
        self.orderOptions.key = taskId;
        participantsView();
    };

    function defaultLinker(task, serviceProfile) {
        if (
            !serviceProfile || !serviceProfile.details || !serviceProfile.details.id || !task || !task.badge || !task.badge.url
        ) {
            return `#${urlFor('editProfile')}`;
        }

        return task.badge.url;
    }

    var linkers = {
        codeSchool: defaultLinker,
        codeCombat: defaultLinker,

        singPath: function (task) {
            if (!task || task.serviceId !== 'singPath') {
                return '';
            }

            if (
                !task.singPathProblem || !task.singPathProblem.path || !task.singPathProblem.path.id || !task.singPathProblem.level || !task.singPathProblem.level.id || !task.singPathProblem.problem || !task.singPathProblem.problem.id
            ) {
                return clmServicesUrl.singPath;
            }

            return (
                clmServicesUrl.singPath + '/#' +
                '/paths/' + task.singPathProblem.path.id +
                '/levels/' + task.singPathProblem.level.id +
                '/problems/' + task.singPathProblem.problem.id + '/play'
            ).replace(/\/+/, '/');
        }
    };

    this.startLink = function (task, profile) {
        var serviceProfile;

        if (
            !task || !task.serviceId || !linkers[task.serviceId]
        ) {
            return '';
        }

        serviceProfile = profile && profile.services && profile.services[task.serviceId];
        return linkers[task.serviceId](task, serviceProfile);
    };

    var trackedServices = {
        codeSchool: true,
        codeCombat: true
    };

    this.startMCQ = function (eventId, taskId, task, participant, userSolution) {
        // Assign eventTable variables to data
        // var data = {
        //     eventId: eventId,
        //     taskId: taskId,
        //     task: task,
        //     participant: participant,
        //     userSolution: userSolution
        // }
        // // Store data in eventService
        // eventService.set(data);
        console.log("participant isss:", participant);
        $location.path('/events/' + eventId + '/challenges/' + taskId + '/mcq/start');
    }

    this.startTRAT = function(eventId, taskId, task, participant){
        var data = {
          eventId: eventId,
          taskId: taskId,
          task: task,
          participant: participant
          
        }
        // Store data in eventService
        eventService.set(data);

        $location.path('/events/' + eventId + '/challenges/' + taskId + '/TRAT/start');
    }

    this.mustRegister = function (task, profile) {
        return Boolean(
            task &&
            task.serviceId &&
            trackedServices[task.serviceId] && (
                !profile || !profile.services || !profile.services[task.serviceId] || !profile.services[task.serviceId].details || !profile.services[task.serviceId].details.id
            )
        );
    };

    this.editProfileInfo = function (eventId, taskId, task, participant) {
        console.log(task);
        $mdDialog.show({
            clickOutsideToClose: true,
            parent: $document.body,
            template: editProfileTmpl,
            controller: DialogController,
            controllerAs: 'ctrl'
        });

        function DialogController() {
            var self = this;
            this.task = task;
            this.yearOpts = ['born before 1990'];
            this.userData = {};
            for (var y = 1991; y <= 2011; y++) {
                self.yearOpts.push(y);
            }

            clmDataStore.getProfileData(participant.$id).then(function (promise) {
                return promise;
            }).then(function (data) {
                self.participantInfo = data;
                console.log(self.participantInfo);
                if (self.participantInfo.yearOfBirth) {
                    self.userData.yearOfBirth = self.participantInfo.yearOfBirth;
                }
                if (self.participantInfo.school) {
                    self.userData.school = self.participantInfo.school;
                }
            }).catch(function (err) {
                $log.error(err);
                return err;
            });

            clmDataStore.getSchools().then(function (promise) {
                return promise;
            }).then(function (data) {
                self.schools = data;
            }).catch(function (err) {
                $log.error(err);
                return err;
            });

            this.camelText = function (input) {
                return input.replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
                    return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
                }).replace(/\s+/g, '');
            };

            this.save = function () {
                self.userData.displayName = self.participantInfo.displayName;
                self.userData.gravatar = self.participantInfo.gravatar;

                if (!self.userData.yearOfBirth) {
                    self.userData.yearOfBirth = self.participantInfo.yearOfBirth;
                } else {
                    spfAuthData.user().then(function(data) {
                        var ref = authDb.ref(`auth/users/${data.$id}/yearOfBirth`);

                        return ref.set(self.userData.yearOfBirth);
                    }).catch(noop);
                }

                if (!self.userData.school) {
                    self.userData.school = self.participantInfo.school;
                } else {
                    spfAuthData.user().then(function(data) {
                        var ref = authDb.ref(`auth/users/${data.$id}/school`);

                        ref.set(cleanObj(self.userData.school));
                    });
                }
                // if(!self.userData.country) {
                //     self.userData.country = self.participantInfo.country;
                // }

                self.userData.publicId = participant.$id;
                clmDataStore.events.submitSolution(eventId, taskId, participant.$id, JSON.stringify(self.userData)).then(function () {

                }).catch(function (err) {
                    $log.error(err);
                    spfAlert.error('Failed to register submission.');
                    return err;
                });
                clmDataStore.updateProfile(self.userData).then(function () {
                    $mdDialog.hide();
                    spfAlert.success('Profile updated.');
                }).catch(function (err) {
                    $log.error(err);
                    spfAlert.error('Failed to update your profile.');
                    return err;
                });

                // if(self.userData.school) {
                //     spfFirebase.set(['auth/users'], actionObj);
                // }
            };

            this.cancel = function () {
                $mdDialog.hide();
            };
        }
    };
    this.promptForLink = function (eventId, taskId, task, participant, userSolution) {
        $mdDialog.show({
            parent: $document.body,
            template: linkTmpl,
            controller: DialogController,
            controllerAs: 'ctrl'
        });

        function DialogController() {
            this.task = task;
            if (
                userSolution &&
                userSolution[taskId]
            ) {
                this.solution = userSolution[taskId];
            }

            this.save = function (link) {
                if (link.indexOf("http:") > -1) {
                    link = link.replace("http:", "https:");
                }
                clmDataStore.events.submitSolution(eventId, taskId, participant.$id, link).then(function () {
                    $mdDialog.hide();
                    spfAlert.success('Link is saved.');
                }).catch(function (err) {
                    $log.error(err);
                    spfAlert.error('Failed to save the link.');
                    return err;
                });
                clmDataStore.logging.inputLog({
                    action: "submitLinkResponse",
                    publicId: self.profile.$id,
                    eventId: self.event.$id,
                    taskId: taskId,
                    timestamp: TIMESTAMP
                });
            };

            this.cancel = function () {
                $mdDialog.hide();
            };
        }
    };


    this.promptForTeamFormation = function (eventId, taskId, task, participant, userSolution) {
        var db = firebaseApp.database();
        $mdDialog.show({
            parent: $document.body,
            template: team.teamFormationTmpl,
            controller: DialogController,
            controllerAs: 'ctrl',
            resolve:{
                initialData: teamFormationInitialData
            }
        });

        function teamFormationInitialData(){
          console.log('InitialData loaded');
        //   var teamEventPromise = spfFirebase.loadedArray(['classMentors/eventTeams/',eventId,taskId]);
            var ref = db.ref(`classMentors/eventTeams/${eventId}/${taskId}`);
            var teamEventPromise = $firebaseArray(ref);
            return $q.all({
                teams: teamEventPromise.$loaded().then(function (result) {
                    console.log(result);
                    return result;
                }),
                selectedTeam: teamEventPromise.$loaded().then(function (result){
                  console.log(result);
                  var teams = result;
                  for(var i = 0; i < teams.length; i ++){
                    var team = teams[i];
                    // If participant's public Id can be found, return team index.
                    console.log('Team: ', team);
                    console.log('Participant id: ', participant.$id);
                    if(team[participant.$id]){
                      return i;
                    }
                  }
                  return undefined;
                })
            });
        };

        function DialogController(initialData){
            console.log('initial data is: ',initialData);
            var self = this;
            // Learning point here. undefined means not yet assigned a value. Whereas null is a special object.
            self.selectedTeam = initialData.selectedTeam; 
            console.log(self.selectedTeam);
            self.teams = {}
            self.teams = initialData.teams;
            console.log(self.teams);
            var previousSelectedTeam = undefined;
            var index2 = undefined;
            for(var i = 0; i < self.teams.length; i++){
                if(self.teams[i][participant.$id]){
                    index2 = i;
                    break;
                }
            }
            console.log("participant id isss:", participant.$id);
            self.onChange = function(index){
              console.log('onChange fired');
              console.log(index);

              // If user has not joined any team before
              if(previousSelectedTeam == undefined){
                if(index2 != undefined){
                    leaveTeam(index2);
                }
                joinTeam(index);
                previousSelectedTeam = index;
              }else if(index != previousSelectedTeam){ //Check if selected index has changed, else do nothing.
                // Leave previous team.

                leaveTeam(previousSelectedTeam);
                // Join new team.
                joinTeam(index);
                previousSelectedTeam = index;
              }
            }

            function leaveTeam(index){
             var team = self.teams[index];
             var ref = db.ref(`classMentors/eventTeams/${eventId}/${taskId}/${team.$id}/${participant.$id}`);
             console.log(ref);
            //  spfFirebase.remove(['classMentors/eventTeams/',eventId,taskId,team.$id,participant.$id])
             ref.remove().then(function(){
               team.currentSize -= 1;
             });
            }
            
            function joinTeam(index){
              var team = self.teams[index];
              var ref = db.ref(`classMentors/eventTeams/${eventId}/${taskId}/${team.$id}/${participant.$id}`);
              // spfFirebase.set(['classMentors/eventTeams/',eventId,taskId,team.$id,participant.$id],participant.user)
              console.log(participant.user);
              ref.set(participant.user).then(function(){
               team.currentSize += 1;
                clmDataStore.events.submitSolution(eventId, taskId, participant.$id, "Completed");
             });
            }

            

            this.save = function () {

            };

            this.cancel = function () {
                $mdDialog.hide();
            };

        }
        DialogController.$inject = ['initialData'];

    };


    this.promptForSurvey = function (eventId, taskId, task, participant, userSolution) {

        if (task.survey === "School engagement scale") {

            $location.path('/events/' + eventId + '/' + taskId + '/survey1/' + task.survey);

        }
        if (task.survey === "Motivated strategies for learning") {
            //console.log("motivated strategies came in here");
            //route to the below specified url
            $location.path('/events/' + eventId + '/' + taskId + '/survey2/' + task.survey);
        }
        if (task.survey === "Education vs Dissatisfaction with learning") {
            $location.path('/events/' + eventId + '/' + taskId + '/survey3/' + task.survey);

        }

    };

    this.promptForTextResponse = function (eventId, taskId, task, participant, userSolution) {
        $mdDialog.show({
            parent: $document.body,
            template: responseTmpl,
            controller: DialogController,
            controllerAs: 'ctrl'
        });

        function DialogController() {
            this.task = task;
            if (
                userSolution &&
                userSolution[taskId]
            ) {
                this.solution = userSolution[taskId];
            }

            this.save = function (response) {
                console.log("this response is: ", response);
                //this line adds solution to firebase
                clmDataStore.events.submitSolution(eventId, taskId, participant.$id, response).then(function () {
                    $mdDialog.hide();
                    spfAlert.success('Response is saved.');
                }).catch(function (err) {
                    $log.error(err);
                    spfAlert.error('Failed to save your response.');
                    return err;
                });
                clmDataStore.logging.inputLog({
                    action: "submitTextResponse",
                    publicId: self.profile.$id,
                    eventId: self.event.$id,
                    taskId: taskId,
                    timestamp: TIMESTAMP
                });
            };

            this.cancel = function () {
                $mdDialog.hide();
            };
        }
    };

    this.promptForCodeResponse = function (eventId, taskId, task, participant, userSolution) {
        $mdDialog.show({
            clickOutsideToClose: true,
            parent: $document.body,
            template: codeTmpl,
            controller: CodeController,
            controllerAs: 'ctrl',
            onComplete: loadEditor
        });

        this.loadingEditor = true;
        var parent = this;

        function loadEditor() {
            var editor = ace.edit($document[0].querySelector('#editor'));
            editor.setTheme("ace/theme/monokai");
            editor.getSession().setMode("ace/mode/" + task.lang.toLowerCase());
            editor.getSession().setUseWrapMode(true);
            parent.loadingEditor = false;
        }

        function CodeController() {
            this.task = task;

            this.checkEditor = function () {
                return parent.loadingEditor;
            };

            if (
                userSolution &&
                userSolution[taskId]
            ) {
                this.solution = userSolution[taskId];
            }

            this.save = function () {
                var editor = ace.edit($document[0].querySelector('#editor'));
                var response = editor.getValue();
                clmDataStore.events.submitSolution(eventId, taskId, participant.$id, response).then(function () {
                    $mdDialog.hide();
                    spfAlert.success('Response is saved.');
                }).catch(function (err) {
                    $log.error(err);
                    spfAlert.error('Failed to save your response.');
                    return err;
                });
                clmDataStore.logging.inputLog({
                    action: "submitCodeResponse",
                    publicId: self.profile.$id,
                    eventId: self.event.$id,
                    taskId: taskId,
                    timestamp: TIMESTAMP
                });
            };

            this.cancel = function () {
                $mdDialog.hide();
            };
        }
    };

    this.viewCodeResponse = function (task, solution) {
        $mdDialog.show({
            clickOutsideToClose: true,
            parent: $document.body,
            template: codeTmpl,
            controller: CodeController,
            controllerAs: 'ctrl',
            onComplete: loadEditor
        });

        this.loadingEditor = true;
        var parent = this;

        function loadEditor() {
            var editor = ace.edit($document[0].querySelector('#editor'));
            editor.setTheme("ace/theme/monokai");
            editor.getSession().setMode("ace/mode/" + task.lang.toLowerCase());
            editor.getSession().setUseWrapMode(true);
            parent.loadingEditor = false;
        }

        function CodeController() {
            this.task = task;

            this.checkEditor = function () {
                return parent.loadingEditor;
            };

            this.solution = solution;

            this.cancel = function () {
                $mdDialog.hide();
            };
        }
    };

    this.update = function () {
    };
    /*
     this.update = function(event, tasks, userSolutions, profile) {
     return clmDataStore.events.updateCurrentUserProfile(
     event, tasks, userSolutions, profile
     ).then(function() {
     spfAlert.success('Profile updated');
     }).catch(function(err) {
     $log.error(err);
     spfAlert.error('Failed to update profile');
     });
     };*/

    this.removeParticipant = function (e, event, participant) {
        var confirm = $mdDialog.confirm()
            .parent($document.body)
            .title(`Would you like to remove ${participant.user.displayName}?`)
            .content('The participant progress will be kept but he/she will not show as participant')
            .ariaLabel('Remove participant')
            .ok('Remove')
            .cancel('Cancel')
            .targetEvent(e);

        $mdDialog.show(confirm).then(function () {
            clmDataStore.events.removeParticpants(event.$id, participant.$id);
        });
    };

    // load up resources and start firebase watcher
    this.loading = true;
    $q.all({
        userProgress: clmDataStore.events.getUserProgress(this.event.$id, this.profile.$id).then(function (progress) {
            self.currentUserProgress = progress;
            unwatchers.push(progress.$destroy.bind(progress));
            return progress;
        }),
        userSolution: clmDataStore.events.getUserSolutions(this.event.$id, this.profile.$id).then(function (solutions) {
            self.currentUserSolutions = solutions;
            unwatchers.push(solutions.$destroy.bind(solutions));
            return solutions;
        }),
        singpathQueuedSolution: clmDataStore.singPath.queuedSolutions(this.profile.$id).then(function (paths) {
            unwatchers.push(paths.$destroy.bind(paths));
            return paths;
        })
    }).then(function (results) {

        visibleTasks();

        // Set the participant view (via the pager range update event)
        unwatchers.push(self.pagerOptions.onChange(participantsView));
        updateParticipantRowCount();

        // Monitor updates on task progress and participants list.
        unwatchers.push(self.tasks.$watch(visibleTasks));
        unwatchers.push(self.progress.$watch(taskCompletion));
        unwatchers.push(self.participants.$watch(taskCompletion));
        unwatchers.push(self.participants.$watch(updateParticipantRowCount));

        return results;
    }).finally(function () {
        self.loading = false;
    }).then(function (results) {
        var update = function () {
            // Removed due to June 2016 profile updating process change.

            // return clmDataStore.events.updateCurrentUserProfile(
            // self.event,
            // self.tasks,
            // results.userSolution,
            // self.profile
            // );

        };

        // Watch for singpath problem getting updated
        unwatchers.push(results.singpathQueuedSolution.$watch(update));

        return update();
    }).catch(function (err) {
        $log.error(err);
    });

    // clean up.
    $scope.$on('$destroy', function () {
        unwatchers.forEach(function (f) {
            if (f) {
                try {
                    f();
                } catch (err) {
                    $log.error(err);
                }
            }
        });
    });
}
ClmEventTableCtrl.$inject = [
    '$scope',
    '$q',
    '$log',
    '$mdDialog',
    '$document',
    'urlFor',
    'spfAlert',
    'clmServicesUrl',
    'clmDataStore',
    'clmPagerOption',
    'eventService',
    '$location',
    'routes',
    '$route',
    'spfAuthData',
    'authFirebaseApp',
    'firebaseApp', 
    '$firebaseArray', 
    '$firebaseObject'
];

//TODO: include the event to load initial data into surveyformfillctrl
function addSurveyEventTaskCtrlInitialData($q, $route, firebaseApp, $firebaseArray, spfAuthData, clmDataStore) {
    //TODO: load and assign initial data for the survey form
    // var eventId = $route.current.params.eventId
    // var eventPromise = clmDataStore.events.get(eventId);
    var db = firebaseApp.database();
    console.log("this firebaseapp database is", db);
    var errNoEvent = new Error('Event not found');
    var eventId = $route.current.params.eventId;

    var profilePromise = clmDataStore.currentUserProfile().catch(noop);

    var eventPromise = clmDataStore.events.get(eventId).then(function (event) {
        if (event.$value === null) {
            return $q.reject(errNoEvent);
        }
        return event;
    });

    var canviewPromise = $q.all({
        event: eventPromise,
        profile: profilePromise
    }).then(function (data) {
        return $q.when(data.profile && data.profile.canView(data.event));
    });


    //returns a promise object from firebase
    var surveyRef = db.ref('classMentors/surveyTemplate');
    var survey = $firebaseArray(surveyRef);

    return $q.all({
        currentUser: spfAuthData.user().catch(noop),
        profile: profilePromise,
        event: eventPromise,
        canView: canviewPromise,
        survey2: survey.$loaded().then(function() {
            return survey;
        }),
        tasks: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.getTasks(eventId);
            }
        }),
        participants: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.participants(eventId);
            }
        }),
        progress: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.getProgress(eventId);
            }
        }),
        solutions: canviewPromise.then(function (canView) {
            if (canView) {
                return clmDataStore.events.getSolutions(eventId);
            }
        })
    });

}

addSurveyEventTaskCtrlInitialData.$inject = [
    '$q',
    '$route',
    'firebaseApp',
    '$firebaseArray',
    'spfAuthData',
    'clmDataStore'
];

//TODO: include controller for the survey
function SurveyFormFillCtrl(spfNavBarService, $location, urlFor, initialData, $routeParams, clmDataStore, clmPagerOption, spfAlert, $scope, firebase) {

    this.pagerOpts = clmPagerOption();

    var self = this;


    this.questions = initialData.survey2;
    this.ratingOptions = [
        {id: 1},
        {id: 2},
        {id: 3},
        {id: 4},
        {id: 5},
        {id: 6},
        {id: 7}
    ];


    if ($routeParams.surveyTask === 'School engagement scale') {


        self.responseRating = [
            {option: 'Never'},
            {option: 'On Occasion'},
            {option: 'Some of the Time'},
            {option: 'Most of the Time'},
            {option: 'All of the Time'}
        ];

        self.schEngageResp = {};

    }

    if ($routeParams.surveyTask === 'Motivated strategies for learning') {

        self.questionsArr = [];
        for (let i = 1; i < Object.keys(initialData.survey2[1]).length - 1; i++) {
            //console.log("testing: ", initialData.survey2[1]["Q" + i]);
            self.questionsArr.push({'name': initialData.survey2[1]["Q" + i], 'qnid': i});
        }

        self.motiResp = {};

    }

    if ($routeParams.surveyTask === 'Education vs Dissatisfaction with learning') {
        this.familyMembers = [
            {name: 'Father'},
            {name: 'Mother'},
            {name: 'Sister(s)'},
            {name: 'Brother(s)'},
            {name: 'Relative(s)'},
            {name: 'Grandparent(s)'}
        ]
        this.selectedFamily = [];
        this.selectedRaceEthnicity = [];

        this.toggle = function (item, list) {
            var idx = list.indexOf(item);
            if (idx > -1) {
                list.splice(idx, 1);
            }
            else {
                list.push(item);
            }
            return list
        };

        this.exists = function (item, list) {
            return list.indexOf(item) > -1;
        };

        this.bdayMonth = [
            {month: 'January'},
            {month: 'February'},
            {month: 'March'},
            {month: 'April'},
            {month: 'May'},
            {month: 'June'},
            {month: 'July'},
            {month: 'August'},
            {month: 'September'},
            {month: 'October'},
            {month: 'November'},
            {month: 'December'}
        ];

        this.ethnicity = [
            {firstRow: 'White'},
            {firstRow: 'African American'},
            {firstRow: 'Hispanic/Latino'},
            {secondRow: 'Asian'},
            {secondRow: 'Native Hawaii/Pacific Islander'},
            {secondRow: 'Other'}
        ];

        //this.selectEthnicity = [];

        this.eduDissResp = {};
        this.questionJson = {};
        console.log("this initialdata is", initialData.survey2[0]);
        //console.log("initial data before: ", initialData.survey2[0]);
        for (let i = 1; i < Object.keys(initialData.survey2[0]).length - 1; i++) {

            this.eduDissResp[initialData.survey2[0][i].title] = {};

        }


    }

    //$routechangestart will be executed before users route to another page
    var schEngageInvalid = true;
    var motiStratInvalid = true;
    var eduDissInvalid = true;
    $scope.$on("$routeChangeStart", function (event, next, current) {
        if (schEngageInvalid && motiStratInvalid && eduDissInvalid) {
            if (!confirm("You have not finished this survey. Are you sure you want to continue? All data will be lost")) {
                event.preventDefault();
            }
        }


    });

    this.event = initialData.event;
    spfNavBarService.update(
        'Survey', [{
            title: 'Events',
            url: `#${urlFor('events')}`
        }, {
            title: this.event.title,
            url: `#${urlFor('oneEvent', {eventId: this.event.$id})}`
        }]
    );
    this.saveSurveyResponse = function (response, item, task) {


        var surveyResp = response;
        var questionNumber = item.currentTarget.getAttribute("data-id");
        var taskId = $routeParams.taskId;
        var eventId = initialData.event.$id;
        var userId = initialData.currentUser.publicId;
        var surveyType = $routeParams.surveyTask;

        //console.log("all the VALUES HERE: " + surveyResp + ", " + questionNumber + "," + taskId + ", " + eventId + ", " + userId + ", " + surveyType)
        clmDataStore.events.saveSurveyResponse(surveyResp, questionNumber, taskId, eventId, userId, surveyType);

    }
    this.saveEduDisMultiResponse = function (selectedArr, item, task, qnTitle) {

        var questionNumber = item.currentTarget.getAttribute("data-id");
        var taskId = $routeParams.taskId;
        var eventId = initialData.event.$id;
        var userId = initialData.currentUser.publicId;
        var surveyType = $routeParams.surveyTask;


        if (questionNumber == 2) {
            var familyArr = [];

            //transfer selected family members values into array
            for (var i = 0; i < selectedArr.length; i++) {
                familyArr.push(selectedArr[i].name);
            }

            clmDataStore.events.saveSurveyEduDisMultiResponse(familyArr, questionNumber, taskId, eventId, userId, surveyType, qnTitle);
        }
        if (questionNumber == 5) {
            var ethnicityRace = [];
            //transfer selected race and ethnicity values into array
            for (var i = 0; i < selectedArr.length; i++) {

                if (selectedArr[i].firstRow != undefined) {
                    ethnicityRace.push(selectedArr[i].firstRow);
                }
                if (selectedArr[i].secondRow != undefined) {
                    ethnicityRace.push(selectedArr[i].secondRow);
                }

            }
            clmDataStore.events.saveSurveyEduDisMultiResponse(ethnicityRace, questionNumber, taskId, eventId, userId, surveyType, qnTitle);
        }


    }
    this.saveEduDisResponse = function (response, age, item, task, siblingNum, selectedMonth, country, language, qnTitle, bestResp) {

        var surveyResp = response;
        var questionNumber = item.currentTarget.getAttribute("data-id");
        var taskId = $routeParams.taskId;
        var eventId = initialData.event.$id;
        var userId = initialData.currentUser.publicId;
        var surveyType = $routeParams.surveyTask;
        var ageResp = age;
        var sibResp = siblingNum;
        var monthResp = selectedMonth;
        var qnTitle = qnTitle;
        var bornCountry = country;
        var spokenLanguage = language;
        var bestResp = bestResp;

        if (surveyResp != undefined) {
            clmDataStore.events.saveSurveyEduDisResponse(surveyResp, questionNumber, taskId, eventId, userId, surveyType, qnTitle);
        }
        else if (ageResp != undefined) {

            clmDataStore.events.saveSurveyEduDisResponse(ageResp, questionNumber, taskId, eventId, userId, surveyType, qnTitle);
        }

        else if (sibResp != undefined) {
            clmDataStore.events.saveSurveyEduDisResponse(sibResp, questionNumber, taskId, eventId, userId, surveyType, qnTitle);

        }
        else if (monthResp != undefined) {
            clmDataStore.events.saveSurveyEduDisResponse(monthResp, questionNumber, taskId, eventId, userId, surveyType, qnTitle);
        }

        else if (bornCountry != undefined) {
            clmDataStore.events.saveSurveyEduDisResponse(bornCountry, questionNumber, taskId, eventId, userId, surveyType, qnTitle);
        }
        else if (spokenLanguage != undefined) {
            clmDataStore.events.saveSurveyEduDisResponse(spokenLanguage, questionNumber, taskId, eventId, userId, surveyType, qnTitle);
        }
        else if (bestResp != undefined) {
            clmDataStore.events.saveSurveyEduDisResponse(bestResp, questionNumber, taskId, eventId, userId, surveyType, qnTitle);
        }

    }
    this.submitSchEngageResponse = function (schEngageResp) {

        //to set warning
        schEngageInvalid = false;
        motiStratInvalid = true;
        eduDissInvalid = true;

        var allResponses = true;
        for (var i = 1; i < schEngageResp.length; i++) {
            if (schEngageResp[i][i + 1] === 0) {
                allResponses = false;
                break;
            }
        }
        if (!allResponses) {
            spfAlert.warning('Failed to save the responses. Please answer all questions.');
        } else {
            var taskId = $routeParams.taskId;
            var eventId = initialData.event.$id;
            var userId = initialData.currentUser.publicId;
            var surveyType = $routeParams.surveyTask;
            var completed = true;

            initialData.progress[userId] = {taskId};

            initialData.progress[userId][taskId] = {completed: completed};

            clmDataStore.logging.inputLog({
                action: "submitSchEngageResponse",
                publicId: userId,
                eventId: eventId,
                taskId: taskId,
                timestamp: firebase.database.ServerValue.TIMESTAMP

            });


            spfAlert.success('Survey responses have been submitted.');
            clmDataStore.events.saveSurveyResponseOnSubmit(taskId, eventId, userId, surveyType, schEngageResp);
            clmDataStore.events.submitSolution(eventId, taskId, userId, "Completed");
            // clmDataStore.events.setProgress(eventId, taskId, userId, initialData.progress);




            $location.path(urlFor('oneEvent', {eventId: self.event.$id}));

        }


    };
    this.submitMotiStratResponse = function (motiResp) {

        //to set warning
        motiStratInvalid = false;
        eduDissInvalid = true;
        schEngageInvalid = true;

        var allResponses = true;
        console.log("trying ", motiResp);
        for (var i = 1; i < motiResp.length; i++) {
            if (motiResp[i][i + 1] === 0) {
                allResponses = false;
                break;
            }
        }
        if (!allResponses) {
            spfAlert.warning('Failed to save the responses.');
        } else {
            var taskId = $routeParams.taskId;
            var eventId = initialData.event.$id;
            var userId = initialData.currentUser.publicId;
            var surveyType = $routeParams.surveyTask;
            var completed = true;

            initialData.progress[userId] = {taskId};
            initialData.progress[userId][taskId] = {completed: completed};

            clmDataStore.logging.inputLog({
                action: "submitMotiStratResponse",
                publicId: userId,
                eventId: eventId,
                taskId: taskId,
                timestamp: firebase.database.ServerValue.TIMESTAMP

            });


            spfAlert.success('Survey response has been submitted.');
            clmDataStore.events.saveSurveyResponseOnSubmit(taskId, eventId, userId, surveyType, motiResp);
            clmDataStore.events.submitSolution(eventId, taskId, userId, "Completed");


            $location.path(urlFor('oneEvent', {eventId: self.event.$id}));

        }
    }

    this.submitEduDissResponse = function (eduDissResp, selectedFamily, selectedRaceEthnicity) {

        //to set warning
        eduDissInvalid = true;
        motiStratInvalid = false;
        schEngageInvalid = false;

        //add checkbox values into json
        var allResponses = true;
        for (var title in eduDissResp) {
            if (title == "Tell us about YOURSELF:") {
                eduDissResp[title][2] = selectedFamily;
                eduDissResp[title][5] = selectedRaceEthnicity;
            } else if (title == "What do you like BEST in this class?") {
                //ignore
            }
            else {

                for (var qn in eduDissResp[title]) {
                    if (eduDissResp[title][qn] == undefined) {
                        allResponses = false;
                        break;
                    }
                }
            }
            if (!allResponses) {
                break;
            }
        }
        console.log("edudissresp values: ", eduDissResp);
        if (!allResponses) {
            spfAlert.warning('Failed to save the responses.');
        } else {

            //retrieving all required variables to be added into firebase
            var taskId = $routeParams.taskId;
            var eventId = initialData.event.$id;
            var userId = initialData.currentUser.publicId;
            var surveyType = $routeParams.surveyTask;
            var completed = true;
            initialData.progress[userId] = {taskId};
            initialData.progress[userId][taskId] = {completed: completed};

            clmDataStore.logging.inputLog({
                action: "submitEduDissResponse",
                publicId: userId,
                eventId: eventId,
                taskId: taskId,
                timestamp: firebase.database.ServerValue.TIMESTAMP

            });


            spfAlert.success('Survey response has been submitted.');
            //add into firebase
            clmDataStore.events.saveSurveyResponseOnSubmit(taskId, eventId, userId, surveyType, eduDissResp);
            clmDataStore.events.submitSolution(eventId, taskId, userId, "Completed");

            $location.path(urlFor('oneEvent', {eventId: self.event.$id}));
        }
    }

    this.backToChallenge = function () {
        $location.path(urlFor('oneEvent', {eventId: self.event.$id}));
    }

};

SurveyFormFillCtrl.$inject = [
    'spfNavBarService',
    '$location',
    'urlFor',
    'initialData',
    '$routeParams',
    'clmDataStore',
    'clmPagerOption',
    'spfAlert',
    '$scope',
    'firebase'
];

export function clmEventRankTableFactory() {
    return {
        template: eventTableRankTmpl,
        restrict: 'E',
        bindToController: true,
        scope: {
            event: '=',
            profile: '=',
            assistants: '='
        },
        controller: ClmEventRankTableCtrl,
        controllerAs: 'ctrl'
    };
}

function ClmEventRankTableCtrl($scope, $log, firebaseApp, $firebaseObject, $firebaseArray, clmDataStore, clmPagerOption) {

    var self = this;
    var db = firebaseApp.database();
    var unwatchers = [];

    var updateLog = function (actionObj) {
        actionObj.publicId = self.profile.$id;
        actionObj.timestamp = TIMESTAMP;
        clmDataStore.logging.inputLog(actionObj);
    };

    // June 2016
    this.rankingView2 = []; // 2016 update to new cm-worker
    // If there are no ranked services on the event, use the default.
    // Add this after the event is fetched if rankedServices is null.

    var addRankedServices = function (parentScope) {
        if (parentScope.event.rankedServices) {
            parentScope.rankedServices = [];
            for (var property in parentScope.event.rankedServices) {
                if (parentScope.event.rankedServices.hasOwnProperty(property)) {
                    // do stuff
                    parentScope.rankedServices.push({id: property, name: property});
                }
            }
        } else { // load the default services to list in ranking table.
            parentScope.rankedServices = [
                {id: 'freeCodeCamp', name: 'Free Code Camp'},
                //{id: 'pivotalExpert', name: 'Pivotal Expert'}
                // {id: 'codeCombat',name: 'Code Combat'},
                // {id: 'singPath',name:  'SingPath Problems'},
                // {id: 'codeSchool', name: 'Code School'}
            ];
        }

    };
    // Update the list of services to show in table.
    addRankedServices(this);

    var getUserProfile = function (publicId, parentScope) {
        var profileRef = db.ref(`classMentors/userProfiles/${publicId}`);
        var result = $firebaseObject(profileRef);

        result.$loaded().then(function() {
            var temp = {};

            temp.$id = publicId;
            temp.$ranking = parentScope.rankingView2.length + 1;
            temp.services = result.services;

            // console.log("In user profile fetch with services", result.services);
            var total = 0;

            // If the user has no registered services, add an empty object to support the following logic.
            if (!result.services) {
                result.services = {};
            }

            // For each ranked service in the event.
            for (var i = 0; i < self.rankedServices.length; i++) {
                // console.log(self.rankedServices[i].id);
                // If the user has registered for the service and has a totoalAchievements value.
                if (
                    result.services[self.rankedServices[i].id] &&
                    result.services[self.rankedServices[i].id].totalAchievements
                ) {
                    temp[self.rankedServices[i].id] = parseInt(
                        result.services[self.rankedServices[i].id].totalAchievements, 10
                    );
                    total += parseInt(result.services[self.rankedServices[i].id].totalAchievements, 10);
                } else {
                    temp[self.rankedServices[i].id] = 0;
                }
            }

            temp.total = total;
            temp.displayName = result.user.displayName;
            temp.name = result.user.displayName;
            temp.user = result.user;
            // console.log(parentScope.event);
            // console.log(parentScope.profile);
            if (parentScope.assistants.indexOf(result.$id) < 0 && parentScope.event.owner.publicId !== result.$id) {
                parentScope.rankingView2.push(temp);
            }
        }, function (reason) {
            console.log(`Failed ${reason}`);
        });
    };

    var refreshAchievements = function (profileId, service) {
        // TODO: Only request updates for the services that users have registered for.
        console.log(`Requesting achievement update for ${profileId}`);
        db.ref('queue/tasks').push({id: profileId, service: service});
    };

    this.updateAllParticipantUserProfiles = function () {
        // console.log("Requesting all users in ranking to be updated.");
        updateLog({action: "updateAllParticipantUserProfiles", "eventId": self.event.$id});
        // For each user in the ranking
        for (var i = 0; i < self.rankingView2.length; i++) {
            var publicId = self.rankingView2[i].$id;
            // for service in ranked services
            for (var j = 0; j < self.rankedServices.length; j++) {
                // console.log(self.rankedServices[j].id);
                // If the user in the ranking has the key services and key for a service
                if (self.rankingView2[i].services && self.rankingView2[i].services[self.rankedServices[j].id]) {
                    // console.log("Adding "+self.rankedServices[j].id+ " for user "+publicId);
                    refreshAchievements(publicId, self.rankedServices[j].id);
                } else {
                    // console.log("Skipping "+self.rankedServices[j].id+ " for user "+publicId+ " since not registered");
                }
            }
        }
    };

    var getUserProfilesFromEventParticipants = function (parentScope) {
        // Clear ranking and re-rank
        parentScope.rankingView2 = [];
        console.log('Fetching participants for event');
        for (var i = 0; i < parentScope.eventParticipants.length; i++) {
            var publicId = parentScope.eventParticipants[i].$id;
            getUserProfile(publicId, parentScope);
        }
    };

    this.getParticipants = function(parentScope) {
        var ref = db.ref(`classMentors/eventParticipants/${parentScope.event.$id}`);
        var query = ref.limitToLast(100);
        var data = $firebaseArray(query);

        data.$loaded().then(function() {
            var result = data;
            // console.log(result);
            parentScope.eventParticipants = result;
            getUserProfilesFromEventParticipants(parentScope);

        }, function (reason) {
            console.log('Failed ' + reason);
        });

    };

    this.getParticipants(this);
    this.loading = true; // This will hide the table view.
    this.loading = false;

    this.currentUserRanking = undefined;
    this.orderOpts = [{
        key: 'total',
        reversed: true
    }, {
        key: 'name',
        reversed: false
    }];
    this.pagerOpts = clmPagerOption();
    unwatchers.push(self.pagerOpts.$destroy.bind(self.pagerOpts));
    /*
     load();

     function load() {
     $scope.$on('$destroy', unload);

     return clmDataStore.events.getRanking(self.event.$id).then(function(ranking) {
     self.ranking = ranking;

     // Update ranking view via the pager range update event.
     unwatchers.push(self.pagerOpts.onChange(rankingView));
     updateRowCount();

     unwatchers.push(self.ranking.$destroy.bind(self.ranking));
     unwatchers.push(self.ranking.$watch(updateRowCount));
     }).finally(function() {
     self.loading = false;
     }).catch(function(e) {
     $log.error(e);
     });
     }

     function unload() {
     unwatchers.forEach(function(f) {
     if (f) {
     try {
     f();
     } catch (err) {
     $log.error(err);
     }
     }
     });
     }
     */
    // function badgeComparer(propId) {
    //   return function(a, b) {
    //     var aB = a[propId] || 0;
    //     var bB = b[propId] || 0;

    //     return aB - bB;
    //   };
    // }

    // function comparer(options) {
    //   return chainComparer(options.map(function(opt) {
    //     return reverseComparer(opt.reversed, _comparers[opt.key] || _comparers.total);
    //   }));
    // }

    // function currentUserRanking() {
    //   self.currentUserRanking = undefined;
    //   rankingList.some(function(p) {
    //     if (!self.profile) {
    //       return true;
    //     }

    //     if (p.$id === self.profile.$id) {
    //       self.currentUserRanking = p;
    //       return true;
    //     }

    //     return false;
    //   });
    // }

    // function rankingView() {
    //   console.log('In ranking view');
    //   rankingList.sort(comparer(self.orderOpts)).forEach(function(p, i) {
    //     p.$ranking = i + 1;
    //   });

    //   self.rankingView2 = rankingList.slice(
    //     self.pagerOpts.range.start,
    //     self.pagerOpts.range.end
    //   );

    //   currentUserRanking();
    // }

    // Update pager's row count
    // (the pager should trigger a range update and call rankingView)
    // function updateRowCount() {
    //   if (!self.ranking) {
    //     rankingList = [];
    //     self.pagerOpts.setRowCount(0);
    //     return;
    //   }

    //   rankingList = Object.keys(self.ranking).filter(function(publicId) {
    //     return self.ranking[publicId] && self.ranking[publicId].user;
    //   }).map(function(publicId) {
    //     self.ranking[publicId].$id = publicId;
    //     return self.ranking[publicId];
    //   });

    //   self.pagerOpts.setRowCount(rankingList.length);
    // }

    this.orderBy = function (key) {
        // Adjust this to support new ordering mechanism.

        console.log('orderBy ' + key);

        if (self.orderOpts[0] && self.orderOpts[0].key === key) {
            self.orderOpts[0].reversed = !self.orderOpts[0].reversed;
        } else {
            self.orderOpts.unshift({
                key: key,
                reversed: true
            });
            self.orderOpts = self.orderOpts.slice(0, 2);
        }

        updateLog({
            action: "eventRankingOrderby",
            "eventId": self.event.$id,
            "key": key,
            "reversed": self.orderOpts[0].reversed
        });

        // TODO: Revisit when 2nd order ranking becomes a priority.
        // There was an issue with getting both strings and numbers to rank properly.
        // Just leaving the array as is and allowing the view to do the sorting.
        // console.log(self.orderOpts);
        // Can we use > rather than - to deal with strings?
        /*
         if(self.orderOpts[1].reversed){
         self.rankingView2.sort(function(a, b) {
         return b[self.orderOpts[1].key] - a[self.orderOpts[1].key];
         });
         }
         else{
         self.rankingView2.sort(function(a, b) {
         return a[self.orderOpts[1].key] - b[self.orderOpts[1].key];
         });
         }

         if(self.orderOpts[0].reversed){
         self.rankingView2.sort(function(a, b) {
         return b[self.orderOpts[0].key] - a[self.orderOpts[0].key];
         });
         }
         else{
         self.rankingView2.sort(function(a, b) {
         return a[self.orderOpts[0].key] - b[self.orderOpts[0].key];
         });
         }

         //Update ordering
         for(var i=0; i<self.rankingView2.length; i++){
         self.rankingView2[i]["$ranking"] = i+1;
         }
         */

        // rankingView();

    };

}

ClmEventRankTableCtrl.$inject = [
    '$scope',
    '$log',
    'firebaseApp',
    '$firebaseObject',
    '$firebaseArray',
    'clmDataStore',
    'clmPagerOption'
];

// Show event participants and submissions in a paged table
export function clmEventResultsTableFactory() {
    return {
        template: eventTableResultsTmpl,
        restrict: 'E',
        bindToController: true,
        scope: {
            event: '=',
            profile: '=',
            participants: '=',
            tasks: '=',
            progress: '=',
            solutions: '=',
            selected: '=',
            scores: '='
        },
        controller: ClmEventResultsTableCtrl,
        controllerAs: 'ctrl'
    };
}

function ClmEventResultsTableCtrl($scope, $q, $log, $mdDialog, $document,
                                  urlFor, spfAlert, clmServicesUrl, clmDataStore, clmPagerOption, $sce) {
    var self = this;
    var unwatchers = [];

    this.currentUserParticipant = undefined;
    this.participantsView = [];
    this.visibleTasks = [];
    this.taskCompletion = {};

    this.orderOptions = {
        key: undefined,
        reversed: false
    };

    this.pagerOptions = clmPagerOption();
    unwatchers.push(self.pagerOptions.$destroy.bind(self.pagerOptions));

    /**
     * Get current user participant row
     */
    function currentUserParticipant() {
        if (
            !self.participants || !self.participants.$getRecord || !self.profile || !self.profile.$id
        ) {
            self.currentUserParticipant = undefined;
        }

        self.currentUserParticipant = self.participants.$getRecord(self.profile.$id);
    }

    /**
     * Set list of visible tasks and the % completion.
     *
     */
    function visibleTasks() {
        if (!self.tasks || !self.tasks.filter) {
            self.visibleTasks = [];
            return;
        }

        self.visibleTasks = self.tasks.filter(function (t) {
            return !t.hidden && !t.archived;
        });

        taskCompletion();
    }

    /**
     * Calculate all visible tasks completion rate.
     *
     */
    function taskCompletion() {
        self.taskCompletion = self.visibleTasks.reduce(function (all, task) {
            all[task.$id] = _taskCompletion(task.$id);
            return all;
        }, {});
    }

    /**
     * Return the completion rate of a task.
     *
     */
    function _taskCompletion(taskId) {
        var participantCount, participantsIds;

        if (!self.participants || !self.progress) {
            return 0;
        }

        participantCount = self.participants.length;
        participantsIds = self.participants.reduce(function (all, participant) {
            if (participant.$id) {
                all[participant.$id] = true;
            }
            return all;
        }, {});

        if (participantCount < 1) {
            return 0;
        }

        return Object.keys(self.progress).filter(function (publicId) {
                return (
                    participantsIds[publicId] && // Make sure user is still participating
                    // (user progress is kept when they leave)
                    self.progress[publicId] &&
                    self.progress[publicId][taskId] &&
                    self.progress[publicId][taskId].completed
                );
            }).length / participantCount * 100;

    }

    function _completionComparer(options) {
        var taskId = options.key;

        return function (a, b) {
            var aP = (
                self.progress &&
                self.progress[a.$id] &&
                self.progress[a.$id][taskId] &&
                self.progress[a.$id][taskId].completed
            );
            var bP = (
                self.progress &&
                self.progress[b.$id] &&
                self.progress[b.$id][taskId] &&
                self.progress[b.$id][taskId].completed
            );

            if (aP === bP) {
                return 0;
            } else if (aP) {
                return 1;
            }

            return -1;
        };
    }

    function _solutionComparer(options) {
        var taskId = options.key;
        var task = self.tasks.$getRecord(taskId);

        if (!task || (!task.textResponse && !task.linkPattern)) {
            return noop;
        }

        return function (a, b) {
            var aS = (
                    self.solutions &&
                    self.solutions[a.$id] &&
                    self.solutions[a.$id][taskId]
                ) || '';
            var bS = (
                    self.solutions &&
                    self.solutions[b.$id] &&
                    self.solutions[b.$id][taskId]
                ) || '';

            return aS.localeCompare(bS);
        };
    }

    function _compareName(a, b) {
        var aN = (a.user && a.user.displayName) || '';
        var bN = (b.user && b.user.displayName) || '';

        return aN.localeCompare(bN);
    }

    function sortedParticipants(participants, options) {
        var rows = participants.filter(function (p) {
            return p.$id !== self.profile.$id;
        });
        var comparer;

        if (options.key) {
            comparer = chainComparer([_completionComparer(options), _solutionComparer(options), _compareName]);
        } else {
            comparer = _compareName;
        }

        rows.sort(reverseComparer(options.reversed, comparer));
        return rows;
    }

    // Update the pager rowCount
    // (the pager should trigger a range update which will call participantsView)
    function updateParticipantRowCount() {
        currentUserParticipant();

        if (self.currentUserParticipant) {
            self.pagerOptions.setRowCount(self.participants.length - 1);
        } else {
            self.pagerOptions.setRowCount(self.participants.length);
        }
    }

    /**
     * Set the slice of participant to show.
     *
     */
    function participantsView() {
        var rows = sortedParticipants(self.participants, self.orderOptions);

        self.participantsView = rows.slice(self.pagerOptions.range.start, self.pagerOptions.range.end);
        self.participantsView.unshift(self.currentUserParticipant);
    }

    /**
     * Switch ordering key or ordering direction.
     *
     * If the ordering key is changing, the ordering direction should be
     * ascendent.
     *
     * If the order key is not changing, the direction should be switched.
     *
     */
    this.orderBy = function (taskId) {
        self.orderOptions.reversed = (
            !self.orderOptions.reversed &&
            (self.orderOptions.key === taskId)
        );
        self.orderOptions.key = taskId;
        participantsView();
    };

    function defaultLinker(task, serviceProfile) {
        if (
            !serviceProfile || !serviceProfile.details || !serviceProfile.details.id || !task || !task.badge || !task.badge.url
        ) {
            return `#${urlFor('editProfile')}`;
        }

        return task.badge.url;
    }

    var linkers = {
        codeSchool: defaultLinker,
        codeCombat: defaultLinker,

        singPath: function (task) {
            if (!task || task.serviceId !== 'singPath') {
                return '';
            }

            if (
                !task.singPathProblem || !task.singPathProblem.path || !task.singPathProblem.path.id || !task.singPathProblem.level || !task.singPathProblem.level.id || !task.singPathProblem.problem || !task.singPathProblem.problem.id
            ) {
                return clmServicesUrl.singPath;
            }

            return (
                clmServicesUrl.singPath + '/#' +
                '/paths/' + task.singPathProblem.path.id +
                '/levels/' + task.singPathProblem.level.id +
                '/problems/' + task.singPathProblem.problem.id + '/play'
            ).replace(/\/+/, '/');
        }
    };

    this.startLink = function (task, profile) {
        var serviceProfile;

        if (
            !task || !task.serviceId || !linkers[task.serviceId]
        ) {
            return '';
        }

        serviceProfile = profile && profile.services && profile.services[task.serviceId];
        return linkers[task.serviceId](task, serviceProfile);
    };

    var trackedServices = {
        codeSchool: true,
        codeCombat: true
    };

    this.mustRegister = function (task, profile) {
        return Boolean(
            task &&
            task.serviceId &&
            trackedServices[task.serviceId] && (
                !profile || !profile.services || !profile.services[task.serviceId] || !profile.services[task.serviceId].details || !profile.services[task.serviceId].details.id
            )
        );
    };

    this.viewLink = function (eventId, taskId, task, participant, userSolution) {
        console.log(participant);
        $mdDialog.show({
            clickOutsideToClose: true,
            parent: $document.body,
            template: linkTmpl,
            controller: DialogController,
            controllerAs: 'ctrl'
        });

        function DialogController() {
            this.task = task;
            this.review = true;
            this.participant = participant;
            if (
                userSolution &&
                userSolution[taskId]
            ) {
                this.solution = $sce.trustAsResourceUrl(userSolution[taskId]);
            }

            this.save = function (link) {
                clmDataStore.events.submitSolution(eventId, taskId, participant.$id, link).then(function () {
                    $mdDialog.hide();
                    spfAlert.success('Link is saved.');
                }).catch(function (err) {
                    $log.error(err);
                    spfAlert.error('Failed to save the link.');
                    return err;
                });
            };

            this.cancel = function () {
                $mdDialog.hide();
            };
        }
    };

    this.viewMultipleChoiceResponse = function (eventId, taskId, task, participant, userSolution) {
        $mdDialog.show({
            clickOutsideToClose: true,
            parent: $document.body,
            template: mcqTmpl,
            controller: DialogController,
            controllerAs: 'ctrl'
        });

        function DialogController() {
            this.task = task;
            this.viewOnly = true;
            this.questions = angular.fromJson(this.task.mcqQuestions);
            this.isChecked = function (answers, index) {
                return answers.indexOf(index) > -1;
            }
            this.show = function (answers) {
                return answers.length > 1;
            }

            // If userSolution is not null and userSolution given
            // taskId is not null
            if (
                userSolution &&
                userSolution[taskId]
            ) {
                this.solution = userSolution[taskId];
            }
            var userAnswers = angular.fromJson(this.solution).userAnswers;
            console.log(userAnswers);
            for (var i = 0; i < this.questions.length; i++) {
                this.questions[i].answers = userAnswers[i];
            }
            console.log(this.questions);
            this.cancel = function () {
                $mdDialog.hide();
            };
        }
    }

    this.viewTextResponse = function (eventId, taskId, task, participant, userSolution) {
        $mdDialog.show({
            clickOutsideToClose: true,
            parent: $document.body,
            template: responseTmpl,
            controller: DialogController,
            controllerAs: 'ctrl'
        });

        function DialogController() {
            this.task = task;
            this.viewOnly = true;
            if (
                userSolution &&
                userSolution[taskId]
            ) {
                this.solution = userSolution[taskId];
            }

            this.save = function (response) {
                clmDataStore.events.submitSolution(eventId, taskId, participant.$id, response).then(function () {
                    $mdDialog.hide();
                    spfAlert.success('Response is saved.');
                }).catch(function (err) {
                    $log.error(err);
                    spfAlert.error('Failed to save your response.');
                    return err;
                });
            };

            this.cancel = function () {
                $mdDialog.hide();
            };
        }
    };

    this.viewCodeResponse = function (eventId, taskId, task, participant, userSolution) {
        $mdDialog.show({
            clickOutsideToClose: true,
            parent: $document.body,
            template: codeTmpl,
            onComplete: loadEditor,
            controller: CodeController,
            controllerAs: 'ctrl'
        });

        this.loadingEditor = true;
        var parent = this;

        function loadEditor() {
            var editor = ace.edit($document[0].querySelector('#editor'));
            editor.setTheme("ace/theme/monokai");
            editor.getSession().setMode("ace/mode/" + task.lang.toLowerCase());
            editor.getSession().setUseWrapMode(true);
            editor.setOptions({
                readOnly: true,
                highlightActiveLine: false,
                highlightGutterLine: false
            });
            parent.loadingEditor = false;
        }

        function CodeController() {
            this.task = task;
            this.viewOnly = true;

            this.checkEditor = function () {
                return parent.loadingEditor;
                console.log(parent.loadingEditor);
            };

            if (
                userSolution &&
                userSolution[taskId]
            ) {
                this.solution = userSolution[taskId];
            }

            this.save = function () {
                var editor = ace.edit(document.querySelector('#editor'));
                var response = editor.getValue();
                console.log("Function submitted for answer " + response);
                clmDataStore.events.submitSolution(eventId, taskId, participant.$id, response).then(function () {
                    $mdDialog.hide();
                    spfAlert.success('Response is saved.');
                }).catch(function (err) {
                    $log.error(err);
                    spfAlert.error('Failed to save your response.');
                    return err;
                });
            };

            this.cancel = function () {
                $mdDialog.hide();
            };
        }
    };

    this.saveAllocatedPoints = function (eventId, taskId, task, participant, score) {
        clmDataStore.events.saveScore(eventId, participant.$id, taskId, score).then(function () {
            spfAlert.success('Score has been saved.');
        }).catch(function (err) {
            $log.error(err);
            spfAlert.error('Failed to save score.');
            return err;
        });
    };

    this.update = function () {
    };
    /*
     this.update = function(event, tasks, userSolutions, profile) {
     return clmDataStore.events.updateCurrentUserProfile(
     event, tasks, userSolutions, profile
     ).then(function() {
     spfAlert.success('Profile updated');
     }).catch(function(err) {
     $log.error(err);
     spfAlert.error('Failed to update profile');
     });
     };*/

    this.removeParticipant = function (e, event, participant) {
        var confirm = $mdDialog.confirm()
            .parent($document.body)
            .title(`Would you like to remove ${participant.user.displayName}?`)
            .content('The participant progress will be kept but he/she will not show as participant')
            .ariaLabel('Remove participant')
            .ok('Remove')
            .cancel('Cancel')
            .targetEvent(e);

        $mdDialog.show(confirm).then(function () {
            clmDataStore.events.removeParticpants(event.$id, participant.$id);
        });
    };

    // load up resources and start firebase watcher
    this.loading = true;
    $q.all({
        userProgress: clmDataStore.events.getUserProgress(this.event.$id, this.profile.$id).then(function (progress) {
            self.currentUserProgress = progress;
            unwatchers.push(progress.$destroy.bind(progress));
            return progress;
        }),
        userSolution: clmDataStore.events.getUserSolutions(this.event.$id, this.profile.$id).then(function (solutions) {
            self.currentUserSolutions = solutions;
            unwatchers.push(solutions.$destroy.bind(solutions));
            return solutions;
        }),
        singpathQueuedSolution: clmDataStore.singPath.queuedSolutions(this.profile.$id).then(function (paths) {
            unwatchers.push(paths.$destroy.bind(paths));
            return paths;
        })
    }).then(function (results) {

        visibleTasks();

        // Set the participant view (via the pager range update event)
        unwatchers.push(self.pagerOptions.onChange(participantsView));
        updateParticipantRowCount();

        // Monitor updates on task progress and participants list.
        unwatchers.push(self.tasks.$watch(visibleTasks));
        unwatchers.push(self.progress.$watch(taskCompletion));
        unwatchers.push(self.participants.$watch(taskCompletion));
        unwatchers.push(self.participants.$watch(updateParticipantRowCount));

        return results;
    }).finally(function () {
        self.loading = false;
    }).then(function (results) {
        var update = function () {
            // Removed due to June 2016 profile updating process change.
            /*
             return clmDataStore.events.updateCurrentUserProfile(
             self.event,
             self.tasks,
             results.userSolution,
             self.profile
             );
             */
        };

        // Watch for singpath problem getting updated
        unwatchers.push(results.singpathQueuedSolution.$watch(update));

        return update();
    }).catch(function (err) {
        $log.error(err);
    });

    // clean up.
    $scope.$on('$destroy', function () {
        unwatchers.forEach(function (f) {
            if (f) {
                try {
                    f();
                } catch (err) {
                    $log.error(err);
                }
            }
        });
    });
}

ClmEventResultsTableCtrl.$inject = [
    '$scope',
    '$q',
    '$log',
    '$mdDialog',
    '$document',
    'urlFor',
    'spfAlert',
    'clmServicesUrl',
    'clmDataStore',
    'clmPagerOption',
    '$sce'
];

export function clmPagerFactory() {
    return {
        template: pagerTmpl,
        restrict: 'E',
        bindToController: true,
        scope: {
            options: '='
        },
        controller: ClmPagerCtrl,
        controllerAs: 'ctrl'
    };
}

// Keep row per page selection acrossviews.

export function clmRowPerPageFactory($log) {
    var cb = [];
    var opts = {
        value: 50,
        options: [5, 10, 25, 50, 75, 100],

        set: function (value) {
            opts.value = parseInt(value, 10);
            if (opts.value < 1) {
                opts.value = 1;
            }
            opts.triggerChange();
        },

        /**
         * Register a function to call synchronously whn roePerPage is set.
         *
         * If the function needs to modify the rowPerPage it shouldn't use the
         * setter or do it asynchronously.
         *
         * @param  {function} fn
         * @return {function}
         */
        onChange: function (fn) {
            cb.push(fn);

            return function () {
                cb = cb.filter(function (f) {
                    return f !== fn;
                });
            };
        },

        triggerChange: function () {
            cb.forEach(function (fn) {
                try {
                    fn(opts.value);
                } catch (err) {
                    $log.error(err);
                }
            });
        }

    };

    return opts;
}

clmRowPerPageFactory.$inject = ['$log'];

export function clmPagerOptionFactory($log, clmRowPerPage) {
    return function clmPagerOption() {
        var rangeCBs = [];
        var unwatch;
        var opts = {
            rowCount: 0,
            range: {
                start: 0,
                end: 0
            },

            /**
             * Set rowCount and reset range.
             *
             * Trigger a change "event".
             *
             * @param {number} count
             */
            setRowCount: function (count) {
                opts.rowCount = count;
                opts.setRange(opts.range.start);
            },

            /**
             * Set range from its starting index and `clmRowPerPage.value`.
             *
             * The range start index will be set to the start of a page, with the
             * first page starting at zero and the second page starting at
             * `clmRowPerPage.value`, etc...
             *
             * @param {number} start
             */
            setRange: function (start) {
                var end;

                start = start || 0;
                if (start < 0) {
                    start = 0;
                }

                start -= (start % clmRowPerPage.value);
                if (start > opts.rowCount) {
                    start = opts.rowCount;
                }

                end = start + clmRowPerPage.value;
                if (end > opts.rowCount) {
                    end = opts.rowCount;
                }

                opts.range.start = start;
                opts.range.end = end;

                opts.triggerChange();
            },

            /**
             * Register a function to be called each time the the pager data
             * are set.
             *
             * Setting the rowCount, the range or setting `clmRowPerPage.value`
             * will trigger a call synchronously.
             *
             * The calls must not update rowCount or the range using the setters
             * (or if it does it use them asynchronously).
             *
             * @param  {Function} cb Function to register.
             * @return {Function}    Deregister the function.
             */
            onChange: function (cb) {
                rangeCBs.push(cb);
                return function () {
                    rangeCBs = rangeCBs.filter(function (fn) {
                        return fn !== cb;
                    });
                };
            },

            triggerChange: function () {
                rangeCBs.forEach(callCB);
            },

            $destroy: function () {
                unwatch();
            }
        };

        unwatch = clmRowPerPage.onChange(function () {
            opts.setRange(opts.range.start);
        });

        function callCB(cb) {
            try {
                cb(opts);
            } catch (err) {
                $log.error(err);
            }
        }

        return opts;
    };
}

clmPagerOptionFactory.$inject = ['$log', 'clmRowPerPage'];

function ClmPagerCtrl(clmRowPerPage) {
    this.rowPerPage = clmRowPerPage;

    this.nextPage = function (options) {
        options.setRange(options.range.end);
    };

    this.prevPage = function (options) {
        options.setRange(options.range.start - 1);
    };

    this.firstPage = function (options) {
        options.setRange(0);
    };

    this.lastPage = function (options) {
        options.setRange(options.rowCount);
    };
}

ClmPagerCtrl.$inject = ['clmRowPerPage'];

function reverseComparer(reverse, fn) {
    if (!reverse) {
        return fn;
    }

    return function (a, b) {
        var result = fn(a, b);
        return result * -1;
    };
}

function chainComparer(comparerList) {
    return function (a, b) {
        var i, result;

        for (i = 0; i < comparerList.length; i++) {
            result = comparerList[i](a, b);
            if (result) {
                return result;
            }
        }

        return 0;
    };
}


