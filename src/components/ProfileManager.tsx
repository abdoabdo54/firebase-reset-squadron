
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Download, Upload, Users, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Profile, localStorageService } from '@/services/LocalStorageService';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { CampaignManager } from './CampaignManager';

export const ProfileManager = () => {
  const { toast } = useToast();
  const { 
    profiles, 
    projects, 
    activeProfile, 
    setActiveProfile, 
    addProfile, 
    removeProfile,
    updateProfile
  } = useEnhancedApp();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // Count projects per profile
  const getProjectCount = (profileId: string) => {
    return projects.filter(p => p.profileId === profileId).length;
  };

  const handleCreateProfile = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Profile name is required.",
        variant: "destructive",
      });
      return;
    }

    addProfile({
      name: formData.name,
      description: formData.description,
      projectIds: [],
    });

    setFormData({ name: '', description: '' });
    setShowCreateDialog(false);
    
    toast({
      title: "Profile Created",
      description: `Profile "${formData.name}" has been created successfully.`,
    });
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({ name: profile.name, description: profile.description || '' });
  };

  const handleUpdateProfile = () => {
    if (!editingProfile || !formData.name.trim()) {
      toast({
        title: "Error",
        description: "Profile name is required.",
        variant: "destructive",
      });
      return;
    }

    updateProfile(editingProfile.id, {
      name: formData.name,
      description: formData.description,
    });

    setEditingProfile(null);
    setFormData({ name: '', description: '' });
    
    toast({
      title: "Profile Updated",
      description: `Profile "${formData.name}" has been updated successfully.`,
    });
  };

  const handleDeleteProfile = (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile? All associated projects will be moved to "No Profile".')) {
      return;
    }

    removeProfile(profileId);
    
    toast({
      title: "Profile Deleted",
      description: "Profile has been deleted successfully.",
    });
  };

  const handleExportData = () => {
    localStorageService.exportData();
    toast({
      title: "Data Exported",
      description: "Your data has been downloaded as a JSON file.",
    });
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await localStorageService.importData(file);
      
      toast({
        title: "Data Imported",
        description: "Your data has been imported successfully. Please refresh the page.",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import data. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Profile Management</h1>
          <p className="text-gray-400">Organize your Firebase projects into profiles for better management</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".json"
            onChange={handleImportData}
            className="hidden"
            id="import-data"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('import-data')?.click()}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleExportData}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Profile
          </Button>
        </div>
      </div>

      {profiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <Card 
              key={profile.id} 
              className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl ${
                activeProfile === profile.id 
                  ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/50 shadow-lg' 
                  : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
              }`}
              onClick={() => setActiveProfile(profile.id)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-500" />
                  {profile.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProfile(profile);
                    }}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProfile(profile.id);
                    }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-400 text-sm">{profile.description || 'No description'}</p>
                
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-500/20 text-blue-400 flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    {getProjectCount(profile.id)} projects
                  </Badge>
                  {activeProfile === profile.id && (
                    <Badge className="bg-green-500/20 text-green-400">
                      Active
                    </Badge>
                  )}
                </div>
                
                <p className="text-gray-500 text-xs">
                  Created: {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Profiles Found</h3>
            <p className="text-gray-400 mb-6">
              Create your first profile to organize your Firebase projects.
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Campaign Management Section */}
      <CampaignManager />

      {/* Create Profile Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="profileName" className="text-gray-300">Profile Name</Label>
              <Input
                id="profileName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Production Environment"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="profileDescription" className="text-gray-300">Description (Optional)</Label>
              <Input
                id="profileDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Main production Firebase projects"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateProfile}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                Create Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editProfileName" className="text-gray-300">Profile Name</Label>
              <Input
                id="editProfileName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Production Environment"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="editProfileDescription" className="text-gray-300">Description (Optional)</Label>
              <Input
                id="editProfileDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Main production Firebase projects"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateProfile}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                Update Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingProfile(null)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
