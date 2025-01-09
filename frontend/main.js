var app = angular.module('main', []);

app.service("DataService", function($http) {
	let players = {};

	this.getPlayers = function(team) {
		if (!players[team]){
			return $http.get("http://localhost:5000/players?team=" + team)
				.then( function (response) {
					players[team] = response.data['players'].sort((a, b) => a.name_last.localeCompare(b.name_last));
					return players[team];
				})
				.catch(function (err) { console.log(err); console.warn("Make sure you've started the backend");});
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

	this.getPlaysPlayer = function (playerid, start_date, end_date) {
		return $http.get("http://localhost:5000/plays?" +
						 "fields=game_date,event_type" +
						 "&end_pa=t" +
						 "&position=h" + // makes it impossible to see pitchers' results against hitters
										 // but won't double count a position player pitching
						 `&player=${playerid}` +
						 `&start_date=${start_date}&end_date=${end_date}`)
			.then( function (response){
				return response.data;
			})
			.catch( function(err) { console.log(err); console.warn("Make sure you've started the backend");});
	}
});

app.controller("playerList", function($scope, $http, DataService, $timeout) {
	let currPlayer = undefined;
	$scope.selectedStartDate = new Date(2024, 6, 1); // July 1st
	$scope.selectedEndDate = new Date(2024, 7, 1); // August 1st
	let startDate = "";
	let endDate = "";

	this.getPlayers = function() {
		DataService.getPlayers($scope.selectedTeam)
			.then( function(data) { 
				$timeout(function() { $scope.players = data; } ); // timeout to make sure angular updates for cached result 
			});
	};

	//this.getTeams = function() {
	DataService.getTeams()
		.then( function(data) { 
			$scope.teams = data["teams"];
		});
	//};
	
	this.getWeight = function(event_type){
		// 2024 weights from https://www.fangraphs.com/guts.aspx?type=cn
		switch (String(event_type)){ // switch compares with ===
			case "single":
				return 0.882;
			case "double":
				return 1.254;
			case "home_run":
				return 2.050;
			case "walk":
				return 0.689;
			case "triple":
				return 1.590;
			case "hit_by_pitch":
				return 0.720;
			case "sac_fly":
			case "field_out":
			case "strikeout":
			case "double_play":
			case "force_out":
			case "grounded_into_double_play":
			case "fielders_choice":
			case "fielders_choice_out":
			case "field_error":
			case "catcher_interf":
			case "sac_bunt":
				return 0;
			default:
				console.warn("Unknown event type, no weight found");
				return 0;
		}
	};
	
	this.getPlaysPlayer = function() {
		if (currPlayer){
			DataService.getPlaysPlayer(currPlayer.id, startDate, endDate)
				.then( (data) => { 
					// IBB not incldued in wOBA
					const plays = data["plays"].filter( (play) => play["event_type"] != "intent_walk");
					//console.log(plays);
					d3.select("#graph").selectAll("*").remove(); // clear
					if(plays.length == 0){
						d3.select("#graph")
							.append("text")
							//.attr("x", 200)
							//.attr("y", 200)
							.attr("id", "no-data")
							.text("No data available for selected range/player");
						return;
						
					}

					let numerator = 0;
					// let first_date = plays[0]["game_date"];
					// let last_date = plays[plays.length-1]["game_date"];
					let denominator = $scope.rollingPAs;
					if(plays.length < denominator){
						denominator = plays.length;
					}

					const rolling_wOBA = [];
					const play_weights = []; // don't want to re-get weights
					for(let i = 0; i < denominator; ++i){
						const weight = this.getWeight(plays[i]["event_type"]);
						play_weights.push(weight);
						numerator += weight;
					}
					rolling_wOBA.push([numerator / denominator, denominator]);

					for(let i = denominator; i < plays.length; ++i){
						numerator -= play_weights[i - denominator];
						const weight = this.getWeight(plays[i]["event_type"]);
						play_weights.push(weight);
						numerator += weight;
						rolling_wOBA.push([numerator / denominator, i]);
					}

					//console.log(rolling_wOBA);

					const parsed = rolling_wOBA.map(([woba, pa_num]) => ({
						PA_num: pa_num,
						wOBA: woba,
					}));
					
					let wobaFormat = function(f){
						return f.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits:3}).substring(1);
					};


					const plot_width = document.getElementById("graph").offsetWidth;
					const plot_height = document.getElementById("graph").offsetHeight;
					const plot = Plot.plot({
						marginTop: 20,
						marginBottom: 30,
						marginLeft: 30,
						marginRight: 20,
						width: plot_width, 
						height: plot_height,
						y: {grid: true, label: "wOBA", tickFormat: wobaFormat},
						marks: [
							Plot.lineY(parsed, {x: "PA_num", y: "wOBA", stroke: "#2F241D"})
						]
					});
					const div = document.querySelector("#graph");
					div.append(plot);	
				});
		}
	};

	this.setCurrPlayer = function(player) {
		currPlayer = player;
	};

	this.setStartDate = function(date) {
		startDate = date.toISOString().substring(0, 10);
	};
	this.setStartDate($scope.selectedStartDate);

	this.setEndDate = function(date) {
		endDate = date.toISOString().substring(0, 10);
	};
	this.setEndDate($scope.selectedEndDate);

	this.validateRollingPAs = function(){
		if(typeof $scope.rollingPAs == "undefined" || $scope.rollingPAs < 1){
			$scope.rollingPAs = 1;
		}
	};

});

