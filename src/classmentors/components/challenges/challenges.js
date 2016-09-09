/**
 * Created by AMOS on 10/7/16.
 */


//TODO: Add various imports for challenge(s)
import * as mcq from './mcq/mcq.js';
import * as survey from './survey/survey.js';
import * as team from './teamActivity/teamactivity.js';
import {cleanObj} from 'singpath-core/services/firebase.js';

const noop = () => undefined;

//TODO: Add config for routing to various challenges
export function configRoute($routeProvider, routes){
    $routeProvider
        .when(routes.viewMcq, {
            template: mcq.newMcqTmpl,
            controller: mcq.newMcqController,
            controllerAs: 'ctrl',
            resolve:{
              initialData: createMCQInitialData
            }
        })

        .when(routes.editMcq, {
            template: mcq.editMcqTmpl,
            controller: mcq.editMcqController,
            controllerAs: 'ctrl',
            resolve:{
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

        .when(routes.startMcq, {
            template: mcq.starMcqTmpl,
            controller: mcq.startMcqController,
            controllerAs: 'ctrl',
            resolve:{
              initialData: startMCQInitialData
            }
        })

        .when(routes.createTeamActivity, {
            template: team.teamActivityCreateTmpl,
            controller: team.createTeamActivityController,
            controllerAs: 'ctrl',
            resolve:{
                initialData: team.createTeamActivityInitialData
            }
        })
        .when(routes.viewIRAT,{
            template: team.teamIRATTmpl,
            controller: team.startIRATController,
            controllerAs:'ctrl',
            resolve:{
                initialData: team.createTeamActivityInitialData
            }
        })
        .when(routes.viewTRAT,{
            template: team.teamTRATTmpl,
            controller: team.startTRATController,
            controllerAs:'ctrl',
            resolve:{
                initialData: team.createTeamActivityInitialData
            }

        });

}
configRoute.$inject = ['$routeProvider', 'routes'];


function editMCQInitialData($q, eventService, clmDataStore){
  var data = eventService.get();
  console.log(data);
  return clmDataStore.events.getTaskAnswers(data.event.$id, data.task.$id).then(
      function(result){
        return {
          data: data,
          savedAnswers: result
        }
      }, function(error){
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
function startMCQInitialData($q, spfAuthData, eventService, clmDataStore){
    //promise object
   // var currentUser = spfAuthData.user().catch(noop);

    var data =  eventService.get();

    console.log("the data is here...,", data);
    //console.log("current user now is.", currentUser);

    return $q.all ({
       currentUser: spfAuthData.user(),
        answers: clmDataStore.events.getTaskAnswers(data.eventId, data.taskId),
        getProgress: clmDataStore.events.getProgress(data.eventId)
    }).then (function (result){
        return {
            data: data,
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
    'clmDataStore'
]

// Initial data for creating MCQ
function createMCQInitialData($q, eventService){
  var data =  eventService.get();
  console.log("data initialised are............................",data);
  return data;
}
createMCQInitialData.$inject = [
  '$q',
  'eventService'
]

//TODO: Generic save function
export function challengeServiceFactory
  ($q, $route, spfAuthData, clmDataStore, $log, spfAlert, $location, urlFor){
  return {
    save : function(event, taskId, task, taskType, isOpen) {
      var copy = cleanObj(task);
      var answers = copy.answers;
      console.log('COPY IS ... ', copy);

      self.creatingTask = true;
      if (taskType === 'multipleChoice'){
        delete copy.singPathProblem;
        delete copy.badge;
        delete copy.answers;

        var ref = clmDataStore.events.addTaskWithAns(event.$id, copy, isOpen,answers);
        ref.then(function() {
            spfAlert.success('Task created');
            $location.path(urlFor('editEvent', {eventId: event.$id}));
        }).catch(function(err) {
            $log.error(err);
            spfAlert.error('Failed to created new task');
        }).finally(function() {
            self.creatingTask = false;
        });

      } else if(taskType === 'teamActivity'){
        delete copy.singPathProblem;
        delete copy.badge;
        delete copy.answers;
        console.log(copy);
        // Create reccord in eventTeams

        // Create reccord in answers and tasks
        var ref = clmDataStore.events.addTaskWithAns(event.$id, copy, isOpen,answers);
        ref.then(function() {
            spfAlert.success('Task created');
            $location.path(urlFor('editEvent', {eventId: event.$id}));
        }).catch(function(err) {
            $log.error(err);
            spfAlert.error('Failed to created new task');
        }).finally(function() {
            self.creatingTask = false;
        });
      }



    },
    update: function(event, taskId, task, taskType, isOpen) {
      var copy = cleanObj(task);
      var answers = copy.answers;
      console.log('COPY IS ... ', copy);
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
      }else if (taskType === 'multipleChoice'){
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
      ref.then(function() {
        if (
            (isOpen && task.openedAt) ||
            (!isOpen && task.closedAt)
        ) {
          return;
        } else if (isOpen) {
          return clmDataStore.events.openTask(event.$id, taskId);
        }

        return clmDataStore.events.closeTask(event.$id, taskId);
      }).then(function() {
        spfAlert.success('Task saved');
        $location.path(urlFor('editEvent', {eventId: event.$id}));
      }).catch(function() {
        spfAlert.error('Failed to save the task.');
      }).finally(function() {
        self.savingTask = false;
      });;
    }
  }
}
challengeServiceFactory.$inject =
    ['$q', '$route', 'spfAuthData', 'clmDataStore', '$log', 'spfAlert', '$location', 'urlFor'];

// export const component = {
//
// }

function surveyFormEvent($scope, clmSurvey, clmDataStore, $log, spfAlert, $location, urlFor) {

    this.surveys = [
        {id: 1, name: 'Education vs Dissatisfaction with learning'},
        {id: 2, name: 'Motivated strategies for learning'},
        {id: 3, name: 'School engagement scale'}

    ];
    //TODO: retrieve selected value, add task into firebase
    var sharedData = clmSurvey.get();
    //console.log("surveyFormEvent eventId : " + sharedData.taskType);
    var getTask = sharedData.task;
    var self = this;

    this.saveSurveyTask = function (surveyType) {
        var copy = cleanObj(getTask);
        console.log('my copy is ', copy);
        if (sharedData.taskType === 'linkPattern') {
            delete copy.badge;
            delete copy.serviceId;
            delete copy.singPathProblem;
        } else if (copy.serviceId === 'singPath') {
            delete copy.badge;
            if (copy.singPathProblem) {
                copy.singPathProblem.path = cleanObj(getTask.singPathProblem.path);
                copy.singPathProblem.level = cleanObj(getTask.singPathProblem.level);
                copy.singPathProblem.problem = cleanObj(getTask.singPathProblem.problem);
            }
        } else {
            delete copy.singPathProblem;
            copy.badge = cleanObj(getTask.badge);
        }

        if (!copy.link) {
            // delete empty link. Can't be empty string
            delete copy.link;
        }

        self.creatingTask = true;
        console.log("survey type is " + surveyType);
        copy.survey = surveyType;
        clmDataStore.events.addTask(sharedData.eventId, copy, sharedData.isOpen).then(function () {
            spfAlert.success('Challenge created');
            $location.path(urlFor('editEvent', {eventId: sharedData.eventId}));
        }).catch(function (err) {
            $log.error(err);
            spfAlert.error('Failed to create new challenge.');
        }).finally(function () {
            self.creatingTask = false;
        });
    };

}
surveyFormEvent.$inject = [
    '$scope',
    'clmSurvey',
    'clmDataStore',
    '$log',
    'spfAlert',
    '$location',
    'urlFor'
];


function getTaskSurveyValues(clmSurvey, $q, $route, spfAuthData, clmDataStore) {
    var sharedData = clmSurvey.get();

    var data = baseEditCtrlInitialData(sharedData, $q, $route, spfAuthData, clmDataStore, clmSurvey);
    if (data != null) {
        console.log("Data is not null!!!");
    } else {
        console.log("DATA IS NULLLL!!");
    }
    data.badges = clmDataStore.badges.all();
    data.singPath = $q.all({
        paths: clmDataStore.singPath.paths(),
        levels: [],
        problems: []
    });

    return $q.all(data);
}
getTaskSurveyValues.$inject = ['clmSurvey', '$q', '$route', 'spfAuthData', 'clmDataStore'];


function baseEditCtrlInitialData(sharedData, $q, $route, spfAuthData, clmDataStore, clmSurvey) {


    var sharedData = clmSurvey.get();
    var errNoEvent = new Error('Event not found');
    var errNotAuthaurized = new Error('You cannot edit this event');
    var eventId = $route.current.params.eventId;

    var eventPromise = clmDataStore.events.get(sharedData.eventId).then(function (event) {
        if (event.$value === null) {
            return $q.reject(errNoEvent);
        }
        return event;
    });

    var data = {
        currentUser: spfAuthData.user(),
        event: eventPromise
    };
    console.log("current user id: " + data.currentUser);
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
