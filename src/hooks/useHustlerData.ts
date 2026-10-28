import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useHustlerServices() {
  const { hustlerProfile } = useAuth();

  return useQuery({
    queryKey: ['hustler-services', hustlerProfile?.id],
    queryFn: async () => {
      if (!hustlerProfile?.id) return [];

      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(*)
        `)
        .eq('hustler_id', hustlerProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!hustlerProfile?.id,
  });
}

export function useHustlerBookings() {
  const { hustlerProfile } = useAuth();

  return useQuery({
    queryKey: ['hustler-bookings', hustlerProfile?.id],
    queryFn: async () => {
      if (!hustlerProfile?.id) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(title, price, price_type),
          customer:profiles!bookings_customer_id_fkey(full_name, email, phone, avatar_url)
        `)
        .eq('hustler_id', hustlerProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!hustlerProfile?.id,
  });
}

export function useHustlerEarnings() {
  const { hustlerProfile } = useAuth();

  return useQuery({
    queryKey: ['hustler-earnings', hustlerProfile?.id],
    queryFn: async () => {
      if (!hustlerProfile?.id) return { total: 0, earnings: [] };

      const { data, error } = await supabase
        .from('earnings')
        .select(`
          *,
          booking:bookings(
            scheduled_date,
            service:services(title)
          )
        `)
        .eq('hustler_id', hustlerProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total = (data || []).reduce((sum, e) => sum + Number(e.amount), 0);
      return { total, earnings: data || [] };
    },
    enabled: !!hustlerProfile?.id,
  });
}

export function useHustlerReviews() {
  const { hustlerProfile } = useAuth();

  return useQuery({
    queryKey: ['hustler-reviews', hustlerProfile?.id],
    queryFn: async () => {
      if (!hustlerProfile?.id) return [];

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          customer:profiles!reviews_customer_id_fkey(full_name, avatar_url)
        `)
        .eq('hustler_id', hustlerProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!hustlerProfile?.id,
  });
}
