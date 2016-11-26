/**
 * Created by AMOS on 10/7/16.
 */


//TODO: Add various imports for challenge(s)
import * as mcq from './mcq/mcq.js';
import * as survey from './survey/survey.js';
import * as team from './teamActivity/teamactivity.js';
import * as mentor from './mentoring/mentoring.js';
import {cleanObj} from 'singpath-core/services/firebase.js';

const noop = () => undefined;

function loaded(syncObjOrArray) {
    return syncObjOrArray.$loaded().then(() => syncObjOrArray);
}

// TODO: Put out of use.
export function tratQuestionFactory($q, spfAuthData, eventService, clmDataStore) {
    var self = this;
    self.data = eventService.get();
    // console.log("my data is:", self.data);
    // var question = $q.all ({
    //     questions: angular.fromJson(data.task.mcqQuestions)
    // }).then (function (result){
    //     console.log("testing questions:", result);
    //     return result;
    //
    // });
    // return $q.all({
    //     getQuestion: function(id){
    //         var question = angular.fromJson(self.data.task.mcqQuestions);
    //         if(id < question.length){
    //             return question[id];
    //         }else{
    //             return false;
    //         }
    //     } 
    // });
    // Weird bugs often happen here. Could be bcoz of promise objects not resolved.
    return {
        getQuestion: function (id) {
            var question = angular.fromJson(self.data.task.mcqQuestions);
            if (id < question.length) {
                return question[id];
            } else {
                return false;
            }
        }
    }

}
tratQuestionFactory.$inject = ['$q', 'spfAuthData', 'eventService', 'clmDataStore'];


//TODO: Add config for routing to various challenges
export function configRoute($routeProvider, routes) {
    $routeProvider
        .when(routes.indexCard, {
            template: '',
            controller: '',
            controllerAs: 'ctrl',
            resolve: {
                initialData: ''
            }
        })
        .when(routes.viewMcq, {
            template: mcq.newMcqTmpl,
            controller: mcq.newMcqController,
            controllerAs: 'ctrl',
            resolve: {
                initialData: createMCQInitialData
            }
        })

        .when(routes.editMcq, {
            template: mcq.editMcqTmpl,
            controller: mcq.editMcqController,
            controllerAs: 'ctrl',
            resolve: {
                initialData: editMCQInitialData
            }

        })

        .when(routes.viewSurvey, {
            template: survey.showSurveyTmpl,
            controller: surveyFormEvent,
            controllerAs: 'ctrl',
            resolve: {
                initialData: getTaskSurveyValues
            }
        })

        .when(routes.editSurvey, {
            template: survey.showSurveyTmpl,
            controller: editsurveyFormEvent,
            controllerAs: 'ctrl',
            resolve: {
                initialData: getTaskSurveyEditValues
            }
        })

        .when(routes.startMcq, {
            template: mcq.starMcqTmpl,
            controller: mcq.startMcqController,
            controllerAs: 'ctrl',
            resolve: {
                initialData: startMCQInitialData
            }
        })

        .when(routes.createTeamActivity, {
            template: team.teamActivityCreateTmpl,
            controller: team.createTeamActivityController,
            controllerAs: 'ctrl',
            resolve: {
                initialData: team.createTeamActivityInitialData
            }
        })

        .when(routes.viewMentorCreation, {
            template: mentor.mentorCreationTmpl,
            controller: mentor.createMentoringController,
            controllerAs: 'ctrl',
            resolve: {
                initialData: mentor.createMentoringInitialData

            }
        })

        .when(routes.viewIRAT, {
            template: team.teamIRATTmpl,
            controller: team.startIRATController,
            controllerAs: 'ctrl',
            resolve: {
                initialData: team.createTeamActivityInitialData
            }
        })
        .when(routes.viewTRAT, { // Start TRAT.
            template: team.teamTRATTmpl,
            controller: team.startTRATController,
            controllerAs: 'ctrl',
            resolve: {
                initialData: team.startTRATInitialData
            }
        })
        .when(routes.viewSchEngagePreview, {
            template: survey.schEngagePreview,
            controller: survey.showPreviewController,
            controllerAs: 'ctrl',
            resolve: {
                initialData: survey.showPreviewInitialData
            }
        })

        .when(routes.viewMotiStratPreview, {
            template: survey.motiStratPreview,
            controller: survey.showPreviewController,
            controllerAs: 'ctrl',
            resolve: {
                initialData: survey.showPreviewInitialData
            }
        })

        .when(routes.viewEduDissPreview, {
            template: survey.eduDissPreview,
            controller: survey.showPreviewController,
            controllerAs: 'ctrl',
            resolve: {
                initialData: survey.showPreviewInitialData
            }
        })

}

configRoute.$inject = ['$routeProvider', 'routes'];


function editMCQInitialData($q, eventService, clmDataStore) {
    var data = eventService.get();
    // console.log(data);
    return clmDataStore.events.getTaskAnswers(data.event.$id, data.task.$id).then(
        function (result) {
            return {
                data: data,
                savedAnswers: result
            }
        }, function (error) {
            console.log(error);
        }
    );
}
editMCQInitialData.$inject = [
    '$q',
    'eventService',
    'clmDataStore'
];

// Initial data for starting an MCQ
//todo: tidy up the codes; should be using promises to access some objects as well as validation
function startMCQInitialData($q, spfAuthData, eventService, clmDataStore, $route, firebaseApp, $firebaseObject) {
    //promise object
    // var currentUser = spfAuthData.user().catch(noop);
    var eventId = $route.current.params.eventId;
    var taskId = $route.current.params.taskId;
    //retrieve mcq questions
    var db = firebaseApp.database();

    return $q.all({

        currentUser: spfAuthData.user(),
        answers: clmDataStore.events.getTaskAnswers(eventId, taskId),
        getProgress: clmDataStore.events.getProgress(eventId),
        task: clmDataStore.events.getTask(eventId, taskId),
        event: clmDataStore.events.get(eventId)

    }).then(function (result) {
        // console.log("result isss:", result);
        return {
            eventTitle: result.event.title,
            eventId: eventId,
            taskId: taskId,
            task: result.task,
            correctAnswers: result.answers,
            currentUser: result.currentUser,
            progress: result.getProgress
        }
    });

    // return clmDataStore.events.getTaskAnswers(data.eventId, data.taskId).then(
    //       function(result){
    //         return {
    //           data: data,
    //           correctAnswers: result,
    //             currentUser: currentUser
    //         }
    //       }, function(error){
    //         console.log(error);
    //       }
    //   );
}
startMCQInitialData.$inject = [
    '$q',
    'spfAuthData',
    'eventService',
    'clmDataStore',
    '$route',
    'firebaseApp',
    '$firebaseObject'
]

// Initial data for creating MCQ
function createMCQInitialData($q, eventService) {
    var data = eventService.get();
    return data;
}
createMCQInitialData.$inject = [
    '$q',
    'eventService'
]

export function scrollBottom() {
    return {
        scope: {
            schrollBottom: "="
        },
        link: function (scope, element) {
            scope.$watchCollection('schrollBottom', function (newValue) {
                if (newValue) {
                    $(element).scrollTop($(element)[0].scrollHeight);
                }
            });
        }
    }
}

//TODO: Generic save function
export function challengeServiceFactory
($q, $route, spfAuthData, clmDataStore, $log, spfAlert, $location, urlFor, firebaseApp,
 $firebaseArray, $firebaseObject) {
    return {
        save: function (event, taskId, task, taskType, isOpen) {
            // Get firebase database object.
            var db = firebaseApp.database();
            var copy = cleanObj(task);
            var answers = copy.answers;
            // console.log('COPY IS ... ', copy);
            //
            // console.log('COPY IS!! ', copy);
            self.creatingTask = true;
            if (taskType === 'multipleChoice') {
                delete copy.singPathProblem;
                delete copy.badge;
                delete copy.answers;

                var ref = clmDataStore.events.addTaskWithAns(event.$id, copy, isOpen, answers);
                ref.then(function () {
                    spfAlert.success('Challenge created.');
                    $location.path(urlFor('editEvent', {eventId: event.$id}));
                }).catch(function (err) {
                    $log.error(err);
                    spfAlert.error('Failed to created new challenge.');
                }).finally(function () {
                    self.creatingTask = false;
                });

            } else if (taskType === 'teamActivity') {
                delete copy.singPathProblem;
                delete copy.badge;
                delete copy.answers;
                if (copy.link == "") {
                    delete copy.link;
                }
                // console.log(copy);
                /*TODO:
                 1. Modify 'addTaskWithAns' to return firebase reference too? hmm.
                 2. Refactor once (1) is agreed upon.
                 */

                // Get firebase task reference.
                var taskRef = db.ref(`classMentors/eventTasks/${event.$id}`);
                // Get root reference; Returns thenable reference
                var ref = taskRef.push();
                var taskAnsRef = db.ref(`classMentors/eventAnswers/${event.$id}/${ref.key}`);
                var teamFormationTaskRef = db.ref(`classMentors/eventTasks/${event.$id}`).push();
                var tratTaskRef = db.ref(`classMentors/eventTasks/${event.$id}`).push();
                // console.log('Team Formation key: ', taskAnsRef.key)
                var eventTeamsRef = db.ref(`classMentors/eventTeams/${event.$id}/${teamFormationTaskRef.key}`);
                console.log("eventteamsRef iss:", eventTeamsRef);
                // Check If key
                // console.log(teamFormationTaskRef.key);
                var priority = copy.priority;
                // Set openedAt, closedAt timestamp.
                if (isOpen) {
                    copy.openedAt = {'.sv': 'timestamp'};
                    copy.closedAt = null;
                } else {
                    copy.closedAt = {'.sv': 'timestamp'};
                    copy.openedAt = null;
                }
                // Save IRAT.
                var promise = priority ? ref.setWithPriority(copy, priority) : ref.set(copy);
                promise.then(function () {
                    // Save answers.
                    console.log('Task answers set.');
                    // console.log(taskAnsRef);
                    return taskAnsRef.set(answers);
                }).then(function () {
                    // Define 'teamFormationTask'.
                    var teamFormationTask = {
                        taskFrom: ref.key,
                        title: copy.title,
                        description: "Click Below To Join Team",
                        formationPattern: true,
                        closedAt: {'.sv': 'timestamp'},
                        showProgress: copy.showProgress,
                        archived: false,
                        type: "formTeam",
                        teamFormationMethod: copy.teamFormationMethod
                    };
                    // Create 'teams' in 'eventTeams'.
                    for (var i = 0; i < event.teams.length; i++) {
                        var team = event.teams[i];
                        // console.log('Team here is: ', team);
                        console.log('Team is: ', team);
                        eventTeamsRef.push(team).then(function (thenableRef) {
                            // console.log('Team reccorded at: ', thenableRef.key);
                            // var teamLog = {
                            //     init: {'.sv': 'timestamp'}
                            // }
                            var eventTeamsLogRef = db.ref(`classMentors/eventTeamsLog/${teamFormationTaskRef.key}/${thenableRef.key}`);
                            // eventTeamsLogRef.set(teamLog);
                        });
                    }
                    console.log('Team answers set.');
                    return priority ? teamFormationTaskRef.setWithPriority(teamFormationTask, priority)
                        : teamFormationTaskRef.set(teamFormationTask);
                }).then(function () {
                    console.log('TeamFormationTask set.');
                    var tratTask = {
                        taskFrom: ref.key,
                        teamFormationRef: teamFormationTaskRef.key,
                        title: copy.title,
                        description: "Click Below to Start TRAT",
                        startTRAT: true,
                        closedAt: {'.sv': 'timestamp'},
                        showProgress: copy.showProgress,
                        archived: false,
                        type: "TRAT",
                        teamFormationMethod: copy.teamFormationMethod,
                        mcqQuestions: copy.mcqQuestions
                    };
                    return priority ? tratTaskRef.setWithPriority(tratTask, priority)
                        : tratTaskRef.set(tratTask);
                }).then(function () {
                    console.log('TRAT set.');
                    console.log('Events Created');
                    spfAlert.success('Challenge saved');
                    $location.path(urlFor('editEvent', {eventId: event.$id}));
                });
            }
        },
        update: function (event, taskId, task, taskType, isOpen) {
            var copy = cleanObj(task);
            var answers = copy.answers;
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
            } else if (taskType === 'multipleChoice') {
                delete copy.singPathProblem;
                delete copy.badge;
                delete copy.answers;
            } else {
                delete copy.singPathProblem;
                copy.badge = cleanObj(task.badge);
            }

            if (!copy.link) {
                // delete empty link. Can't be empty string
                delete copy.link;
            }

            self.creatingTask = true;
            var ref = clmDataStore.events.updateTaskWithAns(event.$id, taskId, copy, answers);
            ref.then(function () {
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
                $location.path(urlFor('editEvent', {eventId: event.$id}));
            }).catch(function () {
                spfAlert.error('Failed to save the challenge.');
            }).finally(function () {
                self.savingTask = false;
            });
            ;
        }
    }
}
challengeServiceFactory.$inject =
    ['$q', '$route', 'spfAuthData', 'clmDataStore', '$log', 'spfAlert', '$location', 'urlFor',
        'firebaseApp', '$firebaseArray', '$firebaseObject'];

// export const component = {
//
// }

function surveyFormEvent($scope, clmSurvey, clmDataStore, $log, spfAlert, $location, urlFor, $mdDialog, spfNavBarService, $route) {
    this.surveys = [
        {id: 1, name: 'Education vs Dissatisfaction with learning'},
        {id: 2, name: 'Motivated strategies for learning'},
        {id: 3, name: 'School engagement scale'}

    ];
    //TODO: retrieve selected value, add task into firebase
    // var sharedData = clmSurvey.get();
    // var getTask = sharedData.task;
    var eventTitle = $route.current.params.eventTitle;
    var self = this;
    var eventId = $route.current.params.eventId;
    var getTask = JSON.parse($route.current.params.task);

    // console.log(sharedData);

    spfNavBarService.update(
        getTask.title, [{
            title: 'Events',
            url: `#${urlFor('events')}`
        }, {
            title: eventTitle,
            url: `#${urlFor('oneEvent', {eventId: eventId})}`
        }, {
            title: 'Challenges',
            url: `#${urlFor('editEvent', {eventId: eventId})}`
        }]
    );

    // console.log("my survey temp is ", self.surveyType);

    self.hasSurveyTitle = false;

    //check if survey template has been selected.
    this.checkSurveyValid = function () {
        if (self.surveyType == 0 || self.surveyType == undefined) {
            self.hasSurveyTitle = false;
        } else {
            self.hasSurveyTitle = true;
        }
    };

    // console.log("the survey t/f is", self.hasSurveyTitle);
    self.showPreview = function (surveyType) {
        self.loadPreview = true;
        if (surveyType.name == 'School engagement scale') {
            $location.path('/challenges/survey1/' + eventTitle +'/' + eventId + '/' + $route.current.params.task + '/' + surveyType.name);
        }
        if (surveyType.name == 'Motivated strategies for learning') {
            $location.path('/challenges/survey2/' + eventTitle +'/' + eventId + '/' + $route.current.params.task + '/' + surveyType.name);
        }
        if (surveyType.name == 'Education vs Dissatisfaction with learning') {
            $location.path('/challenges/survey3/' + eventTitle +'/' + eventId + '/' + $route.current.params.task + '/' + surveyType.name);
        }
    };

    this.saveSurveyTask = function (surveyType) {
        var copy = cleanObj(getTask);

        self.creatingTask = true;
        // console.log("survey type is " + surveyType);
        copy.survey = surveyType;
        clmDataStore.events.addTask(eventId, copy, true).then(function () {
            spfAlert.success('Challenge created.');
            $location.path(urlFor('editEvent', {eventId: eventId}));
        }).catch(function (err) {
            $log.error(err);
            spfAlert.error('Failed to create new challenge.');
        }).finally(function () {
            self.creatingTask = false;
        });
    };

    this.discardChanges = function (ev) {
        var confirm = $mdDialog.confirm()
            .title('Would you like to discard your changes?')
            .textContent('All of the information input will be discarded. Are you sure you want to continue?')
            .ariaLabel('Discard changes')
            .targetEvent(ev)
            .ok('Cancel Editing')
            .cancel('Continue Editing');
        $mdDialog.show(confirm).then(function () {
            // decided to discard data, bring user to previous page
            $location.path(urlFor('editEvent', {eventId: eventId}));
        })
    }

}
surveyFormEvent.$inject = [
    '$scope',
    'clmSurvey',
    'clmDataStore',
    '$log',
    'spfAlert',
    '$location',
    'urlFor',
    '$mdDialog',
    'spfNavBarService',
    '$route'
];

function getTaskSurveyEditValues($q, $route, spfAuthData, clmDataStore){

    var eventId = $route.current.params.eventId;
    var taskId = $route.current.params.taskId;
    var editedTask = JSON.parse($route.current.params.task);
    // var chosenTask = clmDataStore.events.getTask(eventId, taskId);
    return $q.all({
        task: clmDataStore.events.getTask(eventId, taskId),
        event: clmDataStore.events.get(eventId),
        editedTask: editedTask
    });

}
getTaskSurveyEditValues.$inject = ['$q', '$route', 'spfAuthData', 'clmDataStore'];

function editsurveyFormEvent(initialData, $scope, clmSurvey, clmDataStore, $log, spfAlert, $location, urlFor, spfNavBarService, eventService, $mdDialog) {

    //todo: sheryl comment to add corner cases checking; only allow edit when 1. there are no submission for the challenge 2. the challenge is closed (avoid race conditions)
    this.surveys = [
        {id: 1, name: 'Education vs Dissatisfaction with learning'},
        {id: 2, name: 'Motivated strategies for learning'},
        {id: 3, name: 'School engagement scale'}

    ];

    var editedTask = initialData.editedTask;

    //TODO: retrieve selected value, add task into firebase
    var sharedData = clmSurvey.get();
    var getTask = sharedData.task;
    var self = this;

    self.currentSelected = initialData.task.survey;

    //NOTE: no need to check for valid cause you cannot deselect your previous option.
    self.hasSurveyTitle = false;

    //check if survey template has been selected.
    this.checkSurveyValid = function () {
        // self.currentSelected = self.surveyType.name;

        if (self.surveyType == 0 || self.surveyType == undefined) {
            self.hasSurveyTitle = false;
        } else {
            self.hasSurveyTitle = true;
        }
    };

    spfNavBarService.update(
        initialData.task.title, [{
            title: 'Events',
            url: `#${urlFor('events')}`
        }, {
            title: initialData.event.title,
            url: `#${urlFor('oneEvent', {eventId: initialData.event.$id})}`
        }, {
            title: 'Challenges',
            url: `#${urlFor('editEvent', {eventId: initialData.event.$id})}`
        }]
    );

    this.saveSurveyTask = function (surveyType) {
        var copy = cleanObj(initialData.task);

        //assign all edited values to the copy to be put into firebase
        self.creatingTask = true;
        copy.survey = surveyType;
        console.log("copy for edit survey is: ", copy);
        console.log("my editedTask is: ", editedTask);
        copy.archived = editedTask.archived;
        copy.description = editedTask.description;
        copy.showProgress = editedTask.showProgress;
        copy.title = editedTask.title;


        // var data = {
        //     taskType: copy.survey,
        //     isOpen: sharedData.isOpen,
        //     event: sharedData.event,
        //     task: getTask
        // };
        //
        // eventService.set(data);

        // $location.path(location);

        self.savingTask = true;
        clmDataStore.events.updateTask(initialData.event.$id, initialData.task.$id, copy).then(function () {
            // if (
            //     (sharedData.isOpen && sharedData.task.openedAt) ||
            //     (!sharedData.isOpen && sharedData.task.closedAt)
            // ) {
            //     return;
            // } else if (sharedData.isOpen) {
            //     return clmDataStore.events.openTask(sharedData.eventId, sharedData.task.$id);
            // }
            //
            // return clmDataStore.events.closeTask(sharedData.eventId, sharedData.task.$id);
        }).then(function () {
            $location.path(urlFor('editEvent', {eventId: initialData.event.$id}));
            spfAlert.success('Survey has been edited.');
        }).catch(function () {
            spfAlert.error('Failed to edit the survey.');
        }).then(function () {
            self.savingTask = false;
        });

    };

    this.discardChanges = function (ev) {
        var confirm = $mdDialog.confirm()
            .title('Would you like to discard your changes?')
            .textContent('All of the information input will be discarded. Are you sure you want to continue?')
            .ariaLabel('Discard changes')
            .targetEvent(ev)
            .ok('Cancel Editing')
            .cancel('Continue Editing');
        $mdDialog.show(confirm).then(function () {
            // decided to discard data, bring user to previous page
            $location.path(urlFor('editEvent', {eventId: sharedData.event.$id}));
        })
    }

}
editsurveyFormEvent.$inject = [
    'initialData',
    '$scope',
    'clmSurvey',
    'clmDataStore',
    '$log',
    'spfAlert',
    '$location',
    'urlFor',
    'spfNavBarService',
    'eventService',
    '$mdDialog'
];


function getTaskSurveyValues(clmSurvey, $q, $route, spfAuthData, clmDataStore) {

    var eventId = $route.current.params.eventId;
    var data = baseEditCtrlInitialData(eventId, $q, $route, spfAuthData, clmDataStore, clmSurvey);
    data.badges = clmDataStore.badges.all();
    data.singPath = $q.all({
        paths: clmDataStore.singPath.paths(),
        levels: [],
        problems: []
    });

    return $q.all(data);
}
getTaskSurveyValues.$inject = ['clmSurvey', '$q', '$route', 'spfAuthData', 'clmDataStore'];

function baseEditCtrlInitialData(eventId, $q, $route, spfAuthData, clmDataStore, clmSurvey) {

    var task = $route.current.params.task;

    // var sharedData = clmSurvey.get();
    var errNoEvent = new Error('Event not found');
    var errNotAuthaurized = new Error('You cannot edit this event');

    var eventPromise = clmDataStore.events.get(eventId).then(function (event) {
        if (event.$value === null) {
            return $q.reject(errNoEvent);
        }
        return event;
    });

    var data = {
        currentUser: spfAuthData.user(),
        event: eventPromise
    };
    data.canEdit = $q.all({
        currentUser: spfAuthData.user(),
        event: eventPromise
    }).then(function (result) {
        if (
            !result.currentUser.publicId || !result.event.owner || !result.event.owner.publicId ||
            result.event.owner.publicId !== result.currentUser.publicId
        ) {
            return $q.reject(errNotAuthaurized);
        }

        return result;
    });

    return data;
}
