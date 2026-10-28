import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Upload, User, FileText, Shield, Phone, Briefcase, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useServices";
import LoadingScreen from "@/components/LoadingScreen";

const BecomeHustler = () => {
  const navigate = useNavigate();
  const { user, refreshProfile, hustlerProfile, isLoading: authLoading } = useAuth();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    idNumber: "",
    phone: "",
    bio: "",
    skills: "",
    categoryId: "",
  });
  const [policeAffidavit, setPoliceAffidavit] = useState<File | null>(null);
  const [criminalRecord, setCriminalRecord] = useState<File | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  // Redirect if not logged in
  if (authLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth?redirect=/become-hustler" replace />;

  // Show status if already applied
  if (hustlerProfile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 bg-background border-b border-border z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Application Status</h1>
          </div>
        </header>
        
        <div className="max-w-2xl mx-auto px-4 py-8 text-center space-y-4">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            hustlerProfile.status === 'approved' ? 'bg-green-100' :
            hustlerProfile.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            {hustlerProfile.status === 'approved' ? (
              <Shield className="w-8 h-8 text-green-600" />
            ) : hustlerProfile.status === 'rejected' ? (
              <Shield className="w-8 h-8 text-red-600" />
            ) : (
              <Shield className="w-8 h-8 text-yellow-600" />
            )}
          </div>
          
          <h2 className="text-xl font-semibold">
            {hustlerProfile.status === 'approved' ? 'You\'re Approved!' :
             hustlerProfile.status === 'rejected' ? 'Application Rejected' :
             'Application Pending'}
          </h2>
          
          <p className="text-muted-foreground">
            {hustlerProfile.status === 'approved' 
              ? 'You can now access your Hustler Dashboard and start offering services.'
              : hustlerProfile.status === 'rejected'
              ? 'Unfortunately, your application was not approved. Please contact support for more information.'
              : 'Your application is being reviewed. We\'ll notify you once it\'s processed.'}
          </p>
          
          {hustlerProfile.status === 'approved' && (
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Go to Dashboard
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (categoriesLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  const handleFileChange = (setter: (file: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    setter(file);
  };

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!policeAffidavit || !criminalRecord) {
      toast.error("Please upload all required documents");
      return;
    }

    if (!formData.idNumber || !formData.categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload documents
      const policeUrl = await uploadFile(policeAffidavit, 'documents', user.id);
      const criminalUrl = await uploadFile(criminalRecord, 'documents', user.id);
      
      // Upload profile photo if provided
      let avatarUrl = null;
      if (profilePhoto) {
        avatarUrl = await uploadFile(profilePhoto, 'avatars', user.id);
        // Update profile with avatar
        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
      }

      // Update profile with phone
      if (formData.phone) {
        await supabase.from('profiles').update({ phone: formData.phone }).eq('id', user.id);
      }

      // Create hustler profile
      const { error } = await supabase.from('hustler_profiles').insert({
        user_id: user.id,
        id_number: formData.idNumber,
        police_affidavit_url: policeUrl,
        criminal_record_url: criminalUrl,
        bio: formData.bio || null,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()) : null,
        status: 'pending',
      });

      if (error) throw error;

      // Add hustler role
      await supabase.from('user_roles').insert({
        user_id: user.id,
        role: 'hustler',
      });

      await refreshProfile();
      toast.success("Application submitted successfully!");
      
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 bg-background border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Become a Hustler</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Intro */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Start earning today</h2>
          <p className="text-sm text-muted-foreground">
            Complete your profile to start offering services
          </p>
        </div>

        {/* Profile Photo */}
        <div className="space-y-2">
          <Label>Profile Photo</Label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
              {profilePhoto ? (
                <img src={URL.createObjectURL(profilePhoto)} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <Label className="cursor-pointer px-4 py-2 bg-secondary rounded-lg hover:bg-muted transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange(setProfilePhoto)}
                className="hidden"
              />
              Upload Photo
            </Label>
          </div>
        </div>

        {/* ID Number */}
        <div className="space-y-2">
          <Label htmlFor="idNumber">ID Number *</Label>
          <Input
            id="idNumber"
            value={formData.idNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
            placeholder="Enter your ID number"
            required
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Contact Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+27 123 456 7890"
              className="pl-10"
            />
          </div>
        </div>

        {/* Service Category */}
        <div className="space-y-2">
          <Label>Primary Service Category *</Label>
          <Select
            value={formData.categoryId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <Label htmlFor="skills">Skills & Specialisations</Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              id="skills"
              value={formData.skills}
              onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
              placeholder="e.g., Deep cleaning, Organising, Laundry"
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">Separate skills with commas</p>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">About You</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Tell customers about yourself and your experience..."
            rows={4}
          />
        </div>

        {/* Document Uploads */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Required Documents</h3>
          
          <div className="space-y-2">
            <Label>Police Affidavit *</Label>
            <Label className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              policeAffidavit ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange(setPoliceAffidavit)}
                className="hidden"
              />
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {policeAffidavit ? policeAffidavit.name : 'Upload police affidavit'}
                </p>
                <p className="text-xs text-muted-foreground">PDF, JPG or PNG (max 10MB)</p>
              </div>
              <Upload className="w-5 h-5 text-muted-foreground" />
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Criminal Record Check *</Label>
            <Label className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              criminalRecord ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange(setCriminalRecord)}
                className="hidden"
              />
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {criminalRecord ? criminalRecord.name : 'Upload criminal record'}
                </p>
                <p className="text-xs text-muted-foreground">PDF, JPG or PNG (max 10MB)</p>
              </div>
              <Upload className="w-5 h-5 text-muted-foreground" />
            </Label>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By submitting, you agree to our terms of service and privacy policy.
          Your documents will be reviewed within 24-48 hours.
        </p>
      </form>
    </div>
  );
};

export default BecomeHustler;
