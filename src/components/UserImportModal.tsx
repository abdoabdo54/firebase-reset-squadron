
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Upload, Download, FileText, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface UserImportModalProps {
  projectId: string;
  onClose: () => void;
}

export const UserImportModal: React.FC<UserImportModalProps> = ({ projectId, onClose }) => {
  const { importUsers, projects } = useApp();
  const { toast } = useToast();
  const [emails, setEmails] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const project = projects.find(p => p.id === projectId);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setEmails(content);
    };
    reader.readAsText(file);
  };

  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'))
      .filter((email, index, arr) => arr.indexOf(email) === index); // Remove duplicates
  };

  const handleImport = async () => {
    const emailList = parseEmails(emails);
    
    if (emailList.length === 0) {
      toast({
        title: "No valid emails found",
        description: "Please enter valid email addresses.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const imported = await importUsers(projectId, emailList);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${imported} out of ${emailList.length} users.`,
      });
      
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const emailList = parseEmails(emails);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Users to {project?.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-gray-300">Upload CSV/TXT File</Label>
            <div className="mt-2">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Or paste email addresses</Label>
            <p className="text-gray-500 text-sm mb-2">
              One email per line, or separated by commas/semicolons
            </p>
            <Textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
              rows={8}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {emailList.length > 0 && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-green-500" />
                <span className="text-white font-medium">
                  {emailList.length} valid emails found
                </span>
              </div>
              <div className="text-gray-400 text-sm max-h-32 overflow-y-auto">
                {emailList.slice(0, 10).map((email, index) => (
                  <div key={index}>{email}</div>
                ))}
                {emailList.length > 10 && (
                  <div className="text-gray-500">... and {emailList.length - 10} more</div>
                )}
              </div>
            </div>
          )}

          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Importing users...</span>
                <span className="text-white">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
              <div className="text-blue-300 text-sm">
                <p className="font-medium mb-1">Import Notes:</p>
                <ul className="text-xs space-y-1">
                  <li>• Duplicate emails will be automatically removed</li>
                  <li>• Users will be imported in batches of 100</li>
                  <li>• Invalid email formats will be skipped</li>
                  <li>• Import may take several minutes for large lists</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={emailList.length === 0 || isImporting}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {isImporting ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import {emailList.length} Users
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isImporting}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
