
//TODO: Add imports
import mcqTmpl from './mcq-view-mcq.html!text';
import mcqEditTmpl from './mcq-view-mcq-edit.html!text';
import mcqStart from './mcq-view-start.html!text';

const noop = () => undefined;

function mcqQuestionFactory(){
  var self = this;
  self.questions = {
    list:[],

  }
  return {
    create: function(){

    }
  }
}

export function editMcqController(initialData,spfNavBarService, challengeService, $filter,$mdDialog, urlFor, $location){
  //todo: sheryl comment to add corner cases checking; only allow edit when 1. there are no submission for the challenge 2. the challenge is closed (avoid race conditions)

  var self = this;

  self.task = initialData.data.task;
  self.isMcqValid = true;
  self.isTextFilled = true;
  var questions = angular.fromJson(self.task.mcqQuestions);
  var savedAnswers = angular.fromJson(initialData.savedAnswers.$value);
  self.questions = builtMCQ(questions, savedAnswers);



  spfNavBarService.update(
      initialData.data.task.title, [{
        title: 'Events',
        url: `#${urlFor('events')}`
      }, {
        title: initialData.data.event.title,
        url: `#${urlFor('oneEvent', {eventId: initialData.data.event.$id})}`
      }, {
        title: 'Challenges',
        url: `#${urlFor('editEvent', {eventId: initialData.data.event.$id})}`
      }]
  );



  function builtMCQ(questions, savedAnswers){
    for(var i = 0; i < questions.length; i ++){
      questions[i].answers = savedAnswers[i];
    }
    return questions;
  }

  self.checkMCQValid = function(text){
    console.log("text",text);
    if(text.length == 0 || text == undefined){
      self.isTextFilled = false;
    }else{
      self.isTextFilled = true;
    }
  };

  self.isOptionValid = true;

  self.checkOptionValid = function(text){
    if(text.length == 0 || text == undefined){
      self.isOptionValid = false;
    }else{
      self.isOptionValid = true;
    }
  }

  // console.log("var questions are", questions);
  // console.log("self q", self.questions);

  // self.isMcqValid = checkMCQValid();
  // Save mcq question to database.

  self.save = function(questions){
    var setAnswers = [];

    for(var i = 0; i < questions.length; i ++){
      var answers = questions[i].answers;
      setAnswers.push(answers)
      delete questions[i].answers;
    }

    // Check does questions contain answers?
    // console.log(questions);

    // Check answer list
    // console.log(setAnswers);

    // Change questions into JSON text
    var answersJsonText = angular.toJson(questions);
    // console.log(answersJsonText);

    // Save function defined in challenges.js
    // Parameters: event, taskid, task, taskType, isOpen
    var event = initialData.data.event;
    var task = self.task;
    var taskId = task.$id;
    var taskType = initialData.data.taskType;
    var isOpen = initialData.data.isOpen;
    task.mcqQuestions = answersJsonText;
    task.answers = angular.toJson(setAnswers);
    // console.log(task);
    challengeService.update(event, taskId, task,taskType, isOpen);
  }

  // Add question when add question button is clicked
  self.addQuestion = function(){
    var question = {
      text:"",
      answers:[],
      options:[
        {
          text:""
        }
      ]
    }

    // Push new question object into questions list
    self.questions.push(question);
    checkMCQValid();
  }

  function checkMCQValid(){
    for (var i = 0; i < self.questions.length; i ++){
      if(self.questions[i].answers.length == 0){
        self.isMcqValid = false;

        return;
      }
    }
    self.isMcqValid = true;
  }

  self.removeQuestion = function(ev,itemIndex) {

    var confirm = $mdDialog.confirm()
        .title('Would you like to delete this question?')
        .textContent('This question and its option(s) will be deleted. Do you wish to proceed?')
        .ariaLabel('Question deletion')
        .targetEvent(ev)
        .ok('Delete')
        .cancel('Do not delete');
    $mdDialog.show(confirm).then(function() {
      if(itemIndex > -1){
        var removed = self.questions.splice(itemIndex,1);
        console.log('Removed : ', removed);
        console.log(self.questions);
        checkMCQValid();
      }
    });
  };

  // Functionality for toggleOption between single answer and multi ans functionality
  // Needs further review though..
  // Is it better to set the answers as default multiple and the users will just set 1..n answers?
  self.toggleOption = function(question, itemIndex){
    console.log('Index being deleted...', itemIndex)
    var idx = question.answers.indexOf(itemIndex);
    if(idx > -1){
      var removed = question.answers.splice(idx,1);
      console.log(removed);
    }else{
      question.answers.push(itemIndex);
    }
    console.log(question.answers);
    checkMCQValid();
  }

  // Add new option to question
  self.addOption = function (question) {
    // Get options
    question.options.push({
      text:""
    });
    checkMCQValid();
  }

  // Delete options
  self.removeOption = function(question, itemIndex) {
    question.options.splice(itemIndex,1);
    var idxOfAns = question.answers.indexOf(itemIndex);
    if(idxOfAns > -1){
      var removedAns = question.answers.splice(idxOfAns,1);
      console.log('Removed an answer: ', removedAns);
    }
    for(var i = 0; i < question.answers.length; i ++){
      var ans = question.answers[i];
      if(ans > itemIndex){
        question.answers[i] = ans - 1;
      }
    }
    console.log(question.options);
    checkMCQValid();
  }

  //back button controls here
  self.discardChanges = function (ev){
    var confirm = $mdDialog.confirm()
        .title('You have not saved your changes')
        .textContent('All of your changes will be discarded. Are you sure you want to continue?')
        .ariaLabel('Discard changes')
        .targetEvent(ev)
        .ok('Discard my changes')
        .cancel('Continue editing');
    $mdDialog.show(confirm).then(function() {

      $location.path(urlFor('editEvent', {eventId: initialData.data.event.$id}));
    })
  }

}


editMcqController.$inject = [
    'initialData',
    'spfNavBarService',
    'challengeService',
    '$filter',
    '$mdDialog',
    'urlFor',
    '$location'
];

export function startMcqController(initialData, challengeService, clmDataStore, $location, $mdDialog,urlFor, spfAlert, $scope,spfNavBarService){
  var self = this;

  var mcqInvalid = true;
  $scope.$on("$routeChangeStart", function (event, next, current) {
    if (mcqInvalid) {
      if (!confirm("You have not finish your multiple choice questions. Are you sure you want to continue? All data will be lost.")) {
        event.preventDefault();
      }
    }


  });
  self.someDate = new Date('2026-08-16T06:17:00')
  var data = initialData;
  var eventId = data.eventId;
  var taskId = data.taskId;
  var participant = data.currentUser;
  var userId = data.currentUser.publicId;

  var correctAnswers = angular.fromJson(data.correctAnswers.$value);
  // console.log('correctans:',correctAnswers);
  self.task = data.task;
  var quesFromJson = angular.fromJson(self.task.mcqQuestions);
  self.questions = quesFromJson;
  self.multipleAns = initMultipleAns(correctAnswers);

  self.isMcqValid = false;

  // what is dah output?
  //console.log(self.multipleAns);

  //update navbar herrre. 5566

  // console.log("all the data is ",data);

  spfNavBarService.update(
      data.task.title, [{
        title: 'Events',
        url: `#${urlFor('events')}`
      }, {
        title: data.eventTitle,// modify initialdata
        url: `#${urlFor('oneEvent', {eventId: eventId})}`
      }]
  );


  function initMultipleAns(correctAnswers){
    var multipleAnsList = [];
    for(var i = 0; i < correctAnswers.length; i ++){
      if(correctAnswers[i].length > 1){
        multipleAnsList.push(true);
        self.questions[i].answers = [];
      }else {
        multipleAnsList.push(false);
      }
    }
    return multipleAnsList;
  }

  self.toggle = function(list, item){
    console.log(list);
    var idx = list.indexOf(item);
    if (idx > -1) {
      list.splice(idx, 1);
    }
    else {
      list.push(item);
    }
  }

  function arraysEqual(arr1, arr2) {
    if(arr1.length !== arr2.length)
      return 0;
    for(var i = arr1.length; i--;) {
      if(arr1[i] !== arr2[i])
        return 0;
    }
    return 1;
  }

  function markQuestions(submittedAnswers){
    console.log('Correct Answers...', correctAnswers);
    console.log('Submitted Answers...', submittedAnswers);
    var score = 0;
    for(var i = 0; i < submittedAnswers.length; i ++){

      score += arraysEqual(submittedAnswers[i], correctAnswers[i]);
    }

    return score;
  }

  self.submit = function(){
    mcqInvalid = false;
    var submission = {};
    var userAnswers = [];
    for(var i = 0; i < self.questions.length; i++){
      var ans = self.questions[i].answers;
      if (typeof ans == 'string'){
        ans = angular.fromJson('[' + ans + ']');
      }
      userAnswers.push(ans);
    }
    submission.userAnswers = userAnswers;

    var score = markQuestions(userAnswers);
    var answerString = angular.toJson(submission);

    clmDataStore.events.submitSolution(eventId, taskId, participant.publicId, answerString)
      .then(
        clmDataStore.events.saveScore(eventId, participant.publicId, taskId, score),
        spfAlert.success('Your Mcq responses are saved.'),

        //set progress to true, and save the progress into firebase

        initialData.progress[userId] = {taskId},
        initialData.progress[userId][taskId] = {completed: true},
        // clmDataStore.events.setProgress(eventId, taskId, userId, initialData.progress),

        $location.path(urlFor('oneEvent',{eventId: eventId}))
      ). catch (function (err){

        $log.error(err);
        spfAlert.error('Failed to save the mcq responses.');
        return err;
    });

  }

  self.cancel = function () {
    $mdDialog.hide();
  };


  self.discardChanges = function (ev){
    mcqInvalid = false;
    var confirm = $mdDialog.confirm()
        .title('Would you like to discard your answers?')
        .textContent('All of your answers will be discarded. Are you sure you want to continue?')
        .ariaLabel('Discard answers')
        .targetEvent(ev)
        .ok('Cancel Answering')
        .cancel('Continue Answering');
    $mdDialog.show(confirm).then(function() {
      $location.path(urlFor('oneEvent', {eventId: eventId}));

    })
  }

}

startMcqController.$inject = [
  'initialData',
  'challengeService',
  'clmDataStore',
  '$location',
    '$mdDialog',
    'urlFor',
    'spfAlert',
    '$scope',
    'spfNavBarService'
];

export function newMcqController(initialData, challengeService, $filter,$mdDialog,urlFor,$location, spfNavBarService){
  var self = this;

  // Checks if all questions have at least one answer
  // self.isMcqValid = true;
  // console.log("new mcq data are", initialData);
  self.task = initialData.task;
  self.event = initialData.event;
  self.isMcqValid = false;
  self.isTextFilled = false;

  spfNavBarService.update(
      self.task.title, [{
        title: 'Events',
        url: `#${urlFor('events')}`
      }, {
        title: self.event.title,
        url: `#${urlFor('oneEvent', {eventId: self.event.$id})}`
      }, {
        title: 'Challenges',
        url: `#${urlFor('editEvent', {eventId: self.event.$id})}`
      }]
  );

  self.checkMCQValid = function(text){
    console.log(text);
    if(text.length == 0 || text == undefined){
      self.isTextFilled = false;
    }else{
      self.isTextFilled = true;
    }
  };
  self.isOptionValid = false;

  self.checkOptionValid = function(text){
    if(text.length == 0 || text == undefined){
      self.isOptionValid = false;
    }else{
      self.isOptionValid = true;
    }
  }
  self.questions = [{
    text:"",
    answers:[],
    options:[
      {
        text:""
      }
    ]
  }];

  // Save mcq question to database.

  //todo: clean up the form before submitting. e.g. when toggled, vid entered, but toggled off
  self.save = function(questions){
    var setAnswers = [];

    for(var i = 0; i < questions.length; i ++){
      var answers = questions[i].answers;
      setAnswers.push(answers)
      delete questions[i].answers;
    }

    // Check does questions contain answers?
    // console.log(questions);
    //
    // // Check answer list
    // console.log(setAnswers);

    // Change questions into JSON text
    var answersJsonText = angular.toJson(questions);
    // console.log(answersJsonText);

    // Save function defined in challenges.js
    // Parameters: event, taskid, task, taskType, isOpen
    var event = initialData.event;
    var task = initialData.task;
    var taskId = initialData.taskId;
    var taskType = initialData.taskType;
    var isOpen = initialData.isOpen;
    task.mcqQuestions = answersJsonText;
    task.answers = angular.toJson(setAnswers);

    challengeService.save(event, taskId, task,taskType, isOpen);
  }

  // Add question when add question button is clicked
  self.addQuestion = function(){
    var question = {
      text:"",
      answers:[],
      options:[
        {
          text:""
        }
      ]
    }

    // Push new question object into questions list
    self.questions.push(question);
    checkMCQValid();

  }

  function checkMCQValid(){
    for (var i = 0; i < self.questions.length; i ++){
      if(self.questions[i].answers.length == 0){
        self.isMcqValid = false;
        return;
      }
    }
    self.isMcqValid = true;
  }
  self.removeQuestion = function(ev,itemIndex) {

    var confirm = $mdDialog.confirm()
        .title('Would you like to delete this question?')
        .textContent('This question and its option(s) will be deleted. Do you wish to proceed?')
        .ariaLabel('Question deletion')
        .targetEvent(ev)
        .ok('Delete')
        .cancel('Do not delete');
    $mdDialog.show(confirm).then(function() {
      if(itemIndex > -1){
        var removed = self.questions.splice(itemIndex,1);
        console.log('Removed : ', removed);
        console.log(self.questions);
        checkMCQValid();
      }
    });
  };

  self.toggleOption = function(question, itemIndex){
    console.log('Index being deleted...', itemIndex)
    var idx = question.answers.indexOf(itemIndex);
    if(idx > -1){
      var removed = question.answers.splice(idx,1);
      console.log(removed);
    }else{
      question.answers.push(itemIndex);
    }
    console.log(question.answers);

    checkMCQValid();
  }

  // Add new option to question
  self.addOption = function (question) {
    // Get options
    question.options.push({
      text:""
    });

    checkMCQValid();
  }

  // Delete options
  self.removeOption = function(question, itemIndex) {
    question.options.splice(itemIndex,1);
    var idxOfAns = question.answers.indexOf(itemIndex);
    if(idxOfAns > -1){
      var removedAns = question.answers.splice(idxOfAns,1);
      console.log('Removed an answer: ', removedAns);
    }
    for(var i = 0; i < question.answers.length; i ++){
      var ans = question.answers[i];
      if(ans > itemIndex){
        question.answers[i] = ans - 1;
      }
    }
    console.log(question.options);
    checkMCQValid();
  }

  self.discardChanges = function (ev){
    var confirm = $mdDialog.confirm()
        .title('You have not save your challenge information')
        .textContent('All of the information input will be discarded. Are you sure you want to continue?')
        .ariaLabel('Discard changes')
        .targetEvent(ev)
        .ok('Discard Challenge')
        .cancel('Continue Editing');
    $mdDialog.show(confirm).then(function() {

      $location.path(urlFor('oneEvent', {eventId: initialData.event.$id}));

    })
  }

}
newMcqController.$inject = [
  'initialData',
  'challengeService',
  '$filter',
  '$mdDialog',
  'urlFor',
  '$location',
  'spfNavBarService'
];

export function starMcqTmpl() {
  return mcqStart;
}
//this export function return the template when creating a new mcq challenge
export function newMcqTmpl(){
    return mcqTmpl;
}

export function editMcqTmpl(){
    return mcqEditTmpl;
}
