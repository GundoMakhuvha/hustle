import { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, User } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages, sendMessage, markMessagesAsRead } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/database";
import { format } from "date-fns";
import SkeletonCard from "@/components/SkeletonCard";

const ChatView = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: messages, isLoading, refetch } = useMessages(conversationId || null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [otherUser, setOtherUser] = useState<{ name: string; avatar: string | null } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch other user info
  useEffect(() => {
    const fetchConversation = async () => {
      if (!conversationId) return;

      const { data } = await supabase
        .from('conversations')
        .select(`
          customer:profiles!conversations_customer_id_fkey(*),
          hustler:hustler_profiles(
            profile:profiles(*)
          )
        `)
        .eq('id', conversationId)
        .single();

      if (data) {
        const isCustomer = (data as any).customer?.id === user?.id;
        if (isCustomer) {
          const hustlerProfile = (data as any).hustler?.profile;
          setOtherUser({
            name: hustlerProfile?.full_name || 'Hustler',
            avatar: hustlerProfile?.avatar_url,
          });
        } else {
          setOtherUser({
            name: (data as any).customer?.full_name || 'Customer',
            avatar: (data as any).customer?.avatar_url,
          });
        }
      }
    };

    fetchConversation();
  }, [conversationId, user?.id]);

  // Mark messages as read
  useEffect(() => {
    if (conversationId && user) {
      markMessagesAsRead(conversationId, user.id);
    }
  }, [conversationId, user, messages]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetch]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    setIsSending(true);
    try {
      await sendMessage(conversationId, user.id, newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth?redirect=/messages" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-2xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 bg-background border-b border-border z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/messages')} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
            {otherUser?.avatar ? (
              <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="font-semibold">{otherUser?.name || 'Chat'}</h1>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCard variant="conversation" />
            <SkeletonCard variant="conversation" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Start a conversation
          </div>
        ) : (
          messages?.map((message: Message) => {
            const isOwn = message.sender_id === user.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-secondary text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <p className={`text-xs text-muted-foreground ${isOwn ? 'text-right' : 'text-left'}`}>
                    {format(new Date(message.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
