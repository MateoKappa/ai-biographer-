import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { useConversation } from "@11labs/react";

interface ConversationData {
  name?: string;
  age?: string;
  location?: string;
  childhood?: string;
  career?: string;
  family?: string;
  challenges?: string;
  proudest_moments?: string;
  dreams?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const BiographyChat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversationData, setConversationData] = useState<ConversationData>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateStory, setTemplateStory] = useState<any>(null);
  
  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs");
      toast({
        title: "Connected",
        description: "Your biography interview is starting...",
      });
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs");
    },
    onMessage: (message) => {
      console.log("Message received:", message);
      
      if (message.source === 'user') {
        setMessages(prev => [...prev, { role: 'user', content: message.message }]);
      } else if (message.source === 'ai') {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant') {
            return [...prev.slice(0, -1), { role: 'assistant', content: lastMsg.content + message.message }];
          }
          return [...prev, { role: 'assistant', content: message.message }];
        });
      }
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      toast({
        title: "Error",
        description: "Failed to connect. Please try again.",
        variant: "destructive",
      });
    },
    clientTools: {
      storeUserInfo: (parameters: { field: string; value: string }) => {
        console.log("Storing user info:", parameters);
        setConversationData(prev => ({
          ...prev,
          [parameters.field]: parameters.value
        }));
        return "Information stored successfully";
      }
    }
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      // Load most recent completed story as template
      const { data: stories } = await supabase
        .from('stories')
        .select('*')
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (stories && stories.length > 0) {
        setTemplateStory(stories[0]);
      }
    };
    checkAuth();
  }, [navigate]);

  const startConversation = async () => {
    try {
      console.log("Starting conversation...");
      
      // Get signed URL from our edge function
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-signed-url', {
        body: { agentId: 'agent_7101k86b0qb0eftb3sqg79xcmntw' }
      });

      if (error) throw error;
      if (!data?.signed_url) throw new Error('No signed URL received');

      console.log("Starting session with signed URL");
      await conversation.startSession({ signedUrl: data.signed_url });
      
    } catch (error: any) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const endConversation = async () => {
    await conversation.endSession();
    
    // Save conversation and generate biography
    setIsGenerating(true);
    try {
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'You' : 'Interviewer'}: ${m.content}`)
        .join('\n\n');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: newStory, error } = await supabase
        .from('stories')
        .insert([{
          user_id: session.user.id,
          story_text: conversationText,
          status: 'draft',
          context_qa: conversationData as any,
          temperature: 0.7,
          desired_panels: 3
        }])
        .select()
        .single();

      if (error) throw error;
      if (!newStory) throw new Error("Failed to create story");

      toast({
        title: "Interview Complete!",
        description: "Now let's configure your biography...",
      });

      // Navigate to settings page instead
      navigate(`/biography-settings/${newStory.id}`);
    } catch (error: any) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Failed to save your interview",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const useTemplate = async () => {
    if (!templateStory) return;
    
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: newStory, error } = await supabase
        .from('stories')
        .insert([{
          user_id: session.user.id,
          story_text: templateStory.story_text,
          status: 'draft',
          context_qa: templateStory.context_qa,
          temperature: 0.7,
          desired_panels: 3
        }])
        .select()
        .single();

      if (error) throw error;
      if (!newStory) throw new Error("Failed to create story");

      toast({
        title: "Template Loaded!",
        description: "Using your previous biography as template",
      });

      navigate(`/biography-settings/${newStory.id}`);
    } catch (error: any) {
      console.error("Error using template:", error);
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const { status, isSpeaking } = conversation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="p-8 card-glass">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 gradient-text">Your Life, Told by AI</h1>
            <p className="text-muted-foreground text-lg">
              Have a chat with your AI biographer and get your story beautifully written
            </p>
          </div>

          {status === "disconnected" ? (
            <div className="text-center py-12">
              <div className="mb-8">
                <p className="text-muted-foreground mb-4">
                  Click the button below to begin your voice interview. Your AI biographer will ask you about:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto text-left">
                  <li>✓ Your name, age, and where you're from</li>
                  <li>✓ Important life events and milestones</li>
                  <li>✓ Memorable moments and experiences</li>
                  <li>✓ Family, relationships, and values</li>
                  <li>✓ Career, achievements, and challenges</li>
                  <li>✓ Dreams and aspirations for the future</li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-4 items-center">
                <Button 
                  size="lg" 
                  onClick={startConversation}
                  className="btn-glow"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Start Biography Interview
                </Button>
                
                {templateStory && (
                  <div className="pt-4 border-t w-full max-w-md">
                    <p className="text-sm text-muted-foreground mb-3">
                      Or skip the interview and use your previous biography:
                    </p>
                    <Button 
                      variant="outline"
                      onClick={useTemplate}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading Template...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Use Previous Biography as Template
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 h-96 overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Waiting for conversation to begin...</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isSpeaking && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-card border p-4 rounded-2xl flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">AI is speaking...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-6">
                <div className={`p-6 rounded-full transition-all ${
                  status === 'connected' ? 'bg-green-500/20 ring-4 ring-green-500/20' : 'bg-muted'
                }`}>
                  {status === 'connected' ? (
                    <Mic className="h-8 w-8 text-green-500 animate-pulse" />
                  ) : (
                    <MicOff className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <Button 
                  onClick={endConversation}
                  variant="secondary"
                  size="lg"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Biography...
                    </>
                  ) : (
                    'End Interview & Create Biography'
                  )}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BiographyChat;
