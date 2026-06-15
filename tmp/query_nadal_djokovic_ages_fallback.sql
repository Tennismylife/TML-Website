select winner_name, winner_age, tourney_name, year
from "Match"
where round = 'F'
  and score <> 'To play'
  and team_event = false
  and winner_name in ('Novak Djokovic', 'Rafael Nadal')
  and year in (2022, 2023)
order by year, winner_name;
