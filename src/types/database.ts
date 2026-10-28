// Database types for the Hustle app
export type AppRole = 'customer' | 'hustler' | 'admin';
export type HustlerStatus = 'pending' | 'approved' | 'rejected';
export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  email_notifications?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface HustlerProfile {
  id: string;
  user_id: string;
  id_number: string;
  police_affidavit_url: string;
  criminal_record_url: string;
  bio: string | null;
  skills: string[] | null;
  status: HustlerStatus;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  total_earnings: number;
  average_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  hustler_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  price: number;
  price_type: string;
  photos: string[] | null;
  videos: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  hustler?: HustlerProfile & { profile?: Profile };
  category?: ServiceCategory;
}

export interface Booking {
  id: string;
  customer_id: string;
  service_id: string;
  hustler_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: BookingStatus;
  total_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  service?: Service;
  customer?: Profile;
  hustler?: HustlerProfile & { profile?: Profile };
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  hustler_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  // Joined data
  customer?: Profile;
}

export interface Conversation {
  id: string;
  customer_id: string;
  hustler_id: string;
  last_message_at: string;
  created_at: string;
  // Joined data
  customer?: Profile;
  hustler?: HustlerProfile & { profile?: Profile };
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  // Joined data
  sender?: Profile;
}

export interface Earning {
  id: string;
  hustler_id: string;
  booking_id: string;
  amount: number;
  created_at: string;
  // Joined data
  booking?: Booking;
}

// Extended types for display
export interface ServiceWithDistance extends Service {
  distance?: number;
  hustler_name?: string;
  hustler_avatar?: string;
  hustler_rating?: number;
}
