
import { useState, useEffect } from 'react';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { Search, Users, RefreshCw, CheckSquare, Square, Upload, Trash2, Download, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { UserImportModal } from './UserImportModal';
import { useToast } from '@/hooks/use-toast';

export const EnhancedUsersPage = () => {
  const { 
    projects, 
    users, 
    loadUsers, 
    bulkDeleteUsers, 
    importUsers, 
    deleteUser,
    profiles,
    activeProfile 
  } = useEnhancedApp();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter projects by active profile
  const activeProjects = projects.filter(p => 
    !activeProfile || p.profileId === activeProfile
  );

  const currentUsers = selectedProject ? users[selectedProject] || [] : [];
  const filteredUsers = currentUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLoadUsers = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      await loadUsers(selectedProject);
      const loadedUsers = users[selectedProject] || [];
      toast({
        title: "Users loaded",
        description: `Successfully loaded ${loadedUsers.length} users.`,
      });
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: "Failed to load users",
        description: "Please check your project configuration and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (!selectedProject) return;
    
    const userCount = selectedUsers.size > 0 ? selectedUsers.size : currentUsers.length;
    if (userCount === 0) return;

    const confirmMessage = selectedUsers.size > 0 
      ? `Are you sure you want to delete ${selectedUsers.size} selected users?`
      : `Are you sure you want to delete ALL ${currentUsers.length} users?`;

    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const userIds = selectedUsers.size > 0 ? Array.from(selectedUsers) : undefined;
      await bulkDeleteUsers([selectedProject], userIds);
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Failed to delete users:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingleUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteUser(selectedProject, userId);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.uid)));
    }
  };

  const handleUserSelect = (uid: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(uid);
    } else {
      newSelected.delete(uid);
    }
    setSelectedUsers(newSelected);
  };

  const exportUsers = () => {
    if (currentUsers.length === 0) return;
    
    const csvContent = [
      'Email,Display Name,Email Verified,Disabled,Created At',
      ...currentUsers.map(user => 
        `${user.email},${user.displayName || ''},${user.emailVerified},${user.disabled},${user.createdAt || ''}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${selectedProject}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setSelectedUsers(new Set());
    setSearchTerm('');
  }, [selectedProject]);

  const selectedProject_obj = activeProjects.find(p => p.id === selectedProject);
  const activeProfileName = profiles.find(p => p.id === activeProfile)?.name || 'All Projects';

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Enhanced User Management</h1>
        <p className="text-gray-400">
          Profile: <span className="text-blue-400 font-medium">{activeProfileName}</span> • 
          Load, import, and manage users from your Firebase projects
        </p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Project Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select a Firebase project from current profile" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {activeProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-white hover:bg-gray-600">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          project.status === 'active' ? 'bg-green-500' :
                          project.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleLoadUsers}
              disabled={!selectedProject || loading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Load Users
            </Button>
          </div>
          
          {selectedProject && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowImportModal(true)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Users
              </Button>
              <Button
                onClick={exportUsers}
                disabled={currentUsers.length === 0}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={handleBulkDeleteUsers}
                disabled={currentUsers.length === 0 || isDeleting}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {selectedUsers.size > 0 ? `Delete Selected (${selectedUsers.size})` : 'Delete All'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProject && currentUsers.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Users ({filteredUsers.length})
                {selectedProject_obj?.status === 'active' && (
                  <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm">
                  {selectedUsers.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {selectedUsers.size === filteredUsers.length ? (
                    <CheckSquare className="w-4 h-4 mr-2" />
                  ) : (
                    <Square className="w-4 h-4 mr-2" />
                  )}
                  {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedUsers.has(user.uid)}
                      onCheckedChange={(checked) => handleUserSelect(user.uid, checked as boolean)}
                    />
                    <div>
                      <h4 className="text-white font-medium">{user.email}</h4>
                      {user.displayName && (
                        <p className="text-gray-400 text-sm">{user.displayName}</p>
                      )}
                      {user.createdAt && (
                        <p className="text-gray-500 text-xs">
                          Created: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      {user.emailVerified ? (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                          Unverified
                        </Badge>
                      )}
                      {user.disabled && (
                        <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSingleUser(user.uid)}
                      className="border-red-600 text-red-400 hover:bg-red-900/20"
                    >
                      <UserX className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProject && currentUsers.length === 0 && !loading && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Users Found</h3>
            <p className="text-gray-400 mb-6">
              Load users from Firebase or import them to get started.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={handleLoadUsers}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Load from Firebase
              </Button>
              <Button
                onClick={() => setShowImportModal(true)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Users
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedProject && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Select a Project</h3>
            <p className="text-gray-400">
              Choose a Firebase project from the current profile to load and manage its users.
            </p>
          </CardContent>
        </Card>
      )}

      {showImportModal && selectedProject && (
        <UserImportModal
          projectId={selectedProject}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};
