select winner_name, winner_age, tourney_name, year
from "Match"
where round='F' and score <> 'To play' and team_event=false
  and winner_name='Pat Cash'
order by winner_age desc;
