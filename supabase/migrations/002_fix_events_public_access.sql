-- Drop the existing policy
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;

-- Create a new policy that explicitly allows anonymous access
CREATE POLICY "Events are viewable by everyone" ON public.events
  FOR SELECT USING (true);

-- Also update the events RLS to allow viewing event counts
CREATE POLICY "Allow anonymous event count" ON public.events
  FOR SELECT USING (true);