
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

export function editMcqController(initialData, challengeService, $filter,$mdDialog, urlFor, $location){
  var self = this;


  // Checks if all questions have at least one answer

  self.task = initialData.data.task;
  // console.log("the initial edit data is........", initialData);
  var questions = angular.fromJson(self.task.mcqQuestions);
  var savedAnswers = angular.fromJson(initialData.savedAnswers.$value);
  self.questions = builtMCQ(questions, savedAnswers);

  function builtMCQ(questions, savedAnswers){
    for(var i = 0; i < questions.length; i ++){
      questions[i].answers = savedAnswers[i];
    }
    return questions;
  }
  self.isMcqValid = checkMCQValid();
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

  //todo:add back button controls here
  self.discardChanges = function (ev){
    var confirm = $mdDialog.confirm()
        .title('Would you like to discard your changes?')
        .textContent('All of the information input will be discarded. Are you sure you want to continue?')
        .ariaLabel('Discard changes')
        .targetEvent(ev)
        .ok('Cancel Editing')
        .cancel('Continue Editing');
    $mdDialog.show(confirm).then(function() {
      // decided to discard data, bring user to previous page

      //todo: link back to previous page
      //$location.path(urlFor('editEventTask', {eventId: initialData.event.$id},{taskId: task.$id}));
      $location.path(urlFor('oneEvent', {eventId: initialData.event.$id}));
    })
  }


}
editMcqController.$inject = [
    'initialData',
    'challengeService',
    '$filter',
    '$mdDialog',
    'urlFor',
    '$location'
];

export function startMcqController(initialData, challengeService, clmDataStore, $location, $mdDialog,urlFor, spfAlert ){
  var self = this;

  var data = initialData.data;
  var eventId = data.eventId;
  var taskId = data.taskId;
  var participant = data.participant;

  //console.log(initialData);
  //get user's Id
  var userId = initialData.currentUser.publicId;

  console.log("the userid is", userId);


  var correctAnswers = angular.fromJson(initialData.correctAnswers.$value);
  //console.log(correctAnswers);
  self.task = data.task;
  var quesFromJson = angular.fromJson(self.task.mcqQuestions);
  self.questions = quesFromJson
  self.multipleAns = initMultipleAns(correctAnswers);

  self.isMcqValid = false;

  // what is dah output?
  //console.log(self.multipleAns);

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
    // console.log(submission.score);
    // console.log(answerString);

    clmDataStore.events.submitSolution(eventId, taskId, participant.$id, answerString)
      .then(
        clmDataStore.events.saveScore(eventId, participant.$id, taskId, score),
        spfAlert.success('Your Mcq responses are saved.'),

        //todo:set progress to true, and save the progress into firebase

        initialData.progress[userId] = {taskId},
        initialData.progress[userId][taskId] = {completed: true},
        clmDataStore.events.setProgress(eventId, taskId, userId, initialData.progress),

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
    var confirm = $mdDialog.confirm()
        .title('Would you like to discard your answers?')
        .textContent('All of your answers will be discarded. Are you sure you want to continue?')
        .ariaLabel('Discard answers')
        .targetEvent(ev)
        .ok('Cancel Answering')
        .cancel('Continue Answering');
    $mdDialog.show(confirm).then(function() {
      // decided to discard data, bring user to previous page

      //todo: link back to previous page
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
    'spfAlert'
];

export function newMcqController(initialData, challengeService, $filter,$mdDialog,urlFor,$location){
  var self = this;

  // Checks if all questions have at least one answer
  self.isMcqValid = false;
  self.task = initialData.task;
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
    console.log(questions);

    // Check answer list
    console.log(setAnswers);

    // Change questions into JSON text
    var answersJsonText = angular.toJson(questions);
    console.log(answersJsonText);

    // Save function defined in challenges.js
    // Parameters: event, taskid, task, taskType, isOpen
    var event = initialData.event;
    var task = initialData.task;
    var taskId = initialData.taskId;
    var taskType = initialData.taskType;
    var isOpen = initialData.isOpen;
    task.mcqQuestions = answersJsonText;
    task.answers = angular.toJson(setAnswers);
    console.log(task);
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

  //todo:back button add here
  self.discardChanges = function (ev){

    var confirm = $mdDialog.confirm()
        .title('Would you like to discard your changes?')
        .textContent('All of the information input will be discarded. Are you sure you want to continue?')
        .ariaLabel('Discard changes')
        .targetEvent(ev)
        .ok('Cancel Editing')
        .cancel('Continue Editing');
    $mdDialog.show(confirm).then(function() {
      // decided to discard data, bring user to previous page

      //todo: link back to previous page
      //$location.path(urlFor('addEventTask', {eventId: initialData.event.$id}));
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
    '$location'
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