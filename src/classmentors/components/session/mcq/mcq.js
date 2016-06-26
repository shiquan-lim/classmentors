/**
 * Created by AMOS on 18/6/16.
 */
(function(){
    var mcq = angular.module('mcq',['firebase']);

    mcq.config(function () {
        var config = {
            apiKey: "AIzaSyCDxuAaiTyPmosBL6QLgR94yoRswMyZcIg",
            authDomain: "project-1180774075744369732.firebaseapp.com",
            databaseURL: "https://project-1180774075744369732.firebaseio.com",
            storageBucket: "project-1180774075744369732.appspot.com"
        };
        firebase.initializeApp(config);
    });

    // mcq.controller('FirebaseController', function($scope, $firebaseObject){
    //     var ref = firebase.database().ref();
    //     $scope.data = $firebaseObject(ref);
    // });

    //Pulls questions from firebase

    mcq.factory('retrieveMCQItems', function($firebaseObject, $firebaseArray){
        var ref = firebase.database().ref('events/0/challenges/MCQ/0');

        return{
            getQuestions: function(){
                var list = $firebaseArray(ref.child('questions'));
                return list;
            },
            getTest: function(){
                var obj = $firebaseObject(ref);
                return obj
            }
        }
    });


    mcq.controller('MCQController', function($scope, retrieveMCQItems){
        // Tentatively hardcoding URL, currently firebase does not support content search
        // Propose new DB design where questions can be selected by type
        // Using new database structure:
        // On retrieving data from database.
        $scope.questions = retrieveMCQItems.getQuestions();
        $scope.applyClass = function(type){
            if(type == 'multiple'){
                console.log(type, 'YOOHOO?');
                return 'checkbox';
            }else{
                console.log('TEST');
                return 'radio';
            }
        }
        // $scope.data = retrieveMCQItems.getTest();
    });
})();