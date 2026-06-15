with winners as (
  select distinct on (winner_id, event_id)
    winner_name,
    winner_ioc,
    winner_age,
    tourney_name,
    year,
    winner_id,
    event_id
  from "Match"
  where round = 'F'
    and team_event = false
    and winner_age is not null
    and score <> 'To play'
    and surface = 'Clay'
    and tourney_level is not null
  order by winner_id, event_id, winner_age desc
)
select
  row_number() over (order by winner_age desc) as rank,
  winner_name,
  winner_ioc,
  round(winner_age::numeric, 6) as age,
  tourney_name,
  year
from winners
order by winner_age desc
limit 12;
