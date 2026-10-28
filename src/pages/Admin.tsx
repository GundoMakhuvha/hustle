import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X, Clock, Eye, Download, User } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

interface HustlerApplication {
  id: string;
  user_id: string;
  id_number: string;
  bio: string | null;
  skills: string[] | null;
  police_affidavit_url: string;
  criminal_record_url: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profile: {
    full_name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<HustlerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<HustlerApplication | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/profile');
      return;
    }
    if (isAdmin) {
      fetchApplications();
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('hustler_profiles')
        .select(`
          id,
          user_id,
          id_number,
          bio,
          skills,
          police_affidavit_url,
          criminal_record_url,
          status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each application
      const applicationsWithProfiles = await Promise.all(
        (data || []).map(async (app) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email, phone, avatar_url')
            .eq('id', app.user_id)
            .single();

          return {
            ...app,
            profile: profileData
          } as HustlerApplication;
        })
      );

      setApplications(applicationsWithProfiles);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: "approved" | "rejected") => {
    setActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('hustler_profiles')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // If approved, add hustler role
      if (newStatus === 'approved') {
        const application = applications.find(a => a.id === applicationId);
        if (application) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: application.user_id, role: 'hustler' });
          
          if (roleError && !roleError.message.includes('duplicate')) {
            throw roleError;
          }
        }
      }

      toast({
        title: "Success",
        description: `Application ${newStatus}`,
      });

      setSelectedApplication(null);
      fetchApplications();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Documents live in a private bucket, so open them through a short-lived signed URL.
  const openDocument = async (stored: string) => {
    const marker = '/documents/';
    const path = stored.includes(marker) ? decodeURIComponent(stored.split(marker).pop()!.split('?')[0]) : stored;
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Error", description: "Couldn't open this document", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const filterByStatus = (status: string) => {
    if (status === 'all') return applications;
    return applications.filter(app => app.status === status);
  };

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!isAdmin) {
    return null;
  }

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <Layout hideNav>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center gap-4 px-4 py-3">
            <button onClick={() => navigate('/profile')} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Manage hustler applications</p>
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount} pending</Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="pending" className="relative">
                Pending
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            {['pending', 'approved', 'rejected', 'all'].map((status) => (
              <TabsContent key={status} value={status} className="mt-4 space-y-4">
                {filterByStatus(status).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No {status === 'all' ? '' : status} applications</p>
                  </div>
                ) : (
                  filterByStatus(status).map((application) => (
                    <Card key={application.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                              {application.profile?.avatar_url ? (
                                <img src={application.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {application.profile?.full_name || 'Unknown'}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {application.profile?.email}
                              </p>
                            </div>
                          </div>
                          <Badge variant={
                            application.status === 'approved' ? 'default' :
                            application.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {application.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">ID Number:</span>
                            <p className="font-medium">{application.id_number}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Phone:</span>
                            <p className="font-medium">{application.profile?.phone || 'N/A'}</p>
                          </div>
                        </div>

                        {application.skills && application.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {application.skills.map((skill, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {application.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {application.bio}
                          </p>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setSelectedApplication(application)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                          {application.status === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleStatusUpdate(application.id, 'approved')}
                                disabled={actionLoading}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleStatusUpdate(application.id, 'rejected')}
                                disabled={actionLoading}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Review Dialog */}
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Application</DialogTitle>
              <DialogDescription>
                Review the applicant's documents and information
              </DialogDescription>
            </DialogHeader>

            {selectedApplication && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                    {selectedApplication.profile?.avatar_url ? (
                      <img src={selectedApplication.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedApplication.profile?.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedApplication.profile?.email}</p>
                    <p className="text-sm text-muted-foreground">{selectedApplication.profile?.phone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ID Number</label>
                    <p className="font-medium">{selectedApplication.id_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Applied</label>
                    <p className="font-medium">
                      {new Date(selectedApplication.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {selectedApplication.bio && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Bio</label>
                    <p className="text-sm mt-1">{selectedApplication.bio}</p>
                  </div>
                )}

                {selectedApplication.skills && selectedApplication.skills.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Skills</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedApplication.skills.map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Documents</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openDocument(selectedApplication.police_affidavit_url)}
                      className="flex items-center gap-2 p-3 bg-secondary rounded-lg hover:bg-muted transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Police Affidavit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDocument(selectedApplication.criminal_record_url)}
                      className="flex items-center gap-2 p-3 bg-secondary rounded-lg hover:bg-muted transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Criminal Record</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              {selectedApplication?.status === 'pending' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusUpdate(selectedApplication.id, 'rejected')}
                    disabled={actionLoading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate(selectedApplication.id, 'approved')}
                    disabled={actionLoading}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Admin;
