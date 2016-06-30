
/*

(function(){
    var mcq = angular.module('mcq',['firebase']);

    mcq.config(function () {
        var config = {
    		apiKey: "AIzaSyBo8et4Oik87yYqR8ch2AcS-6_yS_00kEM",
    		authDomain: "testproject-61cbe.firebaseapp.com",
    		databaseURL: "https://testproject-61cbe.firebaseio.com",
    		storageBucket: "testproject-61cbe.appspot.com",
        };
        firebase.initializeApp(config);
    });

    mcq.controller('FirebaseController', function($scope, $firebaseObject){
        var ref = firebase.database().ref().child('messages');
        $scope.data = $firebaseObject(ref);
    });



})();
*/


var app = angular.module("MyApp", ["firebase", "ngMaterial"]);
app.controller("SampleCtrl", function($scope, $firebaseArray) {
  var newFireBase = new Firebase("https://project-1180774075744369732.firebaseio.com");
  var ref = newFireBase.ref().child('events').child('gidkytest').child('challenges').child('jeopardytest').child('questions');
  // create a synchronized array
  // click on `index.html` above to see it used in the DOM!
  $scope.messages = $firebaseArray(ref);
  
});
var questionGenerator = function(){

  
}

