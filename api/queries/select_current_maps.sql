WITH current_map AS (
  SELECT map_id, mode_id, count(DISTINCT user_id) as count
  FROM played_map
  WHERE server_id = (SELECT id FROM server WHERE name = $1)
    AND $2 <= top_tier
    AND bottom_tier <= $3
    AND time > now() - INTERVAL '1 hour'
  GROUP BY map_id, mode_id
)
SELECT map.code as map, mode.code as mode, current_map.count
FROM current_map
  INNER JOIN mode ON current_map.mode_id = mode.id
  INNER JOIN map ON current_map.map_id = map.id
ORDER BY current_map.count DESC;
