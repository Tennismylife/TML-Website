-- Create tracking schema and visits table
CREATE SCHEMA IF NOT EXISTS tracking_schema;

CREATE TABLE IF NOT EXISTS tracking_schema.visits (
  id SERIAL PRIMARY KEY,
  page_url TEXT,
  page_title TEXT,
  user_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
