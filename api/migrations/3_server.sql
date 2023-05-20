CREATE TABLE server (
  id     SMALLINT PRIMARY KEY,
  name   TEXT     NOT NULL,
  region TEXT     NOT NULL,
  CONSTRAINT uc_server_name UNIQUE (name)
);

INSERT INTO server(id, name, region) VALUES
  (1, 'EU1', 'EU'),
  (2, 'EU2', 'EU');