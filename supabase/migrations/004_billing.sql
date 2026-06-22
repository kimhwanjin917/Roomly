ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_plan IN ('trial', 'starter', 'standard', 'pro'));
