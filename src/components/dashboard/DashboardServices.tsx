import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHustlerServices } from '@/hooks/useHustlerData';
import { useCategories } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, ImagePlus, Package } from 'lucide-react';

interface ServiceForm {
  id?: string;
  title: string;
  description: string;
  price: string;
  price_type: string;
  category_id: string;
  is_active: boolean;
}

const emptyForm: ServiceForm = {
  title: '',
  description: '',
  price: '',
  price_type: 'fixed',
  category_id: '',
  is_active: true,
};

export default function DashboardServices() {
  const { hustlerProfile } = useAuth();
  const { data: services, isLoading } = useHustlerServices();
  const { data: categories } = useCategories();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const MAX_PHOTOS = 12;

  const openNewService = () => {
    setForm(emptyForm);
    setPhotos([]);
    setExistingPhotos([]);
    setIsDialogOpen(true);
  };

  const openEditService = (service: any) => {
    setForm({
      id: service.id,
      title: service.title,
      description: service.description || '',
      price: String(service.price),
      price_type: service.price_type || 'fixed',
      category_id: service.category_id || '',
      is_active: service.is_active,
    });
    setPhotos([]);
    setExistingPhotos(service.photos ?? []);
    setIsDialogOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const picked = Array.from(e.target.files).filter((f) => f.type.startsWith('image/') && f.size <= 8 * 1024 * 1024);
      if (picked.length < e.target.files.length) {
        toast({ title: 'Some photos skipped', description: 'Photos must be images under 8 MB.' });
      }
      setPhotos((prev) => [...prev, ...picked].slice(0, Math.max(0, MAX_PHOTOS - existingPhotos.length)));
      e.target.value = '';
    }
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const photo of photos) {
      const ext = photo.name.split('.').pop();
      const path = `${hustlerProfile?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('service-media').upload(path, photo);
      if (!error) {
        const { data } = supabase.storage.from('service-media').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!hustlerProfile?.id) return;
    if (!form.title || !form.price || !form.category_id) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      const serviceData = {
        hustler_id: hustlerProfile.id,
        title: form.title,
        description: form.description || null,
        price: parseFloat(form.price),
        price_type: form.price_type,
        category_id: form.category_id,
        is_active: form.is_active,
        // Keep the photos they didn't remove and add the new ones, so the gallery grows.
        photos: [...existingPhotos, ...photoUrls],
      };

      if (form.id) {
        const { error } = await supabase.from('services').update(serviceData).eq('id', form.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Service updated' });
      } else {
        const { error } = await supabase.from('services').insert(serviceData);
        if (error) throw error;
        toast({ title: 'Success', description: 'Service created' });
      }

      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['hustler-services'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Delete this service?')) return;
    try {
      const { error } = await supabase.from('services').delete().eq('id', serviceId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Service deleted' });
      queryClient.invalidateQueries({ queryKey: ['hustler-services'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (serviceId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from('services').update({ is_active: !isActive }).eq('id', serviceId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['hustler-services'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading services...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Services</h2>
        <Button onClick={openNewService} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Service
        </Button>
      </div>

      {services?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No services yet</p>
          <Button onClick={openNewService} className="mt-4" variant="outline">
            Create your first service
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {services?.map((service: any) => (
            <Card key={service.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {service.photos?.[0] ? (
                    <img src={service.photos[0]} alt="" className="w-20 h-20 rounded-lg object-cover" />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold truncate">{service.title}</h3>
                        <p className="text-sm text-muted-foreground">{service.category?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={() => toggleActive(service.id, service.is_active)}
                        />
                        <Badge variant={service.is_active ? 'default' : 'secondary'}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-primary mt-1">
                      R{service.price} / {service.price_type}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => openEditService(service)}>
                        <Edit className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Service' : 'New Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., House Cleaning"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your service..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Price (R) *</label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Price Type</label>
                <Select value={form.price_type} onValueChange={(v) => setForm({ ...form, price_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hourly">Per Hour</SelectItem>
                    <SelectItem value="daily">Per Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Photos of your work</label>
              <p className="text-xs text-muted-foreground mb-2">
                Customers can browse all of these. Up to {MAX_PHOTOS}; the first one is your cover photo.
              </p>
              {(existingPhotos.length > 0 || photos.length > 0) && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {existingPhotos.map((url, i) => (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && <span className="absolute left-1 top-1 px-1.5 py-0.5 rounded-full glass-chip text-[9px] font-semibold">Cover</span>}
                      <button
                        type="button"
                        onClick={() => setExistingPhotos((p) => p.filter((u) => u !== url))}
                        className="absolute right-1 top-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs"
                        aria-label="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {photos.map((file, i) => (
                    <div key={file.name + i} className="relative aspect-square rounded-xl overflow-hidden bg-muted ring-2 ring-primary/60">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                      <span className="absolute left-1 bottom-1 px-1.5 py-0.5 rounded-full glass-chip text-[9px] font-semibold">New</span>
                      <button
                        type="button"
                        onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs"
                        aria-label="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {existingPhotos.length + photos.length < MAX_PHOTOS && (
                <Input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="rounded-full" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Active</label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : form.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
