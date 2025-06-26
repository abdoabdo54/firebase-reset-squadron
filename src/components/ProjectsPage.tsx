
import { useState } from 'react';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { Plus, Server, Trash2, Upload, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export const ProjectsPage = () => {
  const { projects, addProject, removeProject } = useEnhancedApp();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
    apiKey: '',
    serviceAccount: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, serviceAccount: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.adminEmail || !formData.apiKey || !formData.serviceAccount) {
      toast({
        title: "Error",
        description: "Please fill in all fields and upload a service account file.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse and validate the service account JSON
      const serviceAccountText = await formData.serviceAccount.text();
      const serviceAccount = JSON.parse(serviceAccountText);
      
      if (!serviceAccount.project_id || !serviceAccount.client_email) {
        throw new Error("Invalid service account file - missing required fields");
      }

      console.log('🔥 Submitting project with Firebase config:', {
        projectId: serviceAccount.project_id,
        apiKey: formData.apiKey,
        name: formData.name,
        adminEmail: formData.adminEmail
      });

      await addProject({
        name: formData.name,
        adminEmail: formData.adminEmail,
        apiKey: formData.apiKey,
        serviceAccount,
      });

      setFormData({ name: '', adminEmail: '', apiKey: '', serviceAccount: null });
      setShowAddForm(false);
      
      toast({
        title: "Success",
        description: "Firebase project added successfully!",
      });
    } catch (error) {
      console.error('❌ Error adding project:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add project. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveProject = async (id: string, name: string) => {
    try {
      await removeProject(id);
      toast({
        title: "Project Removed",
        description: `Firebase project "${name}" has been removed successfully.`,
      });
    } catch (error) {
      console.error('❌ Error removing project:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove project. Check console for details.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Firebase Projects</h1>
          <p className="text-gray-400">Manage your Firebase projects for email campaigns</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      <Alert className="bg-blue-900/20 border-blue-500/50">
        <AlertCircle className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300">
          Make sure your backend is running on port 8000. Check the console for connection status.
        </AlertDescription>
      </Alert>

      {showAddForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Add New Firebase Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-gray-300">Project Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Firebase Project"
                    className="bg-gray-700 border-gray-600 text-white"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="adminEmail" className="text-gray-300">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    placeholder="admin@example.com"
                    className="bg-gray-700 border-gray-600 text-white"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="apiKey" className="text-gray-300">Firebase Web API Key</Label>
                <Input
                  id="apiKey"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="AIzaSyA2NT9UVavk0yiWOPJIz76NX7vnfzq6_s8"
                  className="bg-gray-700 border-gray-600 text-white"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Find this in Firebase Console → Project Settings → General → Web API Key
                </p>
              </div>
              
              <div>
                <Label htmlFor="serviceAccount" className="text-gray-300">Service Account JSON</Label>
                <div className="mt-2">
                  <input
                    id="serviceAccount"
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('serviceAccount')?.click()}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    disabled={isSubmitting}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.serviceAccount ? formData.serviceAccount.name : 'Upload JSON File'}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Download from Firebase Console → Project Settings → Service Accounts → Generate New Private Key
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Project'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-500" />
                {project.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                {project.status === 'active' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {project.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                {project.status === 'loading' && <Clock className="w-4 h-4 text-yellow-500" />}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveProject(project.id, project.name)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-gray-400 text-sm">Admin Email</p>
                  <p className="text-white">{project.adminEmail}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Project ID</p>
                  <p className="text-white font-mono text-sm">
                    {project.serviceAccount?.project_id || project.id}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className={`text-sm font-medium ${
                    project.status === 'active' ? 'text-green-400' :
                    project.status === 'error' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {project.status === 'active' ? 'Connected' :
                     project.status === 'error' ? 'Connection Failed' : 'Connecting...'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Created</p>
                  <p className="text-white text-sm">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && !showAddForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <Server className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Firebase Projects</h3>
            <p className="text-gray-400 mb-6">
              Add your first Firebase project to start sending password reset emails.
            </p>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Project
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
