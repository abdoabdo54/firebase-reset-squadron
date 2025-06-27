
import { useState, useEffect } from 'react';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { Users, Upload, Trash2, Search, RefreshCw, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { UserImportModal } from './UserImportModal';

export const EnhancedUsersPage = () => {
  const { 
    projects, 
    users, 
    profiles, 
    activeProfile, 
    loadUsers, 
    deleteUser,
    bulkDeleteUsers, 
    loading 
  } = useEnhancedApp();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState<{[key: string]: boolean}>({});

  // Filter projects by active profile
  const activeProjects = projects.filter(p => 
    (!activeProfile || p.profileId === activeProfile) && p.status === 'active'
  );

  const activeProfileName = profiles.find(p => p.id === activeProfile)?.name || 'All Projects';

  // Load users for all active projects on mount and when activeProjects changes
  useEffect(() => {
    const loadAllUsers = async () => {
      console.log('Loading users for active projects:', activeProjects);
      for (const project of activeProjects) {
        if (!users[project.id] && !loadingUsers[project.id]) {
          console.log(`Loading users for project: ${project.name} (${project.id})`);
          setLoadingUsers(prev => ({ ...prev, [project.id]: true }));
          try {
            await loadUsers(project.id);
            console.log(`Successfully loaded users for project: ${project.name}`);
          } catch (error) {
            console.error(`Failed to load users for project ${project.name}:`, error);
            toast({
              title: "Failed to load users",
              description: `Could not load users for project ${project.name}. Please check your backend connection.`,
              variant: "destructive",
            });
          } finally {
            setLoadingUsers(prev => ({ ...prev, [project.id]: false }));
          }
        }
      }
    };

    if (activeProjects.length > 0) {
      loadAllUsers();
    }
  }, [activeProjects, loadUsers, users, loadingUsers, toast]);

  const handleRefreshUsers = async (projectId: string) => {
    setLoadingUsers(prev => ({ ...prev, [projectId]: true }));
    try {
      await loadUsers(projectId);
      toast({
        title: "Users Refreshed",
        description: "User list has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh users.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const handleDeleteUser = async (projectId: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteUser(projectId, userId);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to delete.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedUsers.size} selected users?`)) {
      return;
    }

    try {
      const projectIds = selectedProject ? [selectedProject] : activeProjects.map(p => p.id);
      await bulkDeleteUsers(projectIds, Array.from(selectedUsers));
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Failed to bulk delete users:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const getFilteredUsers = () => {
    const projectsToShow = selectedProject ? [selectedProject] : activeProjects.map(p => p.id);
    const allUsers = [];

    for (const projectId of projectsToShow) {
      const projectUsers = users[projectId] || [];
      const project = projects.find(p => p.id === projectId);
      
      const filteredUsers = projectUsers.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      allUsers.push(...filteredUsers.map(user => ({ ...user, projectId, projectName: project?.name })));
    }

    return allUsers;
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-gray-400">
            Profile: <span className="text-blue-400 font-medium">{activeProfileName}</span> • 
            Manage Firebase Authentication users across your projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowImportModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Users
          </Button>
          {selectedUsers.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedUsers.size})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search users by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="All projects in profile" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="" className="text-white hover:bg-gray-700">All Projects</SelectItem>
            {activeProjects.map((project) => (
              <SelectItem key={project.id} value={project.id} className="text-white hover:bg-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {project.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            if (selectedProject) {
              handleRefreshUsers(selectedProject);
            } else {
              activeProjects.forEach(p => handleRefreshUsers(p.id));
            }
          }}
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Users
        </Button>
      </div>

      {activeProjects.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Active Projects</h3>
            <p className="text-gray-400">
              Add some Firebase projects to the current profile to manage users.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Users ({filteredUsers.length})
              </span>
              <div className="flex gap-2">
                {activeProjects.map(project => {
                  const userCount = users[project.id]?.length || 0;
                  const isLoading = loadingUsers[project.id];
                  return (
                    <Badge key={project.id} className="bg-blue-500/20 text-blue-400">
                      {project.name}: {isLoading ? '...' : userCount}
                    </Badge>
                  );
                })}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.values(loadingUsers).some(loading => loading) && (
              <div className="flex items-center justify-center py-4 mb-4">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                <span className="text-gray-400">Loading users...</span>
              </div>
            )}
            
            {filteredUsers.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <div
                      key={`${user.projectId}-${user.uid}`}
                      className="flex items-center gap-4 p-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                      <Checkbox
                        checked={selectedUsers.has(user.uid)}
                        onCheckedChange={() => toggleUserSelection(user.uid)}
                        className="border-gray-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-white truncate">{user.email}</p>
                          <Badge className="bg-gray-600 text-gray-300 text-xs">
                            {user.projectName}
                          </Badge>
                        </div>
                        {user.displayName && (
                          <p className="text-sm text-gray-400">{user.displayName}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>UID: {user.uid}</span>
                          <span className={`px-2 py-1 rounded ${
                            user.emailVerified 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {user.emailVerified ? 'Verified' : 'Unverified'}
                          </span>
                          <span className={`px-2 py-1 rounded ${
                            user.disabled 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {user.disabled ? 'Disabled' : 'Active'}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.projectId, user.uid)}
                        className="shrink-0"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {Object.values(loadingUsers).some(loading => loading) ? 'Loading Users...' : 'No Users Found'}
                </h3>
                <p className="text-gray-400">
                  {searchTerm ? 'No users match your search criteria.' : 'No users found in the selected projects.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <UserImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        availableProjects={activeProjects}
      />
    </div>
  );
};
