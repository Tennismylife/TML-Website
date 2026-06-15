select winner_name, winner_age, tourney_name, year
from "Match"
where round = 'F'
  and score <> 'To play'
  and team_event = false
  and ((winner_name = 'Novak Djokovic' and tourney_name = 'US Open' and year = 2023)
    or (winner_name = 'Rafael Nadal' and tourney_name = 'Roland Garros' and year = 2022));
