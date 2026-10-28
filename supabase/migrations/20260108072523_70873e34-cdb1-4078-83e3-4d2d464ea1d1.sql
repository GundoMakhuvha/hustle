-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert earnings" ON public.earnings;

-- Create a more restrictive policy - only hustlers can insert earnings for their completed bookings
CREATE POLICY "Earnings inserted on booking completion" ON public.earnings FOR INSERT WITH CHECK (
  hustler_id = public.get_hustler_profile_id(auth.uid()) OR public.has_role(auth.uid(), 'admin')
);