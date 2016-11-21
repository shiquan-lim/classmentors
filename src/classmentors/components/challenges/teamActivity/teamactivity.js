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

function createTeamActivityController($q, initialData, clmDataStore, $location, urlFor, eventService, $mdDialog, spfAlert, firebaseApp, $firebaseObject, $firebaseArray, $log, spfNavBarService) {
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
    self.collabChallengeType = null;
    self.coopChallengeType = null;

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


    self.submit = function () {

        self.task.activityType = self.activityType;
        self.task.newExistingTeams = self.newExistingTeams;
        self.task.teamFormationMethod = self.teamFormationMethod;
        self.task.teamFormationParameter = self.teamFormationParameter;
        self.event.teams = formTeams(self.teamFormationMethod, self.teamFormationParameter, self.participants.length);

        if (self.activityType == 'gameShow') {
            self.task.startIRAT = true;
            eventService.set({
                taskType: self.taskType,
                event: self.event,
                task: self.task,
                isOpen: initialData.data.isOpen
            });
            $location.path(urlFor('viewMcq'));
        } else if (self.activityType == 'collabSubmission') {
            self.task.collabChallengeType = self.collabChallengeType;
            createColSubActivity(self.event, self.task, initialData.data.isOpen)

        } else if (self.activityType == 'mentoring') {
            self.task.mentorChallengeType = self.mentorChallengeType;
            createMentoringActivity(self.event, self.task, initialData.data.isOpen)
            console.log('Create mentoring activity');

        } else if (self.task.activityType == 'indexCards') {
            var db = firebaseApp.database();
            var eventTaskRef = db.ref(`classMentors/eventTasks/${self.event.$id}`);
            var textResponsePromise = addTask(eventTaskRef, addTextResponse(self.task), initialData.data.isOpen);
            // console.log(textResponsePromise);
            textResponsePromise.then(function (ref) {
                return addTask(eventTaskRef, buildTeamFormationTask(ref.key, self.task), false);
            }).then(function (teamFormationPromise) {
                var eventTeamsRef = db.ref(`classMentors/eventTeams/${self.event.$id}/${teamFormationPromise.key}`);
                return $q.all({
                    teamVotingTask: addTask(eventTaskRef, buildTeamVotingTask(teamFormationPromise.key, self.task), false),
                    initTeams: self.event.teams.map(function (team) {
                        return eventTeamsRef.push(team)
                    })
                });
            }).then(function (voteTaskPromise) {
                return $q.all([addTask(eventTaskRef, buildReflectionQuestion(voteTaskPromise.teamVotingTask.key, self.task), false)]);

            }).then(function () {
                spfAlert.success('Challenge created.');
                $location.path(urlFor('editEvent', {eventId: self.event.$id}));
            });
        }
        else if (self.task.activityType == 'cooperative') {
            self.task.coopChallengeType = self.coopChallengeType;
            createCoopSubActivity(self.event, self.task, initialData.data.isOpen)
        }
    };

    function createMentoringActivity(event, task, isOpen) {
        // console.log('Task:', task);
        var timestamp = Date.now();

        // Get firebase database object.
        var db = firebaseApp.database();

        self.creatingTask = true;

        // Get firebase task reference.
        var taskRef = db.ref(`classMentors/eventTasks/${event.$id}`);

        var mentoringForTaskRef = db.ref(`classMentors/eventTasks/${event.$id}`).push();
        var mentoringAssignmentTaskRef = db.ref(`classMentors/eventTasks/${event.$id}`).push();

        var mentorTaskSettableRef = db.ref(`classMentors/eventTasks/${event.$id}/${mentoringForTaskRef.key}`);
        var mentorAssignmentSettableRef = db.ref(`classMentors/eventTasks/${event.$id}/${mentoringAssignmentTaskRef.key}`);

        var mentorTask = {
            title: task.title,
            description: task.description,
            openedAt: {'.sv': 'timestamp'},
            showProgress: task.showProgress,
            archived: false,
            type: task.mentorChallengeType + 'Mentoring',
            mentorAssignmentRef: mentoringAssignmentTaskRef.key,
            mentorAssignmentMethod: self.mentorAssignmentMethod
        };

        // Define 'teamFormationTask'.
        var mentorAssignmentTask = {
            title: task.title,
            description: "Locate your mentor mentee pairing and learn together!",
            taskFrom: mentoringForTaskRef.key,
            openedAt: {'.sv': 'timestamp'},
            showProgress: task.showProgress,
            archived: false,
            type: "mentorAssignment",
            mentorAssignmentMethod: self.mentorAssignmentMethod
        };

        if (task.linkPattern) {
            mentorTask.linkPattern = task.linkPattern;
        } else if (task.lang) {
            mentorTask.lang = task.lang;
            mentorTask.textResponse = task.textResponse;
        } else {
            mentorTask.textResponse = task.textResponse;
        }

        console.log('Mentor Task: ', mentorTask);
        console.log('Mentor Assignment: ', mentorAssignmentTask);

        mentorTaskSettableRef.set(mentorTask).then(function () {
            console.log('Mentor task set!');
            mentorAssignmentSettableRef.set(mentorAssignmentTask).then(function () {
                console.log('Mentor Assignment set!');
            }).then(function () {
                spfAlert.success('Challenge created.');
                $location.path(urlFor('editEvent', {eventId: self.event.$id}));
            });
        });
    }

    function buildReflectionQuestion(taskFrom, task) {
        return {
            taskFrom: taskFrom,
            title: task.title,
            description: "Tell us about your question",
            showProgress: task.showProgress,
            archived: false,
            question: angular.toJson({
                question: "Select the appropriate response below for your question",
                options: [
                    "Instructor answered it",
                    "Teaching Assistants answered it",
                    "Figured it out on my own or answered by peers",
                    "Post this question to Question Queue to seek for an answer"
                ]
            }),
            type: "reflectionQuestion"
        }

    }

    function addTask(ref, task, isOpen) {
        if (isOpen) {
            task.openedAt = {'.sv': 'timestamp'};
            task.closedAt = null;
        } else {
            task.closedAt = {'.sv': 'timestamp'};
            task.openedAt = null;
        }
        var promise = ref.push(task);
        $log.info(`Task: ${angular.toJson(task)} is stored at ${ref}, ${promise.key}`)
        return promise;
    }

    function buildTeamVotingTask(taskFrom, task) {
        return {
            taskFrom: taskFrom,
            title: task.title,
            description: "As a team, select your favorite question",
            formationPattern: true,
            closedAt: {'.sv': 'timestamp'},
            showProgress: task.showProgress,
            archived: false,
            type: "voteQuestions"
        }
    }

    function buildTeamFormationTask(taskFrom, task) {
        return {
            taskFrom: taskFrom,
            title: task.title,
            description: "Click Below To Join Team",
            formationPattern: true,
            closedAt: {'.sv': 'timestamp'},
            showProgress: task.showProgress,
            archived: false,
            type: "formTeam",
            teamFormationMethod: task.teamFormationMethod
        }
    }

    function addTextResponse(task) {
        task.textResponse = 'Placeholder';
        // task.priority = priority;
        return task;
    }

    function createCoopSubActivity(event, task, isOpen) {

        var timestamp = Date.now();
        // Get firebase database object.
        var db = firebaseApp.database();
        self.creatingTask = true;
        // Get firebase task reference.
        var taskRef = db.ref(`classMentors/eventTasks/${event.$id}`);

        var teamFormationTaskRef = db.ref(`classMentors/eventTasks/${event.$id}`).push();

        var eventTeamsRef = db.ref(`classMentors/eventTeams/${event.$id}/${teamFormationTaskRef.key}`);
        var settableRef = db.ref(`classMentors/eventTasks/${event.$id}/${teamFormationTaskRef.key}`);

        // Define 'teamFormationTask'.
        var teamFormationTask = {
            title: task.title,
            description: "Join a team to undertake the challenge together",
            taskFrom: teamFormationTaskRef.key,
            formationPattern: true,
            openedAt: {'.sv': 'timestamp'},
            showProgress: task.showProgress,
            archived: false,
            type: "formTeam",
            teamFormationMethod: task.teamFormationMethod,
            coopSubmission: true
        };

        var coopTask = {
            teamFormationRef: teamFormationTaskRef.key,
            title: task.title,
            description: task.description,
            closedAt: {'.sv': 'timestamp'},
            showProgress: task.showProgress,
            archived: false,
            type: task.coopChallengeType,
            teamFormationMethod: task.teamFormationMethod,
            coopSubmission: true
        };

        if (task.linkPattern) {
            coopTask.linkPattern = task.linkPattern;
        } else if (task.lang) {
            coopTask.lang = task.lang;
            coopTask.textResponse = task.textResponse;
        } else {
            coopTask.textResponse = task.textResponse;
        }

        settableRef.set(teamFormationTask).then(function () {

        }).catch(function (error) {
            console.log('FAILED AT SETTING TEAM FORMATION TASK')
        });

        taskRef.push(coopTask).then(function () {
            // Create 'teams' in 'eventTeams'.
            for (let i = 0; i < event.teams.length; i++) {
                let team = event.teams[i];
                eventTeamsRef.push(team);
            }
            spfAlert.success('Challenge created');
            $location.path(urlFor('editEvent', {eventId: event.$id}));
        }).catch(function (error) {
            console.log('FAILED AT SETTING COOPERATIVE TASK');
        });
    }


    function createColSubActivity(event, task, isOpen) {

        var timestamp = Date.now();
        // Get firebase database object.
        var db = firebaseApp.database();
        self.creatingTask = true;
        // Get firebase task reference.
        var taskRef = db.ref(`classMentors/eventTasks/${event.$id}`);

        var teamFormationTaskRef = db.ref(`classMentors/eventTasks/${event.$id}`).push();

        var eventTeamsRef = db.ref(`classMentors/eventTeams/${event.$id}/${teamFormationTaskRef.key}`);
        var settableRef = db.ref(`classMentors/eventTasks/${event.$id}/${teamFormationTaskRef.key}`);

        // Define 'teamFormationTask'.
        var teamFormationTask = {
            title: task.title,
            description: "Join a team to undertake the challenge together",
            taskFrom: teamFormationTaskRef.key,
            formationPattern: true,
            openedAt: {'.sv': 'timestamp'},
            showProgress: task.showProgress,
            archived: false,
            type: "formTeam",
            teamFormationMethod: task.teamFormationMethod
        };

        var collabTask = {
            teamFormationRef: teamFormationTaskRef.key,
            title: task.title,
            description: task.description,
            closedAt: {'.sv': 'timestamp'},
            showProgress: task.showProgress,
            archived: false,
            type: task.collabChallengeType,
            teamFormationMethod: task.teamFormationMethod
        };

        if (task.linkPattern) {
            collabTask.linkPattern = task.linkPattern;
        } else if (task.lang) {
            collabTask.lang = task.lang;
            collabTask.textResponse = task.textResponse;
        } else {
            collabTask.textResponse = task.textResponse;
        }

        settableRef.set(teamFormationTask).then(function () {

        }).catch(function (error) {
            console.log('FAILED AT SETTING TEAM FORMATION TASK')
        });

        taskRef.push(collabTask).then(function () {
            // Create 'teams' in 'eventTeams'.
            for (let i = 0; i < event.teams.length; i++) {
                let team = event.teams[i];
                eventTeamsRef.push(team);
            }
            spfAlert.success('Challenge created');
            $location.path(urlFor('editEvent', {eventId: event.$id}));
        }).catch(function (error) {
            console.log('FAILED AT SETTING COLLAB TASK');
        });
    }

    function formTeams(method, methodParameter, participants) {
        var teams = [];
        var teamStructure = [];
        // participants = participants + 1;// hmm, shouldn't need to add 1 here.
        if (method == 'noOfTeams') {
            //initialze teamStructure with team size of 0 each
            teamStructure = Array.apply(null, Array(methodParameter)).map(Number.prototype.valueOf, 0);
            console.log('teamStructure :', teamStructure);
            //add 1 to each team until there are no more participants left
            for (let i = 0; i < participants; i++) {
                teamStructure[i % methodParameter] += 1;
            }

        } else {//else by teamSize
            while (participants > methodParameter) {
                teamStructure.push(methodParameter);
                participants -= methodParameter;
            }
            // split up remaining participants
            for (let i = 0; i < participants; i++) {
                teamStructure[i % teamStructure.length] += 1;
            }
        }
        //Create 'teams'
        for (let i = 0; i < teamStructure.length; i++) {
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
        var team = {};
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

    };

    self.calculationResult = function () {

        return self.teamsMaximumStudents;
    };

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
    '$mdDialog',
    'spfAlert',
    'firebaseApp',
    '$firebaseObject',
    '$firebaseArray',
    '$log',
    'spfNavBarService'
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
        task: data.task,
        event: clmDataStore.events.get(eventId),
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
                    }).then(function (result) {
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
                             firebaseApp, $firebaseObject, $firebaseArray, spfAlert, $scope,spfNavBarService) {

    // Sanity check
    var mcqInvalid = true;
    $scope.$on("$routeChangeStart", function (event, next, current) {
        if (mcqInvalid) {
            if (!confirm("You have not complete your multiple choice questions. Are you sure you want to continue? All data will be lost!")) {
                event.preventDefault();
            }
        }


    });
    var self = this;
    var db = firebaseApp.database();
    self.index = 0;

    // Inititalize Question and Question's option(s)
    self.questions = initialData.questions;
    self.question = self.questions[self.index];
    self.options = self.question.options;
    var userPublicId = initialData.currentUser.publicId;
    self.eventId = initialData.eventId;
    var teamAndteamId = initialData.teamAndteamId;
    // console.log(initialData.teamAndteamId);
    self.teamId = teamAndteamId.teamId;
    self.team = null;
    teamAndteamId.team.then(function (result) {
        self.team = result;
    });

    spfNavBarService.update(
        initialData.task.title, [{
            title: 'Events',
            url: `#${urlFor('events')}`
        }, {
            title: initialData.event.title,// modify initialdata
            url: `#${urlFor('oneEvent', {eventId: initialData.eventId})}`
        }]
    );

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
    //print out question number and number of attempts first

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

    updateLog(buildMessage("Question " + (self.index + 1), 'Remaining attempts: ' + self.noOfTries, 'black'));

    self.submitTrat = function () {
        $location.path(urlFor('oneEvent'));
    };

    function writeScoreAndProgress(team, score, solution) {
        // console.log(team);
        var teamMembers = [];
        for (var key in team) {
            var id = team[key].$id;
            if (id != 'teamLeader') {
                teamMembers.push(id);
            }
        }
        // console.log('Members ', teamMembers);
        var promiseArray = []
        for (var key in teamMembers) {
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

    function buildMessage(status, message, style) {
        return {
            status: status,
            text: message,
            style: style,
            timestamp: TIMESTAMP
        };
    }

    var attempts = [];
    self.nextQuestion = function () {
        // For Single answer MCQ
        if (self.selected != null) {
            var tempArray = [];
            tempArray.push(parseInt(self.selected));
            var result = markQuestions(tempArray, self.index);
            if (result == 0) {
                self.noOfTries -= 1;
                updateLog(buildMessage("Question " + (self.index + 1) + ": " + "Incorrect", 'Remaining attempts: ' + self.noOfTries, '#A9241C'));
                // Store reccord
                attempts.push(tempArray);
                // console.log('Current attempts: ', attempts);
                if (self.noOfTries == 0) {
                    updateLog(buildMessage("Question " + (self.index + 1) + ": " + "Incorrect", 'No attempts remaining', '#A9241C'));
                    self.totalScore += 0;
                    if (self.index == self.questions.length - 1) {
                        userAnswers.push(attempts);
                        attempts = [];
                        $q.all(writeScoreAndProgress(self.team, self.totalScore, userAnswers)).then(function () {
                            spfAlert.success('TRAT Submitted');
                            $location.path(urlFor('oneEvent', {eventId: self.eventId}));
                        })
                    } else {
                        self.noOfTries = 3;
                        userAnswers.push(attempts);
                        attempts = [];
                        self.question = loadQuestion(self.index += 1, self.questions);
                        updateLog(buildMessage("Question " + (self.index + 1), 'Remaining attempts: ' + self.noOfTries, 'black'));
                        self.options = loadOptions(self.question);
                    }
                }
                clmDataStore.logging.inputLog(
                    {
                        publicId: userPublicId,
                        timestamp: TIMESTAMP,
                        action: "wrongTeamSubmission",
                        taskId: self.tratId,
                        eventId: self.eventId,
                        members: self.team.map(function (member) {
                            return member.$id;
                        })
                    }
                )
            } else {
                // Add score if correct
                self.totalScore += addScore(self.noOfTries, 1);
                updateLog(buildMessage("Question " + (self.index + 1) + ": " + "Correct!", 'Remaining attempts: ' + self.noOfTries, '#259b24'));
                attempts.push(tempArray);
                if (self.index == self.questions.length - 1) {
                    mcqInvalid = false;
                    userAnswers.push(attempts);
                    attempts = [];
                    $q.all(writeScoreAndProgress(self.team, self.totalScore, userAnswers)).then(function () {
                        spfAlert.success('TRAT Submitted');
                        $location.path(urlFor('oneEvent', {eventId: self.eventId}));
                    })
                } else {
                    mcqInvalid = true;
                    self.noOfTries = 3;
                    userAnswers.push(attempts);
                    attempts = [];
                    self.question = loadQuestion(self.index += 1, self.questions);
                    updateLog(buildMessage("Question " + (self.index + 1), 'Remaining attempts: ' + self.noOfTries, 'black'));
                    self.options = loadOptions(self.question);
                }
                clmDataStore.logging.inputLog(
                    {
                        publicId: userPublicId,
                        timestamp: TIMESTAMP,
                        action: "correctTeamSubmission",
                        taskId: self.tratId,
                        eventId: self.eventId,
                        members: self.team.map(function (member) {
                            return member.$id;
                        })
                    }
                )
            }
            // console.log(self.totalScore);
            // teamAns(tempArray);
            self.selected = null;
        } else {// For multi answer MCQ
            var result = markQuestions(self.multiAns, self.index);
            if (result == 0) {
                self.noOfTries -= 1;
                // Store reccord
                attempts.push(self.multiAns);
                updateLog(buildMessage("Question " + (self.index + 1) + ": " + "Incorrect", 'Remaining attempts: ' + self.noOfTries, '#A9241C'));
                if (self.noOfTries == 0) {
                    self.totalScore += 0;
                    if (self.index == self.questions.length - 1) {
                        mcqInvalid = false;
                        userAnswers.push(attempts);
                        attempts = [];
                        writeScoreAndProgress(self.team, self.totalScore, userAnswers);
                        spfAlert.success('TRAT Submitted');
                        $location.path(urlFor('oneEvent', {eventId: self.eventId}));
                    } else {
                        mcqInvalid = true;
                        self.noOfTries = 3;
                        userAnswers.push(attempts);
                        attempts = [];
                        self.question = loadQuestion(self.index += 1, self.questions);
                        updateLog(buildMessage("Question " + (self.index + 1), 'Remaining attempts: ' + self.noOfTries, 'black'));
                        self.options = loadOptions(self.question);
                    }
                }
                // clear options.
                for (var key in self.options) {
                    delete self.options[key].checked;
                }
                self.multiAns = [];
                clmDataStore.logging.inputLog(
                    {
                        publicId: userPublicId,
                        timestamp: TIMESTAMP,
                        action: "wrongTeamSubmission",
                        taskId: self.tratId,
                        eventId: self.eventId,
                        members: self.team.map(function (member) {
                            return member.$id;
                        })
                    }
                )
            } else {
                // Add score
                // console.log('Single ans mcq is correct!');
                // console.log('index is : ',self.index);
                attempts.push(self.multiAns);
                self.totalScore += addScore(self.noOfTries, 1);
                updateLog(buildMessage("Question " + (self.index + 1) + ": " + "Correct!", 'Remaining attempts: ' + self.noOfTries, '#259b24'));
                if (self.index == self.questions.length - 1) {
                    mcqInvalid = false;
                    userAnswers.push(attempts);
                    attempts = [];
                    writeScoreAndProgress(self.team, self.totalScore, userAnswers);
                    spfAlert.success('TRAT Submitted');
                    $location.path(urlFor('oneEvent', {eventId: self.eventId}));
                } else {
                    mcqInvalid = true;
                    // console.log('Questions : ', self.questions);
                    // console.log('Load next question!');
                    self.noOfTries = 3;
                    userAnswers.push(attempts);
                    attempts = [];
                    self.question = loadQuestion(self.index += 1, self.questions);
                    updateLog(buildMessage("Question " + (self.index + 1), 'Remaining attempts: ' + self.noOfTries, 'black'));
                    self.options = loadOptions(self.question);
                }
                clmDataStore.logging.inputLog(
                    {
                        publicId: userPublicId,
                        timestamp: TIMESTAMP,
                        action: "correctTeamSubmission",
                        taskId: self.tratId,
                        eventId: self.eventId,
                        members: self.team.map(function (member) {
                            return member.$id;
                        })
                    }
                )
            }
            // console.log(self.totalScore);
            self.multiAns = [];
        }
    };

    function loadQuestion(index, questions) {
        if (index < questions.length) {
            return questions[index];
        } else {
            return false
        }

    }

    function loadOptions(question) {
        if (question) {
            return question.options;
        } else {
            return false;
        }
    }

    function addScore(attempts, score) {
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
    'spfAlert',
    '$scope',
    'spfNavBarService'
];


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
