-- ============================================================
-- Admin RLS Policies
-- Run this ONCE in Supabase SQL Editor.
-- Gives authenticated users with role='admin' full access to
-- all admin-managed tables while keeping normal user policies intact.
-- ============================================================

-- Helper: reusable check for admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- ── profiles ──
CREATE POLICY "Admins have full access to profiles"
  ON profiles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── drivers ──
CREATE POLICY "Admins have full access to drivers"
  ON drivers FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── vehicles ──
CREATE POLICY "Admins have full access to vehicles"
  ON vehicles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── rides ──
CREATE POLICY "Admins have full access to rides"
  ON rides FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── ride_stops ──
CREATE POLICY "Admins have full access to ride_stops"
  ON ride_stops FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── payments ──
CREATE POLICY "Admins have full access to payments"
  ON payments FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── driver_subscriptions ──
CREATE POLICY "Admins have full access to driver_subscriptions"
  ON driver_subscriptions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── driver_earnings ──
CREATE POLICY "Admins have full access to driver_earnings"
  ON driver_earnings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── promo_codes ──
CREATE POLICY "Admins have full access to promo_codes"
  ON promo_codes FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── ride_flags ──
CREATE POLICY "Admins have full access to ride_flags"
  ON ride_flags FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── favorite_drivers ──
CREATE POLICY "Admins have full access to favorite_drivers"
  ON favorite_drivers FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── support_tickets ──
CREATE POLICY "Admins have full access to support_tickets"
  ON support_tickets FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── ticket_responses ──
CREATE POLICY "Admins have full access to ticket_responses"
  ON ticket_responses FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── support_messages ──
CREATE POLICY "Admins have full access to support_messages"
  ON support_messages FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── notifications ──
CREATE POLICY "Admins have full access to notifications"
  ON notifications FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── ratings ──
CREATE POLICY "Admins have full access to ratings"
  ON ratings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── platform_settings ──
CREATE POLICY "Admins have full access to platform_settings"
  ON platform_settings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── marketing_content ──
CREATE POLICY "Admins have full access to marketing_content"
  ON marketing_content FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── marketing_inquiries ──
CREATE POLICY "Admins have full access to marketing_inquiries"
  ON marketing_inquiries FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── blog_subscribers (if exists) ──
-- CREATE POLICY "Admins have full access to blog_subscribers"
--   ON blog_subscribers FOR ALL TO authenticated
--   USING (public.is_admin())
--   WITH CHECK (public.is_admin());
