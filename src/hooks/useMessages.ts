import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation, Message } from '@/types/database';

export function useConversations() {
  const { user, hustlerProfile } = useAuth();

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          customer:profiles!conversations_customer_id_fkey(*),
          hustler:hustler_profiles(
            *,
            profile:profiles(*)
          )
        `)
        .or(`customer_id.eq.${user.id}${hustlerProfile ? `,hustler_id.eq.${hustlerProfile.id}` : ''}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        (data || []).map(async (conv: any) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            unread_count: count || 0,
          };
        })
      );

      return conversationsWithUnread;
    },
    enabled: !!user,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!conversationId,
  });
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function markMessagesAsRead(conversationId: string, userId: string) {
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);
}

export async function getOrCreateConversation(customerId: string, hustlerId: string) {
  // Check if conversation exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('customer_id', customerId)
    .eq('hustler_id', hustlerId)
    .single();

  if (existing) return existing;

  // Create new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      customer_id: customerId,
      hustler_id: hustlerId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
