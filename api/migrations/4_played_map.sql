CREATE TABLE played_map (
  time        TIMESTAMPTZ NOT NULL DEFAULT now(),
  player_id   INT         NOT NULL,
  server_id   SMALLINT    NOT NULL,
  map_id      SMALLINT    NOT NULL,
  mode_id     SMALLINT    NOT NULL,
  bottom_tier SMALLINT    NOT NULL CONSTRAINT chk_played_map_bottom_tier CHECK (bottom_tier BETWEEN 1 AND 10),
  top_tier    SMALLINT    NOT NULL CONSTRAINT chk_played_map_top_tier CHECK (top_tier BETWEEN 1 AND 10),
  CONSTRAINT fk_played_map_server_id FOREIGN KEY (server_id) REFERENCES server(id),
  CONSTRAINT fk_played_map_map_id FOREIGN KEY (map_id) REFERENCES map(id),
  CONSTRAINT fk_played_map_mode_id FOREIGN KEY (mode_id) REFERENCES mode(id),
  CONSTRAINT chk_played_map_tier_spread CHECK (top_tier - bottom_tier BETWEEN 0 AND 2)
);

SELECT create_hypertable('played_map', 'time');

CREATE INDEX idx_played_map_server_id_bottom_tier_top_tier_time
  ON played_map(server_id, bottom_tier, top_tier, time DESC);