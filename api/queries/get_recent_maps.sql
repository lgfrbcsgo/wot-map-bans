WITH recent_maps AS (
  SELECT map_id, mode_id, count(DISTINCT player_id) as count
  FROM map_report
  WHERE server_id = (SELECT id FROM server WHERE name = $1)
    AND $2 <= top_tier
    AND bottom_tier <= $3
    AND time > now() - INTERVAL '1 hour'
  GROUP BY map_id, mode_id
)
SELECT map.code as map, mode.code as mode, recent_maps.count
FROM recent_maps
  INNER JOIN mode ON recent_maps.mode_id = mode.id
  INNER JOIN map ON recent_maps.map_id = map.id;
