CREATE TABLE map_report (
  time        TIMESTAMPTZ NOT NULL DEFAULT now(),
  player_id   INT         NOT NULL,
  server_id   SMALLINT    NOT NULL,
  map_id      SMALLINT    NOT NULL,
  mode_id     SMALLINT    NOT NULL,
  bottom_tier SMALLINT    NOT NULL CONSTRAINT chk_map_report_bottom_tier CHECK (bottom_tier BETWEEN 1 AND 10),
  top_tier    SMALLINT    NOT NULL CONSTRAINT chk_map_report_top_tier CHECK (top_tier BETWEEN 1 AND 10),
  CONSTRAINT fk_map_report_server_id FOREIGN KEY (server_id) REFERENCES server(id),
  CONSTRAINT fk_map_report_map_id FOREIGN KEY (map_id) REFERENCES map(id),
  CONSTRAINT fk_map_report_mode_id FOREIGN KEY (mode_id) REFERENCES mode(id),
  CONSTRAINT chk_map_report_tier_spread CHECK (top_tier - bottom_tier BETWEEN 0 AND 2)
);

SELECT create_hypertable('map_report', 'time');

CREATE INDEX idx_map_report_server_id_bottom_tier_top_tier_time
  ON map_report (server_id, bottom_tier, top_tier, time DESC);