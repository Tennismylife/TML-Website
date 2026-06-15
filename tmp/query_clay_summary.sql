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
  count(*) as total_titles,
  count(distinct winner_id) as unique_players,
  min(winner_age) as youngest_age,
  max(winner_age) as oldest_age,
  round(avg(winner_age)::numeric, 3) as avg_age
from winners;
