
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Plus, Server, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export const ProjectsPage = () => {
  const { projects, addProject, removeProject } = useApp();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
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
    
    if (!formData.name || !formData.adminEmail || !formData.serviceAccount) {
      toast({
        title: "Error",
        description: "Please fill in all fields and upload a service account file.",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real app, you'd parse and validate the service account JSON
      const serviceAccountText = await formData.serviceAccount.text();
      const serviceAccount = JSON.parse(serviceAccountText);
      
      addProject({
        name: formData.name,
        adminEmail: formData.adminEmail,
        serviceAccount,
      });

      setFormData({ name: '', adminEmail: '', serviceAccount: null });
      setShowAddForm(false);
      
      toast({
        title: "Success",
        description: "Firebase project added successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid service account file format.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveProject = (id: string) => {
    removeProject(id);
    toast({
      title: "Project Removed",
      description: "Firebase project has been removed successfully.",
    });
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
                  />
                </div>
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
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('serviceAccount')?.click()}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.serviceAccount ? formData.serviceAccount.name : 'Upload JSON File'}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  Add Project
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveProject(project.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
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
                    {project.serviceAccount?.project_id || 'N/A'}
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
