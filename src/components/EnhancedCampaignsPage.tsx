import { useState } from 'react';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { Send, Play, Users, Settings, Activity, Pause, Edit, Trash2, Plus, BarChart3, Zap, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { EnhancedCampaignMonitor } from './EnhancedCampaignMonitor';

export const EnhancedCampaignsPage = () => {
  const { 
    projects, 
    users, 
    campaigns, 
    currentCampaign, 
    createCampaign, 
    updateCampaign, 
    deleteCampaign, 
    startCampaign,
    startLightningCampaign,
    isLightningMode,
    getDailyCount,
    profiles,
    activeProfile,
    setActiveProfile
  } = useEnhancedApp();
  const { toast } = useToast();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<{ [projectId: string]: Set<string> }>({});
  const [campaignName, setCampaignName] = useState('');
  const [workers, setWorkers] = useState(10);
  const [batchSize, setBatchSize] = useState(100);
  const [template, setTemplate] = useState('');

  // Filter projects by selected profile for campaign creation
  const availableProjects = selectedProfile 
    ? projects.filter(p => p.profileId === selectedProfile && p.status === 'active')
    : projects.filter(p => p.status === 'active');

  const resetForm = () => {
    setSelectedProfile('');
    setSelectedProjects(new Set());
    setSelectedUsers({});
    setCampaignName('');
    setWorkers(10);
    setBatchSize(100);
    setTemplate('');
    setEditingCampaign(null);
  };

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfile(profileId);
    setSelectedProjects(new Set());
    setSelectedUsers({});
  };

  const handleProjectSelect = (projectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(projectId);
      if (!selectedUsers[projectId]) {
        setSelectedUsers(prev => ({ ...prev, [projectId]: new Set() }));
      }
    } else {
      newSelected.delete(projectId);
      setSelectedUsers(prev => {
        const newUsers = { ...prev };
        delete newUsers[projectId];
        return newUsers;
      });
    }
    setSelectedProjects(newSelected);
  };

  const handleUserSelect = (projectId: string, userId: string, checked: boolean) => {
    setSelectedUsers(prev => {
      const projectUsers = new Set(prev[projectId] || []);
      if (checked) {
        projectUsers.add(userId);
      } else {
        projectUsers.delete(userId);
      }
      return { ...prev, [projectId]: projectUsers };
    });
  };

  const handleSelectAllUsers = (projectId: string) => {
    const projectUsers = users[projectId] || [];
    const currentSelected = selectedUsers[projectId] || new Set();
    
    setSelectedUsers(prev => ({
      ...prev,
      [projectId]: currentSelected.size === projectUsers.length 
        ? new Set() 
        : new Set(projectUsers.filter(u => !u.disabled).map(u => u.uid))
    }));
  };

  const handleCreateCampaign = async () => {
    const totalUsers = Object.values(selectedUsers).reduce((sum, userSet) => sum + userSet.size, 0);
    
    if (!campaignName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a campaign name.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedProjects.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one project.",
        variant: "destructive",
      });
      return;
    }

    if (totalUsers === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user.",
        variant: "destructive",
      });
      return;
    }

    const campaignData = {
      name: campaignName,
      projectIds: Array.from(selectedProjects),
      selectedUsers: Object.fromEntries(
        Object.entries(selectedUsers).map(([projectId, userSet]) => [
          projectId,
          Array.from(userSet)
        ])
      ),
      workers,
      batchSize,
      template,
    };

    try {
      await createCampaign(campaignData);
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const handleUpdateCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const updates = {
      name: campaignName || campaign.name,
      batchSize: batchSize || campaign.batchSize,
      workers: workers || campaign.workers,
      template: template || campaign.template,
    };

    try {
      await updateCampaign(campaignId, updates);
      setEditingCampaign(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update campaign:', error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      try {
        await deleteCampaign(campaignId);
      } catch (error) {
        console.error('Failed to delete campaign:', error);
      }
    }
  };

  const handleStartCampaign = async (campaignId: string) => {
    try {
      await startCampaign(campaignId);
    } catch (error) {
      console.error('Failed to start campaign:', error);
    }
  };

  const handleLightningCampaign = async (campaignId: string) => {
    try {
      await startLightningCampaign(campaignId);
    } catch (error) {
      console.error('Failed to start lightning campaign:', error);
    }
  };

  const loadCampaignForEdit = (campaign: any) => {
    setCampaignName(campaign.name);
    setWorkers(campaign.workers);
    setBatchSize(campaign.batchSize);
    setTemplate(campaign.template || '');
    setSelectedProjects(new Set(campaign.projectIds));
    
    const usersMap: { [projectId: string]: Set<string> } = {};
    Object.entries(campaign.selectedUsers).forEach(([projectId, userIds]) => {
      usersMap[projectId] = new Set(userIds as string[]);
    });
    setSelectedUsers(usersMap);
    
    setEditingCampaign(campaign.id);
    setShowCreateForm(true);
  };

  const getActiveUsers = (projectId: string) => {
    return (users[projectId] || []).filter(user => !user.disabled);
  };

  const getTotalSelectedUsers = () => {
    return Object.values(selectedUsers).reduce((sum, userSet) => sum + userSet.size, 0);
  };

  const getEstimatedDuration = () => {
    const totalUsers = getTotalSelectedUsers();
    const estimatedMs = totalUsers * 150; // 150ms per email
    return Math.ceil(estimatedMs / 1000 / 60); // Convert to minutes
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Enhanced Campaigns</h1>
          <p className="text-gray-400">Create and monitor multi-project password reset campaigns</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          disabled={currentCampaign?.status === 'running'}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Campaign Monitor */}
      {currentCampaign && (currentCampaign.status === 'running' || currentCampaign.status === 'paused') && (
        <EnhancedCampaignMonitor />
      )}

      {/* Create/Edit Campaign Form */}
      {showCreateForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Campaign Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Campaign Name</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Template (Optional)</Label>
                <Input
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Custom email template"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            {/* Profile Selection */}
            <div>
              <Label className="text-gray-300">Select Profile</Label>
              <Select value={selectedProfile} onValueChange={handleProfileSelect}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choose a profile to filter projects" />
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

            {/* Advanced Settings */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-300">Workers</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={workers}
                  onChange={(e) => setWorkers(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-gray-500 text-xs mt-1">Parallel threads (1-50)</p>
              </div>
              <div>
                <Label className="text-gray-300">Batch Size</Label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-gray-500 text-xs mt-1">Users per batch (1-500)</p>
              </div>
              <div>
                <Label className="text-gray-300">Selected Users</Label>
                <div className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2">
                  <span className="text-white font-medium">{getTotalSelectedUsers()}</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">Total across all projects</p>
              </div>
              <div>
                <Label className="text-gray-300">Est. Duration</Label>
                <div className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2">
                  <span className="text-white">~{getEstimatedDuration()} min</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">Parallel execution</p>
              </div>
            </div>

            {/* Project & User Selection */}
            {selectedProfile && (
              <div>
                <Label className="text-gray-300 text-lg font-semibold">Select Projects & Users</Label>
                <p className="text-gray-500 text-sm mb-4">
                  Projects from profile: <span className="text-blue-400">{profiles.find(p => p.id === selectedProfile)?.name}</span>
                </p>
                <div className="space-y-4">
                  {availableProjects.map((project) => {
                    const activeUsers = getActiveUsers(project.id);
                    const selectedCount = selectedUsers[project.id]?.size || 0;
                    const dailyCount = getDailyCount(project.id);
                    
                    return (
                      <Card key={project.id} className="bg-gray-700 border-gray-600">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedProjects.has(project.id)}
                                onCheckedChange={(checked) => handleProjectSelect(project.id, checked as boolean)}
                              />
                              <div>
                                <h4 className="text-white font-medium">{project.name}</h4>
                                <p className="text-gray-400 text-sm">{project.adminEmail}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-white text-sm font-medium">
                                {activeUsers.length} active users
                              </p>
                              <p className="text-blue-400 text-xs">
                                {dailyCount} sent today
                              </p>
                              {selectedCount > 0 && (
                                <p className="text-green-400 text-xs">
                                  {selectedCount} selected
                                </p>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        {selectedProjects.has(project.id) && activeUsers.length > 0 && (
                          <CardContent className="pt-0">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-gray-300 text-sm">
                                Available Users ({activeUsers.length})
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectAllUsers(project.id)}
                                className="border-gray-600 text-gray-300 hover:bg-gray-600"
                              >
                                {selectedCount === activeUsers.length ? 'Deselect All' : 'Select All'}
                              </Button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {activeUsers.slice(0, 50).map((user) => (
                                <div key={user.uid} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedUsers[project.id]?.has(user.uid) || false}
                                    onCheckedChange={(checked) => handleUserSelect(project.id, user.uid, checked as boolean)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-white text-sm truncate block">{user.email}</span>
                                    {user.displayName && (
                                      <span className="text-gray-400 text-xs">{user.displayName}</span>
                                    )}
                                  </div>
                                  {user.emailVerified && (
                                    <span className="text-green-400 text-xs">✓</span>
                                  )}
                                </div>
                              ))}
                              {activeUsers.length > 50 && (
                                <p className="text-gray-500 text-xs text-center py-2">
                                  ... and {activeUsers.length - 50} more users
                                </p>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={editingCampaign ? () => handleUpdateCampaign(editingCampaign) : handleCreateCampaign}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Campaign Management</h2>
        {campaigns.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <Send className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Campaigns Yet</h3>
              <p className="text-gray-400">
                Create your first multi-project campaign to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map((campaign) => {
              const totalUsers = Object.values(campaign.selectedUsers).reduce((sum, users) => sum + users.length, 0);
              const progressPercentage = totalUsers > 0 ? (campaign.processed / totalUsers) * 100 : 0;
              
              return (
                <Card key={campaign.id} className="bg-gray-800 border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-white text-lg">{campaign.name}</CardTitle>
                      <p className="text-gray-400 text-sm">
                        {campaign.projectIds.length} projects • {totalUsers} users
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={`${
                        campaign.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                        campaign.status === 'running' ? 'bg-orange-500/20 text-orange-500' :
                        campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-500' :
                        campaign.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Progress Bar */}
                    {campaign.status !== 'pending' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white">{campaign.processed} / {totalUsers}</span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-green-400">{campaign.successful} successful</span>
                          <span className="text-red-400">{campaign.failed} failed</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {campaign.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStartCampaign(campaign.id)}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleLightningCampaign(campaign.id)}
                            disabled={isLightningMode}
                            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            Lightning⚡
                          </Button>
                        </>
                      )}
                      {campaign.status !== 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="border-red-600 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-3">
                      Created: {new Date(campaign.createdAt).toLocaleString()}
                      {campaign.completedAt && (
                        <span> • Completed: {new Date(campaign.completedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
