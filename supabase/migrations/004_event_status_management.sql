-- Migration: Event Status Management
-- Adds automatic ACTIVE → EXPIRED status transitions based on proper end_date logic

-- Function to update expired events
CREATE OR REPLACE FUNCTION update_expired_events()
RETURNS TABLE(updated_count INTEGER, details TEXT) AS $$
DECLARE
  updated_count INTEGER := 0;
  details TEXT := '';
BEGIN
  -- Update events that have passed their end_date
  UPDATE public.events 
  SET 
    status = 'EXPIRED',
    updated_at = NOW()
  WHERE 
    status = 'ACTIVE' 
    AND (
      -- Multi-day events: check end_date
      (end_date IS NOT NULL AND end_date < NOW()) 
      OR 
      -- Single-day events: use start_date + 1 day buffer
      (end_date IS NULL AND start_date < NOW() - INTERVAL '1 day')
    );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  details := format('Updated %s events from ACTIVE to EXPIRED at %s', 
                   updated_count, NOW()::TEXT);
  
  -- Log the operation
  INSERT INTO public.system_logs (operation, details, created_at)
  VALUES ('update_expired_events', details, NOW())
  ON CONFLICT DO NOTHING; -- In case logs table doesn't exist yet
  
  RETURN QUERY SELECT updated_count, details;
END;
$$ LANGUAGE plpgsql;

-- Create system_logs table if it doesn't exist (for logging)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for system_logs (admin only)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view system logs
CREATE POLICY "Admins can view system logs" ON public.system_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ADMIN', 'MODERATOR')
    )
  );

-- Create index for efficient expired event queries
CREATE INDEX IF NOT EXISTS idx_events_status_dates 
ON public.events (status, end_date, start_date) 
WHERE status = 'ACTIVE';

-- Add helper function to manually expire specific event
CREATE OR REPLACE FUNCTION expire_event(event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated BOOLEAN := FALSE;
BEGIN
  UPDATE public.events 
  SET 
    status = 'EXPIRED',
    updated_at = NOW()
  WHERE 
    id = event_id 
    AND status = 'ACTIVE';
  
  GET DIAGNOSTICS updated = FOUND;
  
  RETURN updated;
END;
$$ LANGUAGE plpgsql;

-- Add helper function to reactivate expired event (admin tool)
CREATE OR REPLACE FUNCTION reactivate_event(event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated BOOLEAN := FALSE;
BEGIN
  UPDATE public.events 
  SET 
    status = 'ACTIVE',
    updated_at = NOW()
  WHERE 
    id = event_id 
    AND status = 'EXPIRED';
  
  GET DIAGNOSTICS updated = FOUND;
  
  RETURN updated;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users for the functions
GRANT EXECUTE ON FUNCTION update_expired_events() TO authenticated;
GRANT EXECUTE ON FUNCTION expire_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_event(UUID) TO authenticated;

-- Comment with usage instructions
COMMENT ON FUNCTION update_expired_events() IS 
'Automatically updates ACTIVE events to EXPIRED based on end_date (multi-day) or start_date + 1 day (single-day). 
Usage: SELECT * FROM update_expired_events();
Should be called by cron job or background process hourly/daily.';

COMMENT ON FUNCTION expire_event(UUID) IS 
'Manually expire a specific active event. 
Usage: SELECT expire_event(''event-uuid-here'');
Returns TRUE if event was successfully expired.';

COMMENT ON FUNCTION reactivate_event(UUID) IS 
'Manually reactivate an expired event (admin tool). 
Usage: SELECT reactivate_event(''event-uuid-here'');
Returns TRUE if event was successfully reactivated.';