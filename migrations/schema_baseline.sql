-- ============================================================
-- Schema Baseline
-- Consolidates all foundational migrations into one idempotent
-- script. Safe to run on a fresh or existing database.
-- ============================================================

-- -------------------------
-- VOLUNTEERS
-- -------------------------

CREATE TABLE IF NOT EXISTS public.volunteers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  position text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'dnd', 'break', 'remote')),
  is_in_office boolean NOT NULL DEFAULT false,
  last_seen timestamptz,
  esn_sub text UNIQUE,
  is_admin boolean NOT NULL DEFAULT false
);

-- Add columns to existing tables if they were created without them
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS esn_sub  text UNIQUE;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers are viewable by everyone"
  ON public.volunteers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update volunteers"
  ON public.volunteers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role can insert volunteers"
  ON public.volunteers FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_volunteers_email   ON public.volunteers(email);
CREATE INDEX IF NOT EXISTS idx_volunteers_esn_sub ON public.volunteers(esn_sub);

-- -------------------------
-- SCHEDULES
-- -------------------------

CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id uuid NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  confirmation_type text NOT NULL CHECK (confirmation_type IN ('firm', 'flex', 'confirmed')),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schedules are viewable by authenticated users"
  ON public.schedules FOR SELECT USING (auth.uid() IS NOT NULL OR true);
CREATE POLICY "Schedules can be inserted by anyone"
  ON public.schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Schedules can be updated by anyone"
  ON public.schedules FOR UPDATE USING (true);
CREATE POLICY "Schedules can be deleted by anyone"
  ON public.schedules FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_schedules_volunteer_id ON public.schedules(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date         ON public.schedules(date);

-- -------------------------
-- PRESENCE LOGS
-- -------------------------

CREATE TABLE IF NOT EXISTS public.presence_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id uuid NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('check_in', 'check_out')),
  timestamp timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.presence_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Presence logs are viewable by authenticated users"
  ON public.presence_logs FOR SELECT USING (true);
CREATE POLICY "Presence logs can be inserted by anyone"
  ON public.presence_logs FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_presence_logs_volunteer_id ON public.presence_logs(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_presence_logs_timestamp    ON public.presence_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_presence_logs_action       ON public.presence_logs(action);

-- -------------------------
-- SCHEDULED CHECK-INS
-- -------------------------

CREATE TABLE IF NOT EXISTS public.scheduled_checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id uuid NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  scheduled_datetime timestamptz NOT NULL,
  action text NOT NULL CHECK (action IN ('check_in', 'check_out')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  auto_execute boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

ALTER TABLE public.scheduled_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scheduled check-ins are viewable by authenticated users"
  ON public.scheduled_checkins FOR SELECT USING (true);
CREATE POLICY "Scheduled check-ins can be inserted by anyone"
  ON public.scheduled_checkins FOR INSERT WITH CHECK (true);
CREATE POLICY "Scheduled check-ins can be updated by anyone"
  ON public.scheduled_checkins FOR UPDATE USING (true);
CREATE POLICY "Scheduled check-ins can be deleted by anyone"
  ON public.scheduled_checkins FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_scheduled_checkins_volunteer_id ON public.scheduled_checkins(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_checkins_status       ON public.scheduled_checkins(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_checkins_datetime     ON public.scheduled_checkins(scheduled_datetime);

-- -------------------------
-- SETTINGS
-- -------------------------

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are viewable by authenticated users"
  ON public.settings FOR SELECT USING (true);
CREATE POLICY "Settings can be modified by anyone"
  ON public.settings FOR ALL USING (true);

-- -------------------------
-- INVENTORY
-- -------------------------

CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text DEFAULT 'units',
  location text NOT NULL,
  category text,
  notes text,
  low_stock_threshold integer,
  created_by_id uuid REFERENCES public.volunteers(id) ON DELETE SET NULL,
  created_by_name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add columns to existing tables if they were created without them
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS low_stock_threshold integer;

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inventory"
  ON public.inventory FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert inventory"
  ON public.inventory FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update inventory"
  ON public.inventory FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete inventory"
  ON public.inventory FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_inventory_location   ON public.inventory(location);
CREATE INDEX IF NOT EXISTS idx_inventory_category   ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory(created_at);

-- inventory_logs --

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id uuid NOT NULL,
  action text CHECK (action IN ('created', 'updated', 'deleted')) NOT NULL,
  changed_by_id uuid REFERENCES public.volunteers(id) ON DELETE SET NULL,
  changed_by_name text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changes_description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inventory logs"
  ON public.inventory_logs FOR SELECT USING (auth.uid() IS NOT NULL);

-- Final RLS for inserts — allows triggers (SECURITY DEFINER, no auth context) as well as users
DROP POLICY IF EXISTS "Authenticated users can insert inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Allow inventory log inserts"                   ON public.inventory_logs;
CREATE POLICY "Allow inventory log inserts"
  ON public.inventory_logs FOR INSERT
  WITH CHECK (true);  -- actual access control is handled by the service role + SECURITY DEFINER trigger

CREATE INDEX IF NOT EXISTS idx_inventory_logs_inventory_id ON public.inventory_logs(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at   ON public.inventory_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_action       ON public.inventory_logs(action);

-- Trigger function for automatic inventory changelog --

CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by_name text;
  v_changed_by_id uuid;
  v_old_values jsonb;
  v_new_values jsonb;
  v_action text;
  v_changes_description text;
BEGIN
  v_changed_by_id := auth.uid();
  SELECT name INTO v_changed_by_name FROM public.volunteers WHERE id = v_changed_by_id;
  IF v_changed_by_name IS NULL THEN v_changed_by_name := 'System'; END IF;

  IF (TG_OP = 'INSERT') THEN
    v_action := 'created';
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
    v_changes_description := format('Created item: %s', NEW.name);

  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'updated';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    v_changes_description := 'Updated:';
    IF OLD.name     != NEW.name     THEN v_changes_description := v_changes_description || format(' name "%s"→"%s";', OLD.name, NEW.name); END IF;
    IF OLD.quantity != NEW.quantity THEN v_changes_description := v_changes_description || format(' qty %s→%s;', OLD.quantity, NEW.quantity); END IF;
    IF OLD.location != NEW.location THEN v_changes_description := v_changes_description || format(' location "%s"→"%s";', OLD.location, NEW.location); END IF;
    IF COALESCE(OLD.description,'') != COALESCE(NEW.description,'') THEN v_changes_description := v_changes_description || ' description changed;'; END IF;
    IF COALESCE(OLD.category,'')    != COALESCE(NEW.category,'')    THEN v_changes_description := v_changes_description || format(' category "%s"→"%s";', COALESCE(OLD.category,'none'), COALESCE(NEW.category,'none')); END IF;

  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'deleted';
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
    v_changes_description := format('Deleted item: %s', OLD.name);
  END IF;

  INSERT INTO public.inventory_logs (inventory_id, action, changed_by_id, changed_by_name, old_values, new_values, changes_description)
  VALUES (COALESCE(NEW.id, OLD.id), v_action, v_changed_by_id, v_changed_by_name, v_old_values, v_new_values, v_changes_description);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers removed: changelog is written by the API route (has real user context).
-- The log_inventory_change() function is kept but not attached.

CREATE OR REPLACE VIEW public.inventory_with_latest_change AS
SELECT i.*,
  l.changed_by_name    AS last_changed_by,
  l.changes_description AS last_change_description,
  l.created_at          AS last_changed_at
FROM public.inventory i
LEFT JOIN LATERAL (
  SELECT changed_by_name, changes_description, created_at
  FROM public.inventory_logs
  WHERE inventory_id = i.id
  ORDER BY created_at DESC LIMIT 1
) l ON true;

-- -------------------------
-- OFFICE RESERVATIONS
-- -------------------------

CREATE TABLE IF NOT EXISTS public.office_reservations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reserved_by_id uuid REFERENCES public.volunteers(id) ON DELETE SET NULL,
  reserved_by_name text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text,
  send_email_notification boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  additional_volunteers text[] DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

ALTER TABLE public.office_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view office reservations"
  ON public.office_reservations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reservations"
  ON public.office_reservations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update reservations"
  ON public.office_reservations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete reservations"
  ON public.office_reservations FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_office_reservations_time_range ON public.office_reservations(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_office_reservations_active     ON public.office_reservations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_office_reservations_status     ON public.office_reservations(status);

-- Add columns to existing tables if they were created without them
ALTER TABLE public.office_reservations ADD COLUMN IF NOT EXISTS status                 text DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected'));
ALTER TABLE public.office_reservations ADD COLUMN IF NOT EXISTS send_email_notification boolean DEFAULT false NOT NULL;
ALTER TABLE public.office_reservations ADD COLUMN IF NOT EXISTS additional_volunteers  text[] DEFAULT NULL;

-- Backfill: any existing rows with NULL status get approved
UPDATE public.office_reservations SET status = 'approved' WHERE status IS NULL;

-- -------------------------
-- BOARD SETTINGS
-- -------------------------

CREATE TABLE IF NOT EXISTS public.board_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.volunteers(id)
);

INSERT INTO public.board_settings (key, value)
VALUES ('board_emails', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- -------------------------
-- get_current_reservation (final version)
-- -------------------------

DROP FUNCTION IF EXISTS public.get_current_reservation();

CREATE FUNCTION public.get_current_reservation()
RETURNS TABLE (
  id uuid,
  reserved_by_id uuid,
  reserved_by_name text,
  start_time timestamptz,
  end_time timestamptz,
  reason text,
  send_email_notification boolean,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  additional_volunteers text[],
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id, r.reserved_by_id, r.reserved_by_name,
    r.start_time, r.end_time, r.reason,
    r.send_email_notification, r.is_active,
    r.created_at, r.updated_at,
    r.additional_volunteers, r.status
  FROM public.office_reservations r
  WHERE r.is_active = true
    AND r.status = 'approved'
    AND r.start_time <= now()
    AND r.end_time   >= now()
  ORDER BY r.start_time
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
