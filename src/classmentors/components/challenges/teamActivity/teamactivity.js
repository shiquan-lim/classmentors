import teamActivityCreateTmpl from './team-view-create.html!text';
import teamIRATTmpl from './teamactivity-view-irat-start.html!text';
import teamTRATTmpl from './teamactivity-view-trat-start.html!text';
import teamFormationTmpl from './teamactivity-view-teamFormation.html!text';
import './teamActivity.css!';

const TIMESTAMP = {'.sv': 'timestamp'};
function createTeamActivityInitialData($q, eventService, clmDataStore) {
    var data = eventService.get();
    // console.log("team data is:", data);

    return clmDataStore.events.participants(data.event.$id).then(
        function (result) {
            return {
                data: data,
                participants: result
            }
        }
    )
}
createTeamActivityInitialData.$inject = ['$q', 'eventService', 'clmDataStore'];

function createTeamActivityController($q, initialData, clmDataStore, $location, urlFor, eventService, $mdDialog) {
    var self = this;

    // console.log("initialdata for teamform are", initialData);
    // event variable consist of event id,timecreated,owner and event title
    self.event = initialData.data.event;

    //task variable consist of description,title of task, showProgress, priority, archived(t/f)
    self.task = initialData.data.task;

    self.taskType = initialData.data.taskType;

    self.participants = initialData.participants;
    self.teamsMaximumStudents = 0;
    self.taskType = initialData.data.taskType;
    self.activityType = null;
    self.newExistingTeams = null;
    self.teamFormationMethod = null;
    self.teamFormationParameter = null;


    self.submit = function () {
        self.task.activityType = self.activityType;
        self.task.newExistingTeams = self.newExistingTeams;
        self.task.teamFormationMethod = self.teamFormationMethod;
        self.task.teamFormationParameter = self.teamFormationParameter;
        self.task.startIRAT = true;
        self.event.teams = formTeams(self.teamFormationMethod, self.teamFormationParameter, self.participants.length);
        eventService.set({
            taskType: self.taskType,
            event: self.event,
            task: self.task,
            isOpen: initialData.data.isOpen
        });
        $location.path(urlFor('viewMcq'));
    };


    function formTeams(method, methodParameter, participants) {
        var teams = [];
        var teamStructure = [];
        participants = participants + 1;
        console.log('Total participants :', participants);
        if (method == 'noOfTeams') {
            //initialze teamStructure with team size of 0 each
            for (var i = 0; i < methodParameter; i++) {
                teamStructure.push(0);
            }

            console.log('teamStructure :', teamStructure);
            //add 1 to each team until there are no more participants left
            for (var i = 0; i < participants; i++) {
                teamStructure[i % methodParameter] += 1;
            }
        } else {//else by teamSize
            while (participants > methodParameter) {
                teamStructure.push(methodParameter);
                participants -= methodParameter;
            }
            // split up remaining participants
            for (var i = 0; i < participants; i++) {
                teamStructure[i % teamStructure.length] += 1;
            }
        }
        //Create 'teams'
        for (var i = 0; i < teamStructure.length; i++) {
            // teams[i] = populateTeam(teamStructure[i]);
            teams.push({
                maxSize: teamStructure[i],
                currentSize: 0
            });
        }
        // console.log('Teams is: ', teams);
        return teams;
    }

    function populateTeam(members) {
        var team = {}
        // console.log(members);
        for (var i = 0; i < members; i++) {
            team[i] = "";
        }
        // console.log(angular.toJson(team));
        return team;
    }

    // if number of teams, "Each team will have a maximum enrollment of # students"; #= roundup (totalParticipants / # of teams)
    // if max number of student, "You will have # teams"; #= round up (totalParticipants / # stud per team)
    self.calculateTeamMaximumStudent = function (noTeamsOrStudents) {
        // var noTeamsOrStudents = self.teamFormationInput;
        var totalParticipants = self.participants.length;

        // console.log("number is ", noTeamsOrStudents);
        // console.log("cal", Math.ceil(totalParticipants / noTeamsOrStudents));
        self.teamsMaximumStudents = Math.ceil(totalParticipants / noTeamsOrStudents) ? Math.ceil(totalParticipants / noTeamsOrStudents) : 0;

    }

    self.calculationResult = function () {

        return self.teamsMaximumStudents;
    }

    //this function double checks with user if he wishes to go back and discard all changes thus far
    this.discardChanges = function (ev) {
        var confirm = $mdDialog.confirm()
            .title('You have not save your challenge information')
            .textContent('All of the information input will be discarded. Are you sure you want to continue?')
            .ariaLabel('Discard changes')
            .targetEvent(ev)
            .ok('Discard Challenge')
            .cancel('Continue Editing');
        $mdDialog.show(confirm).then(function () {
            // decided to discard data, bring user to previous page
            $location.path(urlFor('editEvent', {eventId: self.event.$id}));
        });
    };

}
createTeamActivityController.$inject = [
    '$q',
    'initialData',
    'clmDataStore',
    '$location',
    'urlFor',
    'eventService',
    '$mdDialog'
];

function startTRATInitialData($q, spfAuthData, eventService, clmDataStore, firebaseApp, $firebaseObject, $firebaseArray, $route) {
    
    var data = eventService.get();
    var db = firebaseApp.database();

    // console.log("my data is:", data);
    var eventId = $route.current.params.eventId;
    var taskId = $route.current.params.taskId;

    // var teamLogPromise = null;
    var tratId = taskId;
    var userTeamId = null;
    var userPublicId = data.participant.$id;
    // console.log("userpublicid iss:", data.participant);
    var teamFormationRefKey = data.task.teamFormationRef;
    var eventTeamRef = db.ref(`classMentors/eventTeams/${eventId}/${teamFormationRefKey}`);

    return $q.all({
        currentUser: spfAuthData.user(),
        correctAnswers: clmDataStore.events.getTaskAnswers(data.eventId, data.task.taskFrom)
            .then(function (data) {
                return data.$value
            }),
        progress: clmDataStore.events.getProgress(data.eventId).then(function (data) {
            return data
        }),
        teamRefId: teamFormationRefKey,
        questions: angular.fromJson(data.task.mcqQuestions),
        tratId: tratId,
        teamAndteamId: $firebaseArray(eventTeamRef).$loaded()
            .then(function (teams) {
                // console.log("teams in resolve:", spfAuthData.user());
                // Sanity check that teams are retrieved
                for (var i = 0; i < teams.length; i++) {
                    var team = teams[i];
                    if (team[userPublicId]) {
                        return team.$id;
                    }
                }
            }).then(function (teamId) {
                var teamRef = db.ref(`classMentors/eventTeams/${eventId}/${teamFormationRefKey}/${teamId}`);

                return {
                    team: $firebaseArray(teamRef).$loaded(function (team) {
                            var outputTeam = [];
                            for (var i = 0; i < team.length; i++) {
                                var idAtIdx = team[i].$id;
                                if (idAtIdx != 'currentSize' && idAtIdx != 'maxSize') {
                                    outputTeam.push(team[i]);
                                }
                            }
                            return outputTeam;
                        }).then(function(result){
                            return result;
                        }),
                    teamId: teamId
                }
            }),
        eventId: eventId,
        teamFormId: teamFormationRefKey
    });
}
startTRATInitialData.$inject = ['$q', 'spfAuthData', 'eventService', 'clmDataStore', 'firebaseApp', '$firebaseObject', '$firebaseArray', '$route'];

function startTRATController($q, initialData, clmDataStore, $location, urlFor,
                             firebaseApp, $firebaseObject, $firebaseArray, spfAlert) {

    // Sanity check
    console.log('Initial data contains: ', initialData);
    var self = this;
    var db = firebaseApp.database();
    self.index = 0;

    // Inititalize Question and Question's option(s)
    self.questions = initialData.questions;
    self.question = self.questions[self.index];
    self.options = self.question.options;
    var userPublicId = initialData.currentUser.publicId;
    // console.log(initialData.currentUser);
    self.eventId = initialData.eventId;
    var teamAndteamId = initialData.teamAndteamId;
    // console.log(initialData.teamAndteamId);
    self.teamId = teamAndteamId.teamId;
    self.team = null;
    teamAndteamId.team.then(function(result){
        self.team = result;
    });

    self.tratId = initialData.tratId;
    self.teamFormId = initialData.teamFormId;
    var userAnswers = [];
    self.multiAns = [];
    self.correctAnswers = angular.fromJson(initialData.correctAnswers);
    var teamLogRef = db.ref(`classMentors/eventTeamsLog/${self.teamFormId}/${self.teamId}`);
    self.multipleAns = (function () {
        var multipleAnsArray = [];
        for (var i = 0; i < self.correctAnswers.length; i++) {
            var ans = self.correctAnswers[i];
            if (ans.length > 1) {
                multipleAnsArray.push(true);
            } else {
                multipleAnsArray.push(false);
            }
        }
        // console.log('Sanity check: ', multipleAnsArray);
        return multipleAnsArray;
    })();
    // console.log(self.multipleAns);

    var teamAnsRef = db.ref(`classMentors/eventSolutions/${self.eventId}/${self.teamId}/${self.tratId}`);
    self.noOfTries = 3;
    self.totalScore = 0;
    //Init team log
    self.teamLog = null;

    function refreshLog() {
        $firebaseArray(teamLogRef.orderByKey()).$loaded(function (data) {
            self.teamLog = data;
        });
    }
    refreshLog();

    // test this later
    var updateLog = function (msg) {
        teamLogRef.push().set(msg).then(function () {
            // console.log('Msg has been pushed');
            refreshLog();
        });
    };

    self.submitTrat = function () {
        $location.path(urlFor('oneEvent'));
    };

    function writeScoreAndProgress(team, score, solution){
        // console.log(team);
        var teamMembers = [];
        for(var key in team){
            var id = team[key].$id;
            if(id != 'teamLeader'){
                teamMembers.push(id);
            }
        }
        // console.log('Members ', teamMembers);
        var promiseArray = []
        for(var key in teamMembers){
            var publicId = team[key].$id;
            // console.log('PublicID being processed now ',publicId);
            var eventSolRef = db.ref(`classMentors/eventSolutions/${self.eventId}/${publicId}/${self.tratId}`);
            var eventSolRefPromise = eventSolRef.set({
                'answer': angular.toJson(solution),
                'completed': TIMESTAMP
            });
            var eventScoreRef = db.ref(`classMentors/eventScores/${self.eventId}/${publicId}/${self.tratId}`);
            var eventScoreRefPromise = eventScoreRef.set(score);
            promiseArray.push(eventSolRefPromise);
            promiseArray.push(eventScoreRefPromise);
        }
        return promiseArray;
        // Write progress for all members as completed.
    }

    function buildMessage(status, message, style){
        return {
            status: status,
            text: message,
            style: style,
            timestamp: TIMESTAMP
        };
    }

    var attempts = [];
    self.nextQuestion = function(){
        // console.log(userAnswers);
        // console.log('Curr index ', self.index);
        // console.log(self.questions.length);
        // For Single answer MCQ
        if (self.selected != null) {
            var tempArray = [];
            tempArray.push(parseInt(self.selected));
            var result = markQuestions(tempArray, self.index);
            if(result == 0){
                self.noOfTries -= 1;
                updateLog(buildMessage("Incorrect", 'Remaining attempts: ' + self.noOfTries, '#A9241C'));
                console.log(self.team);
                // Store reccord
                attempts.push(tempArray);
                // console.log('Current attempts: ', attempts);
                if(self.noOfTries == 0){
                    updateLog(buildMessage("Incorrect", 'No attempts remaining', '#A9241C'));
                    self.totalScore += 0;
                    if(self.index == self.questions.length - 1){
                        userAnswers.push(attempts);
                        attempts = [];
                        $q.all(writeScoreAndProgress(self.team, self.totalScore, userAnswers)).then(function(){
                            spfAlert.success('TRAT Submitted');
                            $location.path(urlFor('oneEvent', {eventId: self.eventId}));
                        })
                    }else{
                        self.noOfTries = 3;
                        userAnswers.push(attempts);
                        attempts = [];
                        updateLog(buildMessage("New Question ", 'Remaining attempts: ' + self.noOfTries, 'black'));
                        self.question = loadQuestion(self.index += 1, self.questions);
                        self.options = loadOptions(self.question);
                    }
                }
                for(var member in self.team) {
                    let publicId = self.team[member].$id;
                    if(publicId.indexOf("teamLeader") < 0) {
                        clmDataStore.logging.inputLog(
                            {
                                publicId: publicId,
                                timestamp: TIMESTAMP,
                                action: "wrongTeamSubmission",
                                taskId: self.tratId,
                                eventId: self.eventId
                            }
                        )
                    }
                }
            }else{
                // Add score if correct
                self.totalScore += addScore(self.noOfTries, 1);
                updateLog(buildMessage("Correct!", 'Remaining attempts: ' + self.noOfTries, '#259b24'));
                attempts.push(tempArray);
                if(self.index == self.questions.length - 1){
                        userAnswers.push(attempts);
                        attempts = [];
                        $q.all(writeScoreAndProgress(self.team, self.totalScore, userAnswers)).then(function(){
                            spfAlert.success('TRAT Submitted');
                            $location.path(urlFor('oneEvent', {eventId: self.eventId}));
                        })
                }else{
                    self.noOfTries = 3;
                    userAnswers.push(attempts);
                    attempts = [];
                    updateLog(buildMessage("New Question ", 'Remaining attempts: ' + self.noOfTries, 'black'));
                    self.question = loadQuestion(self.index += 1, self.questions);
                    self.options = loadOptions(self.question);
                }
                for(var member in self.team) {
                    let publicId = self.team[member].$id;
                    if(publicId.indexOf("teamLeader") < 0) {
                        clmDataStore.logging.inputLog(
                            {
                                publicId: publicId,
                                timestamp: TIMESTAMP,
                                action: "correctTeamSubmission",
                                taskId: self.tratId,
                                eventId: self.eventId
                            }
                        )
                    }
                }
            }
            // console.log(self.totalScore);
            // teamAns(tempArray);
            self.selected = null;
        } else {// For multi answer MCQ
            var result = markQuestions(self.multiAns,self.index);
            if(result == 0){
                self.noOfTries -= 1;
                // Store reccord
                attempts.push(self.multiAns);
                console.log('Current attempts: ', attempts);
                updateLog(buildMessage("Incorrect", 'Remaining attempts: ' + self.noOfTries, '#A9241C'));
                if(self.noOfTries == 0){
                    self.totalScore += 0;
                    if(self.index == self.questions.length - 1){
                        userAnswers.push(attempts);
                        attempts = [];
                        writeScoreAndProgress(self.team, self.totalScore, userAnswers);
                        spfAlert.success('TRAT Submitted');
                        $location.path(urlFor('oneEvent', {eventId: self.eventId}));
                    }else{
                        self.noOfTries = 3;
                        userAnswers.push(attempts);
                        attempts = [];
                        updateLog(buildMessage("New Question ", 'Remaining attempts: ' + self.noOfTries, 'black'));
                        self.question = loadQuestion(self.index += 1, self.questions);
                        self.options = loadOptions(self.question);
                    }
                }
                // clear options.
                for(var key in self.options){
                    delete self.options[key].checked;
                }
                self.multiAns = [];
                for(var member in self.team) {
                    let publicId = self.team[member].$id;
                    if(publicId.indexOf("teamLeader") < 0) {
                        clmDataStore.logging.inputLog(
                            {
                                publicId: publicId,
                                timestamp: TIMESTAMP,
                                action: "wrongTeamSubmission",
                                taskId: self.tratId,
                                eventId: self.eventId
                            }
                        )
                    }
                }
            }else{
                // Add score
                // console.log('Single ans mcq is correct!');
                // console.log('index is : ',self.index);
                attempts.push(self.multiAns);
                self.totalScore += addScore(self.noOfTries, 1);
                updateLog(buildMessage("Correct!", 'Remaining attempts: ' + self.noOfTries, '#259b24'));
                if(self.index == self.questions.length - 1){
                    userAnswers.push(attempts);
                    attempts = [];
                    writeScoreAndProgress(self.team, self.totalScore, userAnswers);
                    spfAlert.success('TRAT Submitted');
                    $location.path(urlFor('oneEvent', {eventId: self.eventId}));
                }else{
                    // console.log('Questions : ', self.questions);
                    // console.log('Load next question!');
                    self.noOfTries = 3;
                    userAnswers.push(attempts);
                    attempts = [];
                    updateLog(buildMessage("New Question ", 'Remaining attempts: ' + self.noOfTries, 'black'));
                    self.question = loadQuestion(self.index += 1, self.questions);
                    self.options = loadOptions(self.question);
                }
                for(var member in self.team) {
                    let publicId = self.team[member].$id;
                    if(publicId.indexOf("teamLeader") < 0) {
                        clmDataStore.logging.inputLog(
                            {
                                publicId: publicId,
                                timestamp: TIMESTAMP,
                                action: "correctTeamSubmission",
                                taskId: self.tratId,
                                eventId: self.eventId
                            }
                        )
                    }
                }
            }
            // console.log(self.totalScore);
            self.multiAns = [];
        }
    };

    function loadQuestion(index, questions){
        if(index < questions.length){
            return questions[index];
        }else{
            return false
        }

    }
    function loadOptions(question){
        if(question){
            return question.options;
        }else{
            return false;
        }
    }

    function addScore(attempts, score){
        var s = (score * (attempts / 3));
        console.log(s);
        return Math.round(s * 100) / 100;
    }
    function arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length)
            return 0;

        if (arr1.length > 1 && arr2.length > 1 && arr1.length == arr2.length) {
            for (var i = arr1.length; i--;) {
                if (arr2.indexOf(arr1[i]) < 0)
                    return 0
            }
        } else {
            for (var i = arr1.length; i--;) {
                if (arr1[i] !== arr2[i])
                    return 0;
            }
        }
        return 1;
    }

    self.toggle = function (list, item) {
        console.log(list);
        var idx = list.indexOf(item);
        if (idx > -1) {
            list.splice(idx, 1);
        } else {
            list.push(item);
        }
        var selected = [];
        for (var i = 0; i < list.length; i++) {
            var text = self.options[list[i]].text;
            selected.push(text);
        }
    }

    function markQuestions(submittedAnswers, index) {
        // console.log('Correct Answers...', self.correctAnswers);
        // console.log('Submitted Answers...', submittedAnswers);
        var score = 0;
        // for (var i = 0; i < self.correctAnswers.length; i++) {
        score += arraysEqual(submittedAnswers, self.correctAnswers[index]);
        // console.log(score);
        // }
        return score;
    }

}

startTRATController.$inject = [
    '$q',
    'initialData',
    'clmDataStore',
    '$location',
    'urlFor',
    'firebaseApp',
    '$firebaseObject',
    '$firebaseArray',
    'spfAlert'
]


// Export
export {
    teamActivityCreateTmpl,
    createTeamActivityInitialData,
    createTeamActivityController,
    teamIRATTmpl,
    startTRATController,
    teamTRATTmpl,
    teamFormationTmpl,
    startTRATInitialData

};
// startIRATController,
// export function teamActivityCreateView(){
//   return teamActivityCreateTmpl;
// }
