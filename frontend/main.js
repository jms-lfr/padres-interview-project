var app = angular.module('main', []);


app.service("DataService", function($http) {
	let players = {};

	this.getPlayers = function(team) {
		if (!players[team]){
			return $http.get("http://localhost:5000/players?team=" + team)
				.then(function (response) {
					players[team] = response.data['players'].sort((a, b) => a.name_last.localeCompare(b.name_last));
					return players[team];;
				})
				.catch(function (err) { console.log(err); console.warn("Make sure you've started the backend!")});
		}else{
			//console.log("Cached " + team);
			return new Promise(function(resolve, reject) { return resolve(players[team]) });
		}
	};

	this.getTeams = function() {
		return $http.get("http://localhost:5000/teams")
			.then(function (response) { return response.data })
			.catch(function (err) { console.log(err); return [""] });
	};
});

app.controller("playerList", function($scope, $http, DataService, $timeout) {

	this.getPlayers = function() {
		DataService.getPlayers($scope.selectedTeam)
			.then( function(data) { 
				$timeout(function() { $scope.players = data; } ); // timeout to make sure angular updates for cached result 
			});
	}

	//this.getTeams = function() {
	DataService.getTeams()
		.then( function(data) { 
			$scope.teams = data['teams']; 
		});
	//};

	let currPlayer = undefined;
	this.setCurrPlayer = function(player) {
		currPlayer = player;
	};

	$scope.selectedStartDate = new Date(2024, 6, 1); // July 1st
	$scope.selectedEndDate = new Date(2024, 7, 1); // August 1st
	let startDate = "";
	let endDate = "";
	this.setStartDate = function(date) {
		startDate = date.toISOString().substring(0, 10);
	};
	this.setStartDate($scope.selectedStartDate);

	this.setEndDate = function(date) {
		endDate = date.toISOString().substring(0, 10);
	};
	this.setEndDate($scope.selectedEndDate);

});

