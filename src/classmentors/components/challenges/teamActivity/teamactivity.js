import teamActivityCreateTmpl from './team-view-create.html!text';
import teamIRATTmpl from './teamactivity-view-irat-start.html!text';
import teamTRATTmpl from './teamactivity-view-trat-start.html!text';

function createTeamActivityInitialData($q, eventService, clmDataStore) {
    var data = eventService.get();
    console.log("team data is:", data);

    return clmDataStore.events.participants(data.event.$id).then (
        function (result){
            return{
                data: data,
                participants: result
            }
        }
    )
}
createTeamActivityInitialData.$inject = ['$q', 'eventService', 'clmDataStore'];

function createTeamActivityController($q, initialData, clmDataStore, $location, urlFor,eventService){
    var self = this;

    console.log("initialdata are",initialData);
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

    self.submit = function(){
        self.task.activityType = self.activityType;
        self.task.newExistingTeams = self.newExistingTeams;
        self.task.teamFormationMethod = self.teamFormationMethod;
        self.task.teamFormationParameter = self.teamFormationParameter;
        self.task.startIRAT = true;
        console.log(self.task);
        console.log(self.taskType);
        eventService.set({
            taskType: self.taskType,
            event: self.event,
            task: self.task,
            isOpen: initialData.data.isOpen
        })
        $location.path(urlFor('viewMcq'));
    }

    // if number of teams, "Each team will have a maximum enrollment of # students"; #= roundup (totalParticipants / # of teams)
    // if max number of student, "You will have # teams"; #= round up (totalParticipants / # stud per team)
    self.calculateTeamMaximumStudent = function (noTeamsOrStudents){
        // var noTeamsOrStudents = self.teamFormationInput;
        var totalParticipants = self.participants.length;

        console.log("number is ", noTeamsOrStudents);
        console.log("cal", Math.ceil(totalParticipants / noTeamsOrStudents) );
        self.teamsMaximumStudents = Math.ceil(totalParticipants / noTeamsOrStudents) ? Math.ceil(totalParticipants / noTeamsOrStudents):0 ;

    }

    self.calculationResult = function (){
        
        return self.teamsMaximumStudents;
    }

}
createTeamActivityController.$inject = [
    '$q', 
    'initialData', 
    'clmDataStore',
    '$location',
    'urlFor',
    'eventService'
    ];


function startIRATController($q, initialData, clmDataStore, $location, urlFor) {
    //todo: implement irat logic here


    this.submitIrat = function(){
        
        $location.path(urlFor('oneEvent'));
    };
}

startIRATController.$inject = [
    '$q',
    'initialData',
    'clmDataStore',
    '$location',
    'urlFor'
]

function startTRATController($q, initialData, clmDataStore, $location, urlFor){
    this.submitTrat = function(){
        $location.path(urlFor('oneEvent'));
    }
}

startTRATController.$inject = [
    '$q',
    'initialData',
    'clmDataStore',
    '$location',
    'urlFor'
]
export {
    teamActivityCreateTmpl,
    createTeamActivityInitialData,
    createTeamActivityController,
    startIRATController,
    teamIRATTmpl,
    startTRATController,
    teamTRATTmpl

};
// export function teamActivityCreateView(){
//   return teamActivityCreateTmpl;
// }
