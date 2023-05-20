CREATE TABLE mode (
  id   SMALLINT PRIMARY KEY,
  code TEXT     NOT NULL,
  CONSTRAINT uc_mode_code UNIQUE (code)
);

INSERT INTO mode(id, code) VALUES
  (1, 'ctf'),
  (2, 'domination'),
  (3, 'assault');