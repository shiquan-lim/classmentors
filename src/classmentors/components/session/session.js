// var config = {
//     apiKey: "AIzaSyCDxuAaiTyPmosBL6QLgR94yoRswMyZcIg",
//     authDomain: "project-1180774075744369732.firebaseapp.com",
//     databaseURL: "https://project-1180774075744369732.firebaseio.com",
//     storageBucket: "project-1180774075744369732.appspot.com",
// };

// firebase.initializeApp(config);

// var usersRef = new Firebase('https://samplechat.firebaseio-demo.com/users');

var students = [];
(function(){
	var app = angular.module('session-admin', []);

	app.controller('SessionController', function() {
		this.enrolment = students;
	});

	// var studentObject = firebase.database().ref('users/');
	// var studentObject = new Firebase('https://project-1180774075744369732.firebaseio.com/users');

	// studentObject.orderByChild("ranking").on("child_added", function(snapshot) {
	// 	students.push({
	// 		"name": snapshot.key(),
	// 		"ranking": snapshot.val().ranking
	// 	});
	// });

	// ref.orderByChild("height").on("child_added", function(snapshot) {
	//   console.log(snapshot.key() + " was " + snapshot.val().height + " meters tall");
	// });

	students = [
		{
			"name": "Shi Quan",
			"ranking": 6
		},
		{
			"name": "Gideon",
			"ranking": 5
		},
		{
			"name": "Amos",
			"ranking": 6
		},
		{
			"name": "Sheryl",
			"ranking": 6
		},
		{
			"name": "Kuan Yong",
			"ranking": 6
		},
	];

})();

function writeFromDB(object) {
	students.push(object);
}