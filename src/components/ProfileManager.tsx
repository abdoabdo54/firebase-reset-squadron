
import { useState } from 'react';
import { Plus, Edit, Trash2, Download, Upload, Users, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Profile, localStorageService } from '@/services/LocalStorageService';

interface ProfileManagerProps {
  profiles: Profile[];
  activeProfile?: string;
  onProfileChange: (profileId: string) => void;
  onProfilesUpdate: (profiles: Profile[]) => void;
  projectCounts: { [profileId: string]: number };
}

export const ProfileManager = ({ 
  profiles, 
  activeProfile, 
  onProfileChange, 
  onProfilesUpdate,
  projectCounts 
}: ProfileManagerProps) => {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleCreateProfile = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Profile name is required.",
        variant: "destructive",
      });
      return;
    }

    const newProfile: Profile = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      createdAt: new Date().toISOString(),
      projectIds: [],
    };

    const updatedProfiles = [...profiles, newProfile];
    onProfilesUpdate(updatedProfiles);
    
    // Save to localStorage
    const data = localStorageService.loadData();
    data.profiles = updatedProfiles;
    localStorageService.saveData(data);

    setFormData({ name: '', description: '' });
    setShowCreateDialog(false);
    
    toast({
      title: "Profile Created",
      description: `Profile "${newProfile.name}" has been created successfully.`,
    });
  };

  const handleDeleteProfile = (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile? All associated projects will be moved to "No Profile".')) {
      return;
    }

    const updatedProfiles = profiles.filter(p => p.id !== profileId);
    onProfilesUpdate(updatedProfiles);
    
    // Save to localStorage
    const data = localStorageService.loadData();
    data.profiles = updatedProfiles;
    // Remove profile association from projects
    data.projects = data.projects.map(p => 
      p.profileId === profileId ? { ...p, profileId: undefined } : p
    );
    localStorageService.saveData(data);

    if (activeProfile === profileId && updatedProfiles.length > 0) {
      onProfileChange(updatedProfiles[0].id);
    }

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
      onProfilesUpdate(data.profiles);
      
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Profile Management</h2>
          <p className="text-gray-400">Organize your Firebase projects into profiles</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <Card 
            key={profile.id} 
            className={`cursor-pointer transition-all ${
              activeProfile === profile.id 
                ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/50' 
                : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
            }`}
            onClick={() => onProfileChange(profile.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-500" />
                {profile.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-400">
                  {projectCounts[profile.id] || 0} projects
                </Badge>
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
            <CardContent>
              <p className="text-gray-400 text-sm">{profile.description || 'No description'}</p>
              <p className="text-gray-500 text-xs mt-2">
                Created: {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
};
