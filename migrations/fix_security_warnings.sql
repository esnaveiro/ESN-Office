-- Fix Supabase security advisor warnings
-- 1. Enable RLS on board_settings
-- 2. Recreate inventory_with_latest_change view with security_invoker

-- -------------------------
-- BOARD SETTINGS — enable RLS
-- -------------------------

ALTER TABLE public.board_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (volunteers) can read settings
CREATE POLICY "Authenticated users can read board settings"
  ON public.board_settings FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only service role (API routes) can modify settings — no direct client writes
-- (INSERT / UPDATE / DELETE are handled server-side via the service role key)

-- -------------------------
-- INVENTORY VIEW — switch to security_invoker
-- Drops the old security_definer view and recreates it so that
-- queries run with the permissions of the calling user, not Postgres.
-- -------------------------

DROP VIEW IF EXISTS public.inventory_with_latest_change;

CREATE VIEW public.inventory_with_latest_change
  WITH (security_invoker = on) AS
SELECT
  i.id,
  i.name,
  i.description,
  i.quantity,
  i.unit,
  i.location,
  i.category,
  i.notes,
  i.low_stock_threshold,
  i.created_by_id,
  i.created_by_name,
  i.created_at,
  i.updated_at,
  l.changed_by_name     AS last_changed_by,
  l.changes_description AS last_change_description,
  l.created_at          AS last_changed_at
FROM public.inventory i
LEFT JOIN LATERAL (
  SELECT changed_by_name, changes_description, created_at
  FROM public.inventory_logs
  WHERE inventory_id = i.id
  ORDER BY created_at DESC
  LIMIT 1
) l ON true;
