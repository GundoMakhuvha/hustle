import { useHustlerReviews } from '@/hooks/useHustlerData';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Star, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function DashboardReviews() {
  const { hustlerProfile } = useAuth();
  const { data: reviews, isLoading } = useHustlerReviews();

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading reviews...</div>;
  }

  const averageRating = hustlerProfile?.average_rating || 0;
  const totalReviews = hustlerProfile?.total_reviews || 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Reviews</h2>

      {/* Rating Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1">
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = (reviews || []).filter((r: any) => r.rating === star).length;
                  const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs w-3">{star}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-6">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {(reviews || []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No reviews yet</p>
          <p className="text-sm">Complete jobs to get reviews from customers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(reviews || []).map((review: any) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                    {review.customer?.avatar_url ? (
                      <img src={review.customer.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{review.customer?.full_name || 'Customer'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 my-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
                          }`}
                        />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
