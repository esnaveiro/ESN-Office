-- ============================================
-- Auto Check-Out at 5 AM
-- ============================================
-- This script creates a function and scheduled job
-- to automatically check out all volunteers at 5 AM daily

CREATE OR REPLACE FUNCTION auto_checkout_all_volunteers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log check-out action for all volunteers currently in office
  INSERT INTO public.presence_logs (volunteer_id, action, timestamp)
  SELECT id, 'check_out', NOW()
  FROM public.volunteers
  WHERE is_in_office = true;

  -- Update all volunteers to be checked out
  UPDATE public.volunteers
  SET
    is_in_office = false,
    last_seen = NOW()
  WHERE is_in_office = true;

  -- Log the action
  RAISE NOTICE 'Auto check-out completed at %', NOW();
END;
$$;
