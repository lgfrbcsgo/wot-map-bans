WITH current_server AS (
  SELECT server_id, count(DISTINCT player_id) as count
  FROM played_map
  WHERE time > now() - INTERVAL '1 hour'
  GROUP BY server_id
)
SELECT server.name, server.region, current_server.count
FROM current_server
  INNER JOIN server ON current_server.server_id = server.id