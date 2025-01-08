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
	$scope.getPlayers = function() {
		DataService.getPlayers($scope.selectedTeam)
			.then( function(data) { 
				$timeout(function() { $scope.players = data; } ); // timeout to make sure angular updates for cached result 
			});
	}

	$scope.getTeams = function() {
		DataService.getTeams()
			.then( function(data) { 
				$scope.teams = data['teams']; 
			});
	};

	$scope.logCurrPlayer = function(player) {
		console.log(player);
	}

});

