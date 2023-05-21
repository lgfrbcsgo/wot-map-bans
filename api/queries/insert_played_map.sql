INSERT INTO played_map(player_id, server_id, map_id, mode_id, bottom_tier, top_tier)
SELECT $1, server.id, map.id, mode.id, $5, $6
FROM server, map, mode
WHERE server.name = $2 AND map.code = $3 AND mode.code = $4
RETURNING played_map.time;