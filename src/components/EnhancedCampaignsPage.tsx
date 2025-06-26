
import { useState, useEffect } from 'react';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Users, 
  Settings, 
  Mail,
  FolderOpen,
  Rocket,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { EnhancedCampaignMonitor } from './EnhancedCampaignMonitor';

export const EnhancedCampaignsPage = () => {
  const { 
    campaigns, 
    projects, 
    profiles,
    users, 
    activeProfile,
    currentCampaign,
    createCampaign, 
    deleteCampaign, 
    startCampaign,
    startLightningCampaign,
    loadUsers,
    isLightningMode
  } = useEnhancedApp();
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<{ [projectId: string]: string[] }>({});
  const [campaignName, setCampaignName] = useState('');
  const [batchSize, setBatchSize] = useState(50);
  const [workers, setWorkers] = useState(5);
  const [loadingUsers, setLoadingUsers] = useState<{[key: string]: boolean}>({});

  // Filter projects by selected profile
  const profileProjects = selectedProfile 
    ? projects.filter(p => p.profileId === selectedProfile && p.status === 'active')
    : [];

  // Load users when projects are selected
  useEffect(() => {
    const loadProjectUsers = async () => {
      for (const projectId of selectedProjects) {
        if (!users[projectId] && !loadingUsers[projectId]) {
          setLoadingUsers(prev => ({ ...prev, [projectId]: true }));
          try {
            await loadUsers(projectId);
          } catch (error) {
            console.error(`Failed to load users for project ${projectId}:`, error);
          } finally {
            setLoadingUsers(prev => ({ ...prev, [projectId]: false }));
          }
        }
      }
    };

    if (selectedProjects.length > 0) {
      loadProjectUsers();
    }
  }, [selectedProjects, loadUsers]);

  const handleProfileChange = (profileId: string) => {
    setSelectedProfile(profileId);
    setSelectedProjects([]);
    setSelectedUsers({});
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects(prev => {
      const newSelected = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      
      // Clear selected users for removed projects
      if (!newSelected.includes(projectId)) {
        setSelectedUsers(prev => {
          const newUsers = { ...prev };
          delete newUsers[projectId];
          return newUsers;
        });
      }
      
      return newSelected;
    });
  };

  const handleUserToggle = (projectId: string, userId: string) => {
    setSelectedUsers(prev => ({
      ...prev,
      [projectId]: prev[projectId]?.includes(userId)
        ? prev[projectId].filter(id => id !== userId)
        : [...(prev[projectId] || []), userId]
    }));
  };

  const handleSelectAllUsers = (projectId: string) => {
    const projectUsers = users[projectId] || [];
    const currentSelected = selectedUsers[projectId] || [];
    
    if (currentSelected.length === projectUsers.length) {
      // Deselect all
      setSelectedUsers(prev => ({ ...prev, [projectId]: [] }));
    } else {
      // Select all
      setSelectedUsers(prev => ({ 
        ...prev, 
        [projectId]: projectUsers.map(u => u.uid) 
      }));
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast({
        title: "Error",
        description: "Campaign name is required.",
        variant: "destructive",
      });
      return;
    }

    if (selectedProjects.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one project.",
        variant: "destructive",
      });
      return;
    }

    const totalUsers = Object.values(selectedUsers).reduce((sum, userIds) => sum + userIds.length, 0);
    if (totalUsers === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCampaign({
        name: campaignName,
        projectIds: selectedProjects,
        selectedUsers,
        batchSize,
        workers,
        status: 'pending'
      });

      // Reset form
      setCampaignName('');
      setSelectedProjects([]);
      setSelectedUsers({});
      setSelectedProfile('');
      setBatchSize(50);
      setWorkers(5);
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const handleStartCampaign = async (campaignId: string, isLightning = false) => {
    try {
      if (isLightning) {
        await startLightningCampaign(campaignId);
      } else {
        await startCampaign(campaignId);
      }
    } catch (error) {
      console.error('Failed to start campaign:', error);
    }
  };

  const getTotalSelectedUsers = () => {
    return Object.values(selectedUsers).reduce((sum, userIds) => sum + userIds.length, 0);
  };

  const getCampaignStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'running':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campaign Management</h1>
          <p className="text-gray-400">Create and manage password reset campaigns across multiple projects</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Current Campaign Monitor */}
      {currentCampaign && (
        <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-500/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Active Campaign: {currentCampaign.name}
              {isLightningMode && (
                <Badge className="bg-yellow-500/20 text-yellow-400 animate-pulse">
                  ⚡ Lightning Mode
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedCampaignMonitor campaign={currentCampaign} />
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Campaigns ({campaigns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getCampaignStatusIcon(campaign.status)}
                      <div>
                        <h3 className="text-white font-semibold">{campaign.name}</h3>
                        <p className="text-gray-400 text-sm">
                          {campaign.projectIds.length} projects • 
                          {Object.values(campaign.selectedUsers).reduce((sum, users) => sum + users.length, 0)} users
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${
                        campaign.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        campaign.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                        campaign.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {campaign.status}
                      </Badge>
                      {campaign.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStartCampaign(campaign.id, false)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStartCampaign(campaign.id, true)}
                            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                          >
                            <Rocket className="w-4 h-4 mr-1" />
                            Lightning
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteCampaign(campaign.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Progress: {campaign.processed} / {Object.values(campaign.selectedUsers).reduce((sum, users) => sum + users.length, 0)}</span>
                      <span>{campaign.successful} successful • {campaign.failed} failed</span>
                    </div>
                    <Progress 
                      value={(campaign.processed / Object.values(campaign.selectedUsers).reduce((sum, users) => sum + users.length, 0)) * 100} 
                      className="h-2"
                    />
                  </div>

                  {/* Campaign Settings */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                    <span>Batch Size: {campaign.batchSize}</span>
                    <span>Workers: {campaign.workers}</span>
                    <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Campaigns Yet</h3>
              <p className="text-gray-400">Create your first campaign to start sending password reset emails.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Campaign Name */}
            <div>
              <Label htmlFor="campaignName" className="text-gray-300">Campaign Name</Label>
              <Input
                id="campaignName"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Password Reset Campaign"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {/* Profile Selection */}
            <div>
              <Label className="text-gray-300">Select Profile</Label>
              <Select value={selectedProfile} onValueChange={handleProfileChange}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choose a profile first" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id} className="text-white hover:bg-gray-600">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-blue-400" />
                        {profile.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Selection */}
            {selectedProfile && (
              <div>
                <Label className="text-gray-300">Select Projects ({selectedProjects.length} selected)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 max-h-40 overflow-y-auto border border-gray-600 rounded-lg p-3">
                  {profileProjects.map((project) => (
                    <div key={project.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={project.id}
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={() => handleProjectToggle(project.id)}
                        className="border-gray-500"
                      />
                      <Label htmlFor={project.id} className="text-white text-sm cursor-pointer">
                        {project.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Selection */}
            {selectedProjects.length > 0 && (
              <div>
                <Label className="text-gray-300">Select Users ({getTotalSelectedUsers()} selected)</Label>
                <div className="space-y-4 mt-2 max-h-60 overflow-y-auto border border-gray-600 rounded-lg p-3">
                  {selectedProjects.map((projectId) => {
                    const project = projects.find(p => p.id === projectId);
                    const projectUsers = users[projectId] || [];
                    const selectedCount = selectedUsers[projectId]?.length || 0;
                    
                    return (
                      <div key={projectId} className="bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{project?.name}</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectAllUsers(projectId)}
                            className="text-xs border-gray-500 text-gray-300 hover:bg-gray-600"
                          >
                            {selectedCount === projectUsers.length ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                          {selectedCount} of {projectUsers.length} users selected
                        </div>
                        
                        {loadingUsers[projectId] ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                            <span className="text-gray-400">Loading users...</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                            {projectUsers.map((user) => (
                              <div key={user.uid} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${projectId}-${user.uid}`}
                                  checked={selectedUsers[projectId]?.includes(user.uid) || false}
                                  onCheckedChange={() => handleUserToggle(projectId, user.uid)}
                                  className="border-gray-500"
                                />
                                <Label 
                                  htmlFor={`${projectId}-${user.uid}`} 
                                  className="text-white text-sm cursor-pointer truncate"
                                >
                                  {user.email}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Campaign Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batchSize" className="text-gray-300">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  min="1"
                  max="100"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="workers" className="text-gray-300">Workers</Label>
                <Input
                  id="workers"
                  type="number"
                  value={workers}
                  onChange={(e) => setWorkers(Number(e.target.value))}
                  min="1"
                  max="20"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleCreateCampaign}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                Create Campaign
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
