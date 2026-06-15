select winner_name, winner_age, tourney_name, year
from "Match"
where round='F' and score <> 'To play' and team_event=false
  and (
    (winner_name='Boris Becker' and year=1985 and tourney_name='Queen''s Club') or
    (winner_name='Boris Becker' and year=1985 and tourney_name='Wimbledon') or
    (winner_name='Bjorn Borg' and year=1974 and tourney_name='Auckland') or
    (winner_name='Pat Cash' and year=1982 and tourney_name='Melbourne') or
    (winner_name='Rafael Nadal' and year=2005 and tourney_name='Roland Garros') or
    (winner_name='Pete Sampras' and year=1990 and tourney_name='US Open')
  )
order by year, winner_name, winner_age;
