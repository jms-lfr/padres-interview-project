# Padres Interview Project
For this project, I implemented a web application that creates a graph of a hitter's rolling wOBA, with selectable time frames and amount of plate appearances that should be rolled together. For the frontend, I used [AngularJS](https://angularjs.org/) and [Observable Plot](https://observablehq.com/plot/); for the backend, I used Python 3.10.1 and [Flask](https://palletsprojects.com/projects/flask/).  
I ran and tested this project on Windows 10 Build 19045 on a 1920x1080 monitor.

## Requirements

- `pip install -r requirements.txt`
- `node.js`
  - v16.13.1
  - `npm`/`npx` 8.3.0

## Running
### Backend:
1. Update variables in `.env`
2. `py setup.py`
a. Takes `CSV_FILENAME` from `.env` and creates a PostgreSQL database. Appends to `./modified_data.csv` and then removes it.
3.  `py data_api.py` to start the API

### Frontend:
1. Run frontend server via `cd frontend` followed by `npx http-server . -p 4200 --cors`
a. Was getting CORS errors on port 9999
2. Go to `localhost:4200` rather than `192.168.1.6:4200` or `127.0.0.1:4200` (otherwise, I was getting CORS errors since I make the `GET` requests to `localhost:5000`)
a. I tested on Firefox 134.0

## About
### General/Experience: 
I had a lot more fun working on the backend, I have a lot more experience with backend projects and no experience working with this frontend stack. It was a bit challenging at times to find answers to my questions since AngularJS is discontinued and less popular than Angular 2. Even without that, I definitely believe my inner thinking is more aligned with backend tasks compared to frontend ones.  
I took inspiration from BaseballSavant's rolling xwOBA chart seen on hitters' player pages. One problem I have with it is that I'm not able to go back and see rolling xwOBA over a particular time frame, so I made sure to implement that here.

### Backend/Database:
* `GET /teams`
	- Returns a dict of `{full team name: 3 letter team abbreviation, ...}`
* `GET /players`
	- Returns player objects with `id`, `name_first`, `name_last`
  - Optional parameters:
	  - `team`: 3 letter team abbreviation; only get players from specified team (see `utils.py` for valid abbreviations)
* `GET /plays`
	- Returns plays objects with specified fields in order of date ascending, then at bat number ascending, and finally pitch number (of at-bat) ascending
	- Required parameters:
		- `fields`: column names to get
		- `team`: 3 letter team abbreviation; get plays featuring `team` (see `utils.py` for valid abbreviations, not required if `player` is included)
		- `player`: player's bam_id; get plays featuring `player` (not required if `team` is included)
	- Optional parameters:
		- `position`: `p` for pitcher, `h`/`b` for hitter; only get plays where `team`/`player` is pitching/hitting
		- `start_date`: `YYYY-MM-DD` format; only get plays after and including this date
		- `end_date`: `YYYY-MM-DD` format, ignored if no `start_date`; only get plays before and including this date
		- `end_pa`: if it starts with `t`, only get plays that are the end of a plate appearance (e.g. ball 4); else does nothing
* Hitters are listed as batting on whichever side they were first seen batting from (i.e. no one is listed as a switch hitter, all pitchers are listed as batting 'U' (unknown))
* If a pitcher took a plate appearance, their throwing arm may be overwritten with 'U' (unknown)
  - I don't do anything with pitchers though
* Players are put on the team they are first seen playing on, no way to update that (e.g. trades, signings, retirements)
* I tried to emulate the MLB Stats API a bit 
  - returning `{"plays": [...]}`, where the array is empty when there's no data as opposed to only returning an empty array
  - `fields` parameter (though forced here rather than optional like MLB's)
* I used a connection pool instead of needing to repeatedly connect to the database (which would be slower)
  - thread-safe connection pool because I wasn't sure if Flask is multithreaded under the hood (and I found conflicting answers as to whether it is or not)

### Frontend:
* If you select a team too quickly when you first load the page, the list of players might not show up. If you change teams and then go back, they will appear.
* Rather than making a new `GET` request to the backend to get the selected team's players every time, each team's players get cached the first time they are selected.
* The date selectors default to contain the entirety of the plays data I was given.
* The generated graphs look a little bit funky because of the small sample sizes in only one month of data.
  - 15 PA isn't a great default ([BaseballSavant player pages](https://baseballsavant.mlb.com/savant-player/jackson-merrill-701538?stats=statcast-r-hitting-mlb) have options 50/100/250) but it works decently for the Padres hitter data included
* I definitely don't have an exhaustive list of all possible outcomes in the `getWeight(event_type)` function, but it is exhaustive for the dataset I was given. 
