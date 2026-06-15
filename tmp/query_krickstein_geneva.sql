select winner_name, winner_age, tourney_name, year
from "Match"
where round = 'F'
  and score <> 'To play'
  and team_event = false
  and winner_name = 'Aaron Krickstein'
  and tourney_name = 'Geneva'
  and year = 1984;
