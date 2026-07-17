-- Marketplace Disruptivo: vitrina de apps, reseñas, planes, suscripciones y avisos

ALTER TABLE apps
  ADD COLUMN slug text UNIQUE,
  ADD COLUMN tagline text,
  ADD COLUMN description text,
  ADD COLUMN install_url text,
  ADD COLUMN price_text text,
  ADD COLUMN media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN visible boolean NOT NULL DEFAULT false;

UPDATE apps SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || id WHERE slug IS NULL;

CREATE TABLE reviews (
  id serial PRIMARY KEY,
  app_id integer NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  author text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_app ON reviews(app_id);

CREATE TABLE plans (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_text text,
  app_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  trial_days integer NOT NULL DEFAULT 0,
  duration_months integer,
  visible boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id serial PRIMARY KEY,
  location_id text NOT NULL,
  app_id integer REFERENCES apps(id),
  plan_id integer REFERENCES plans(id),
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (app_id IS NOT NULL OR plan_id IS NOT NULL)
);
CREATE INDEX subscriptions_location ON subscriptions(location_id);
CREATE INDEX subscriptions_ends ON subscriptions(ends_at);

CREATE TABLE notices (
  id serial PRIMARY KEY,
  title text NOT NULL,
  body text,
  level text NOT NULL DEFAULT 'info',
  show_in_store boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
