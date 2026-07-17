CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE apps (
  id serial PRIMARY KEY,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  test_mode boolean NOT NULL DEFAULT false,
  -- NULL = puede cobrar a todas las subcuentas; array JSON = solo a esas
  allowed_location_ids jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE meters (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  ghl_meter_id text NOT NULL,
  name text NOT NULL,
  unit_label text NOT NULL DEFAULT 'unidad',
  price_type text NOT NULL DEFAULT 'fixed',
  default_price numeric(12,6),
  min_price numeric(12,6),
  max_price numeric(12,6),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE connections (
  id serial PRIMARY KEY,
  location_id text NOT NULL UNIQUE,
  company_id text,
  alias text,
  name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  test_mode boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'connected',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE charges (
  id serial PRIMARY KEY,
  app_id integer NOT NULL REFERENCES apps(id),
  meter_id integer REFERENCES meters(id),
  connection_id integer REFERENCES connections(id),
  location_id text NOT NULL,
  event_id text NOT NULL,
  units numeric(12,4) NOT NULL,
  price_per_unit numeric(12,6),
  amount numeric(14,6),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  ghl_charge_id text,
  description text,
  user_id text,
  event_time timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX charges_app_event ON charges(app_id, event_id);
CREATE INDEX charges_location ON charges(location_id, created_at DESC);
CREATE INDEX charges_created ON charges(created_at DESC);
CREATE INDEX charges_status ON charges(status);
