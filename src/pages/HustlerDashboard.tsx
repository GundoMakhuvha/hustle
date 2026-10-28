import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import PillTabs from '@/components/PillTabs';
import { useHustlerBookings } from '@/hooks/useHustlerData';
import { ArrowLeft, Package, Calendar, DollarSign, Star } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import DashboardServices from '@/components/dashboard/DashboardServices';
import DashboardBookings from '@/components/dashboard/DashboardBookings';
import DashboardEarnings from '@/components/dashboard/DashboardEarnings';
import DashboardReviews from '@/components/dashboard/DashboardReviews';

const HustlerDashboard = () => {
  const navigate = useNavigate();
  const { isApprovedHustler, isLoading, hustlerProfile } = useAuth();
  const { data: bookings } = useHustlerBookings();
  const [tab, setTab] = useState(() => (new URLSearchParams(window.location.search).get('tab') || 'bookings'));
  const pending = (bookings || []).filter((b: any) => b.status === 'pending').length;

  useEffect(() => {
    if (!isLoading && !isApprovedHustler) {
      navigate('/profile');
    }
  }, [isApprovedHustler, isLoading, navigate]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isApprovedHustler) {
    return null;
  }

  return (
    <Layout hideNav>
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 px-3 pt-3">
          <div className="glass-panel rounded-full flex items-center gap-3 pl-2 pr-4 py-2">
            <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full glass-chip flex items-center justify-center" aria-label="Back to profile">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold leading-tight">Hustler dashboard</h1>
              <p className="text-xs text-muted-foreground truncate">Bookings, services and earnings</p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full glass-chip">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-sm">{Number(hustlerProfile?.average_rating || 0).toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
            <PillTabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'bookings', label: 'Bookings', icon: Calendar, badge: pending },
                { value: 'services', label: 'Services', icon: Package },
                { value: 'earnings', label: 'Earnings', icon: DollarSign },
                { value: 'reviews', label: 'Reviews', icon: Star },
              ]}
            />
          </div>

          <div key={tab} className="animate-fade-in">
            {tab === 'bookings' && <DashboardBookings />}
            {tab === 'services' && <DashboardServices />}
            {tab === 'earnings' && <DashboardEarnings />}
            {tab === 'reviews' && <DashboardReviews />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HustlerDashboard;
