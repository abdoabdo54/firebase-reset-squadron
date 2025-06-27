
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Zap, Key, Sparkles, Mail, Type } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AIManagement = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai-api-key') || '');
  const [generationType, setGenerationType] = useState<'from' | 'subject' | 'template'>('from');
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key.",
        variant: "destructive",
      });
      return;
    }
    
    localStorage.setItem('ai-api-key', apiKey);
    toast({
      title: "API Key Saved",
      description: "Your AI API key has been saved successfully.",
    });
  };

  const generateContent = async () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your AI API key first.",
        variant: "destructive",
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a prompt for content generation.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const systemPrompts = {
        from: "Generate a professional 'From' name for an email. Return only the name, no quotes or extra text.",
        subject: "Generate a compelling email subject line. Return only the subject line, no quotes or extra text.",
        template: "Generate a professional HTML email template. Include proper HTML structure with inline CSS for styling."
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: systemPrompts[generationType]
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: generationType === 'template' ? 2000 : 100,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      setGeneratedContent(data.choices[0].message.content);
      
      toast({
        title: "Content Generated",
        description: `${generationType.charAt(0).toUpperCase() + generationType.slice(1)} content generated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast({
      title: "Copied",
      description: "Content copied to clipboard.",
    });
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Content Generation</h1>
        <p className="text-gray-400">Generate custom email content using AI</p>
      </div>

      {/* API Key Management */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="w-5 h-5" />
            AI API Key Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="apiKey" className="text-gray-300">OpenAI API Key</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Button onClick={saveApiKey} className="bg-blue-600 hover:bg-blue-700">
                Save
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>
          {apiKey && (
            <Badge className="bg-green-500/20 text-green-400">
              API Key Configured
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Content Generation */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Generate Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Content Type</Label>
            <Select value={generationType} onValueChange={(value: 'from' | 'subject' | 'template') => setGenerationType(value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="from" className="text-white hover:bg-gray-600">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    From Name
                  </div>
                </SelectItem>
                <SelectItem value="subject" className="text-white hover:bg-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Subject Line
                  </div>
                </SelectItem>
                <SelectItem value="template" className="text-white hover:bg-gray-600">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    HTML Template
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="prompt" className="text-gray-300">Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe what you want for your ${generationType}...`}
              rows={3}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <Button
            onClick={generateContent}
            disabled={isGenerating || !apiKey}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate {generationType.charAt(0).toUpperCase() + generationType.slice(1)}
              </>
            )}
          </Button>

          {generatedContent && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-gray-300">Generated Content</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Copy
                </Button>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                {generationType === 'template' ? (
                  <pre className="text-white text-sm whitespace-pre-wrap overflow-x-auto">
                    {generatedContent}
                  </pre>
                ) : (
                  <p className="text-white">{generatedContent}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
