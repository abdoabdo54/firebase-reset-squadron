
import { useState } from 'react';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { Upload, Users, Trash2, Download, Filter, Search, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export const EnhancedUsersPage = () => {
  const { 
    projects, 
    users, 
    loadUsers, 
    importUsers, 
    bulkDeleteUsers, 
    loading,
    getDailyCount 
  } = useEnhancedApp();
  const { toast } = useToast();
  
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [emailsText, setEmailsText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);

  const handleProjectSelect = (projectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(projectId);
      // Auto-load users for selected project
      loadUsers(projectId);
    } else {
      newSelected.delete(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleImportUsers = async () => {
    const emails = emailsText
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (emails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter valid email addresses.",
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

    try {
      await importUsers(emails, Array.from(selectedProjects));
      setEmailsText('');
      setShowImportForm(false);
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${emails.length} users across ${selectedProjects.size} projects.`,
      });
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleBulkDelete = async (userIds?: string[]) => {
    if (selectedProjects.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one project.",
        variant: "destructive",
      });
      return;
    }

    const confirmMessage = userIds 
      ? `Delete ${userIds.length} selected users from ${selectedProjects.size} projects?`
      : `Delete ALL users from ${selectedProjects.size} selected projects?`;

    if (!confirm(confirmMessage)) return;

    try {
      await bulkDeleteUsers(Array.from(selectedProjects), userIds);
      
      toast({
        title: "Deletion Successful",
        description: userIds 
          ? `Deleted ${userIds.length} users from ${selectedProjects.size} projects.`
          : `Deleted all users from ${selectedProjects.size} projects.`,
      });
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const getTotalUsers = () => {
    return Object.values(users).reduce((sum, projectUsers) => sum + projectUsers.length, 0);
  };

  const getActiveUsers = () => {
    return Object.values(users).reduce((sum, projectUsers) => 
      sum + projectUsers.filter(user => !user.disabled).length, 0
    );
  };

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.adminEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Enhanced User Management</h1>
          <p className="text-gray-400">Manage users across multiple Firebase projects simultaneously</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowImportForm(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Users
          </Button>
          <Button
            onClick={() => handleBulkDelete()}
            disabled={selectedProjects.size === 0}
            variant="outline"
            className="border-red-600 text-red-400 hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-medium">Total Projects</p>
                <p className="text-3xl font-bold text-white">{projects.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-900/30 to-green-800/30 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-white">{getTotalUsers()}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-full">
                <Users className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-900/30 to-purple-800/30 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm font-medium">Active Users</p>
                <p className="text-3xl font-bold text-white">{getActiveUsers()}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-full">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-900/30 to-orange-800/30 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-300 text-sm font-medium">Selected Projects</p>
                <p className="text-3xl font-bold text-white">{selectedProjects.size}</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Filter className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Form */}
      {showImportForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Import Users to Multiple Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Email Addresses (one per line)</Label>
              <textarea
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                className="w-full h-32 mt-1 p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Select Target Projects</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedProjects.has(project.id)}
                      onCheckedChange={(checked) => handleProjectSelect(project.id, checked as boolean)}
                    />
                    <span className="text-white">{project.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleImportUsers}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {loading ? 'Importing...' : 'Import Users'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportForm(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-700 border-gray-600 text-white"
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Projects & Users</h2>
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((project) => {
            const projectUsers = users[project.id] || [];
            const activeUsers = projectUsers.filter(user => !user.disabled);
            const dailyCount = getDailyCount(project.id);
            
            return (
              <Card key={project.id} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedProjects.has(project.id)}
                        onCheckedChange={(checked) => handleProjectSelect(project.id, checked as boolean)}
                      />
                      <div>
                        <CardTitle className="text-white">{project.name}</CardTitle>
                        <p className="text-gray-400 text-sm">{project.adminEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-blue-500/20 text-blue-400">
                        {projectUsers.length} total
                      </Badge>
                      <Badge className="bg-green-500/20 text-green-400">
                        {activeUsers.length} active
                      </Badge>
                      <Badge className="bg-orange-500/20 text-orange-400">
                        {dailyCount} sent today
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                {selectedProjects.has(project.id) && (
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Users in this project</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => loadUsers(project.id)}
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Refresh
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleBulkDelete()}
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete All
                          </Button>
                        </div>
                      </div>
                      
                      {projectUsers.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {projectUsers.slice(0, 10).map((user) => (
                            <div key={user.uid} className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded">
                              <div>
                                <span className="text-white text-sm">{user.email}</span>
                                {user.displayName && (
                                  <span className="text-gray-400 text-xs ml-2">({user.displayName})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {user.emailVerified && (
                                  <Badge className="bg-green-500/20 text-green-400 text-xs">Verified</Badge>
                                )}
                                {user.disabled && (
                                  <Badge className="bg-red-500/20 text-red-400 text-xs">Disabled</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {projectUsers.length > 10 && (
                            <p className="text-gray-500 text-center text-sm">
                              ... and {projectUsers.length - 10} more users
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No users found in this project
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
