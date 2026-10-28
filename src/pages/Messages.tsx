import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { MessageCircle, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useMessages";
import SkeletonCard from "@/components/SkeletonCard";
import { formatDistanceToNow } from "date-fns";

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: conversations, isLoading } = useConversations();

  if (!user) {
    return (
      <Layout>
        <div className="px-4 sm:px-6 pt-4 md:pt-10 pb-6 space-y-6">
          <h1 className="text-xl md:text-3xl font-bold text-foreground">Messages</h1>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
            <p>Sign in to view messages</p>
            <button onClick={() => navigate('/auth?redirect=/messages')} className="mt-4 px-5 py-2 rounded-full bg-foreground text-background text-sm font-medium">Sign in</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-4 md:pt-10 pb-6 space-y-6">
        <h1 className="text-xl md:text-3xl font-bold text-foreground">Messages</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <SkeletonCard key={i} variant="conversation" />)}
          </div>
        ) : conversations?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Book a service to start chatting</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations?.map((conv) => {
              const isCustomer = conv.customer_id === user.id;
              const otherProfile = isCustomer ? (conv.hustler as any)?.profile : conv.customer;
              
              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="w-full flex items-center gap-3 p-4 bg-secondary rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                    {otherProfile?.avatar_url ? (
                      <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">{otherProfile?.full_name || 'User'}</h3>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">Tap to view conversation</p>
                  </div>
                  {(conv.unread_count || 0) > 0 && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs text-primary-foreground">{conv.unread_count}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Messages;
