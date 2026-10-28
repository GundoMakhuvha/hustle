import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ServiceWithDistance } from '@/types/database';
import { calculateDistance } from './useLocation';
import { sanitizeSearch } from '@/lib/format';

interface UseServicesOptions {
  categoryId?: string;
  searchQuery?: string;
  userLat?: number | null;
  userLon?: number | null;
  maxDistance?: number; // in km
}

export function useServices(options: UseServicesOptions = {}) {
  const { categoryId, searchQuery, userLat, userLon, maxDistance = 20 } = options;

  return useQuery({
    queryKey: ['services', categoryId, searchQuery, userLat, userLon],
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<ServiceWithDistance[]> => {
      // First get services with hustler profiles
      let query = supabase
        .from('services')
        .select(`
          *,
          category:service_categories(*),
          hustler:hustler_profiles(*)
        `)
        .eq('is_active', true)
        .eq('hustler.status', 'approved');

      if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }

      const q = searchQuery ? sanitizeSearch(searchQuery) : '';
      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter out services without approved hustlers
      const servicesWithHustlers = (data || []).filter(
        (service: any) => service.hustler !== null
      );

      // Get unique user_ids from hustler profiles to fetch profiles
      const userIds = [...new Set(
        servicesWithHustlers
          .map((s: any) => s.hustler?.user_id)
          .filter(Boolean)
      )];

      // Fetch profiles for all hustlers
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
        
        profilesMap = (profiles || []).reduce((acc: Record<string, any>, profile: any) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }

      // Transform and calculate distances
      let services: ServiceWithDistance[] = servicesWithHustlers.map((service: any) => {
        const hustlerProfile = service.hustler;
        const profile = profilesMap[hustlerProfile?.user_id];
        
        let distance: number | undefined;
        if (userLat && userLon && hustlerProfile?.latitude && hustlerProfile?.longitude) {
          distance = calculateDistance(
            userLat,
            userLon,
            hustlerProfile.latitude,
            hustlerProfile.longitude
          );
        }

        return {
          ...service,
          distance,
          hustler_name: profile?.full_name || 'Unknown',
          hustler_avatar: profile?.avatar_url,
          hustler_rating: hustlerProfile?.average_rating || 0,
        };
      });

      // Filter by distance if user location is available
      if (userLat && userLon) {
        services = services.filter(s => !s.distance || s.distance <= maxDistance);
        // Sort by distance, then by rating
        services.sort((a, b) => {
          if (a.distance !== undefined && b.distance !== undefined) {
            if (a.distance !== b.distance) return a.distance - b.distance;
          }
          return (b.hustler_rating || 0) - (a.hustler_rating || 0);
        });
      } else {
        // Sort by rating if no location
        services.sort((a, b) => (b.hustler_rating || 0) - (a.hustler_rating || 0));
      }

      return services;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}
