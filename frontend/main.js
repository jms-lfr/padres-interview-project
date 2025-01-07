var app = angular.module('main', []);

app.controller("temp", function($scope, $http) {
	$scope.name = "Jeff Mathis";
	$scope.team = "ARI";
});

app.service("DataService", function($http) {
	this.getPlayers = function() {
		return $http.get("http://localhost:5000/players?team=SDP")
		.then(function (response) { return response.data })
		.catch(function (err) { console.log(err); console.log("Make sure you've started the backend!")});
	};
});

app.controller("playerList", function($scope, DataService) {
	DataService.getPlayers().then( function(data) {
		$scope.players = data;
	});
	console.log($scope.players);
});

