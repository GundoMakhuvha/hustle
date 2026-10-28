import { useHustlerEarnings, useHustlerBookings } from '@/hooks/useHustlerData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import PayoutSettings from '@/components/dashboard/PayoutSettings';
import { formatPrice } from '@/lib/format';

export default function DashboardEarnings() {
  const { data: earningsData, isLoading } = useHustlerEarnings();
  const { data: bookings } = useHustlerBookings();

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading earnings...</div>;
  }

  const completedBookings = (bookings || []).filter((b: any) => b.status === 'completed').length;
  const thisMonthEarnings = (earningsData?.earnings || []).filter((e: any) => {
    const date = new Date(e.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <PayoutSettings />

      <h2 className="text-lg font-semibold">Earnings overview</h2>
      <p className="text-sm text-muted-foreground -mt-2">
        Shown after Hustle's 10% service fee. Tips are 100% yours. Paystack pays out to your bank on its normal settlement schedule.
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-xl font-bold">{formatPrice(earningsData?.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-xl font-bold">{formatPrice(thisMonthEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jobs Completed</p>
                <p className="text-xl font-bold">{completedBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg per Job</p>
                <p className="text-xl font-bold">
                  R{completedBookings > 0 ? (earningsData?.total! / completedBookings).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {(earningsData?.earnings || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No earnings yet</p>
              <p className="text-sm">Earnings show up here as soon as a customer pays</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(earningsData?.earnings || []).slice(0, 10).map((earning: any) => (
                <div key={earning.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{earning.booking?.service?.title || 'Service'}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(earning.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">+{formatPrice(earning.amount)}</p>
                    {earning.gross_amount != null && (
                      <p className="text-[11px] text-muted-foreground">
                        {formatPrice(earning.gross_amount)} paid · {formatPrice(earning.platform_fee)} fee
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
