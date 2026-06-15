select winner_name, winner_age, tourney_name, year
from "Match"
where round = 'F'
  and score <> 'To play'
  and team_event = false
  and ((winner_name = 'Rafael Nadal' and tourney_name = 'Rome Masters' and year = 2021)
    or (winner_name = 'Andre Agassi' and tourney_name = 'Cincinnati Masters' and year = 2004)
    or (winner_name = 'John Isner' and tourney_name = 'Miami Masters' and year = 2018));
