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
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);
  
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
    
    setIsUsingTemplate(true);
    
    // Generate conversation from template
    const templateMessages: Message[] = [];
    const qaData = templateStory.context_qa || {};
    
    // Create a conversational flow from the template data
    const conversationFlow = [
      { question: "Hello! I'm your AI biographer. Let's start with your name. What's your name?", field: 'name' },
      { question: "Great to meet you! How old are you?", field: 'age' },
      { question: "And where are you from?", field: 'location' },
      { question: "Let's talk about your childhood. Can you tell me about your early years?", field: 'childhood' },
      { question: "What about your career? Tell me about your professional journey.", field: 'career' },
      { question: "Family is important. Can you tell me about your family?", field: 'family' },
      { question: "We all face challenges. What challenges have you overcome?", field: 'challenges' },
      { question: "What are you most proud of in your life?", field: 'proudest_moments' },
      { question: "Finally, what are your dreams and aspirations?", field: 'dreams' },
    ];

    // Add messages with delays to simulate conversation
    for (const item of conversationFlow) {
      templateMessages.push({ role: 'assistant', content: item.question });
      if (qaData[item.field]) {
        templateMessages.push({ role: 'user', content: qaData[item.field] });
      }
    }

    // Display messages with animation
    setMessages([]);
    let currentIndex = 0;
    
    const displayNextMessage = () => {
      if (currentIndex < templateMessages.length) {
        setMessages(prev => [...prev, templateMessages[currentIndex]]);
        currentIndex++;
        setTimeout(displayNextMessage, 800);
      }
    };
    
    displayNextMessage();
  };

  const useDemoBiography = async () => {
    setIsUsingTemplate(true);
    
    // Demo conversation with fake data
    const demoData = {
      name: "Alex Johnson",
      age: "45",
      location: "San Francisco, California",
      childhood: "I grew up in a small town in Oregon. My parents ran a local bookstore, which sparked my love for reading and storytelling. I spent countless hours exploring the shelves and imagining different worlds.",
      career: "I started as a software engineer right out of college, but eventually transitioned into product management. I've been fortunate to work on several innovative tech products that have impacted millions of users. Currently, I'm leading a team at a startup focused on education technology.",
      family: "I'm married to my college sweetheart, and we have two wonderful children - a 12-year-old daughter who loves art, and a 9-year-old son who's obsessed with robotics. Family game nights are our favorite tradition.",
      challenges: "The biggest challenge was when our startup nearly failed during the 2020 pandemic. We had to pivot our entire business model and let go of half the team. It was heartbreaking but taught me resilience and the importance of adaptability.",
      proudest_moments: "Launching our education app that's now used by over 500,000 students worldwide. Knowing that we're making a real difference in children's learning experiences keeps me motivated every day.",
      dreams: "I dream of writing a book about the intersection of technology and education. I also hope to start a foundation that provides coding education to underprivileged communities."
    };

    const conversationFlow = [
      { question: "Hello! I'm your AI biographer. Let's start with your name. What's your name?", field: 'name' },
      { question: "Great to meet you! How old are you?", field: 'age' },
      { question: "And where are you from?", field: 'location' },
      { question: "Let's talk about your childhood. Can you tell me about your early years?", field: 'childhood' },
      { question: "What about your career? Tell me about your professional journey.", field: 'career' },
      { question: "Family is important. Can you tell me about your family?", field: 'family' },
      { question: "We all face challenges. What challenges have you overcome?", field: 'challenges' },
      { question: "What are you most proud of in your life?", field: 'proudest_moments' },
      { question: "Finally, what are your dreams and aspirations?", field: 'dreams' },
    ];

    const demoMessages: Message[] = [];
    for (const item of conversationFlow) {
      demoMessages.push({ role: 'assistant', content: item.question });
      demoMessages.push({ role: 'user', content: demoData[item.field as keyof typeof demoData] });
    }

    // Store demo data for later use
    setConversationData(demoData);

    // Display messages with animation
    setMessages([]);
    let currentIndex = 0;
    
    const displayNextMessage = () => {
      if (currentIndex < demoMessages.length) {
        setMessages(prev => [...prev, demoMessages[currentIndex]]);
        currentIndex++;
        setTimeout(displayNextMessage, 800);
      }
    };
    
    displayNextMessage();
  };

  const proceedWithTemplate = async () => {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/studio")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          {(status === "connected" || isUsingTemplate) && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-700">
                {isUsingTemplate ? "Template Mode" : "Live Interview"}
              </span>
            </div>
          )}
        </div>

        <Card className="p-6 md:p-10 card-glass shadow-xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI Biography Interview</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 gradient-text">Your Life, Told by AI</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Have a natural conversation with your AI biographer or use your previous story as a template
            </p>
          </div>

          {status === "disconnected" && !isUsingTemplate ? (
            <div className="text-center py-12">
              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-10">
                {/* Live Interview Option */}
                <Card className="p-8 hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-primary/50 bg-gradient-to-br from-card to-card/50">
                  <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Live Voice Interview</h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    Have a natural conversation with your AI biographer. Answer questions about your life story in real-time.
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-2 mb-6 text-left">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Personal background & life events
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Career journey & achievements
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Family, relationships & values
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Dreams & aspirations
                    </li>
                  </ul>
                  <Button 
                    size="lg" 
                    onClick={startConversation}
                    className="w-full btn-glow"
                  >
                    <Mic className="mr-2 h-5 w-5" />
                    Start Interview
                  </Button>
                </Card>

                {/* Template Option */}
                <Card className="p-8 hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-secondary/50 bg-gradient-to-br from-card to-card/50">
                  <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Use Previous Biography</h3>
                  {templateStory ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                        Skip the interview and use your previous biography as a starting point. View the conversation and proceed to customization.
                      </p>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/10 mb-6">
                        <Sparkles className="h-4 w-4 text-secondary" />
                        <span className="text-xs font-medium text-secondary">Quick & Easy</span>
                      </div>
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={useTemplate}
                        disabled={isGenerating}
                        className="w-full border-2"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Use Template
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                        Complete your first biography to unlock this feature. You'll be able to reuse your previous story as a template.
                      </p>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 mb-6">
                        <span className="text-xs font-medium text-muted-foreground">Available after first biography</span>
                      </div>
                      <Button 
                        variant="outline"
                        size="lg"
                        disabled
                        className="w-full border-2"
                      >
                        <Sparkles className="mr-2 h-5 w-5" />
                        Use Template
                      </Button>
                    </>
                  )}
                </Card>

                {/* Demo Biography Option */}
                <Card className="p-8 hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-accent/50 bg-gradient-to-br from-card to-card/50">
                  <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Try Demo Biography</h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    See how it works with a sample biography. Perfect for testing the experience before creating your own story.
                  </p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 mb-6">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <span className="text-xs font-medium text-accent">Try it Free</span>
                  </div>
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={useDemoBiography}
                    disabled={isGenerating}
                    className="w-full border-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Try Demo
                      </>
                    )}
                  </Button>
                </Card>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 h-[500px] overflow-y-auto space-y-4 p-6 bg-gradient-to-b from-muted/20 to-muted/5 rounded-2xl border-2">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Waiting for conversation to begin...</p>
                    </div>
                  </div>
                )}
                {messages.filter(msg => msg).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                          : 'bg-card border-2'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {msg.role === 'assistant' && (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <p className="text-sm leading-relaxed pt-1">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {isSpeaking && !isUsingTemplate && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-card border-2 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">AI is speaking...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/20 rounded-xl border-2">
                {!isUsingTemplate ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-full transition-all ${
                        status === 'connected' ? 'bg-green-500/20 ring-4 ring-green-500/20' : 'bg-muted'
                      }`}>
                        {status === 'connected' ? (
                          <Mic className="h-6 w-6 text-green-500 animate-pulse" />
                        ) : (
                          <MicOff className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">
                          {status === 'connected' ? 'Recording...' : 'Not Recording'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {status === 'connected' ? 'Speak naturally' : 'Click start to begin'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={endConversation}
                      variant="secondary"
                      size="lg"
                      disabled={isGenerating}
                      className="shadow-md"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'End Interview & Continue'
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="p-4 rounded-full bg-secondary/20">
                        <Sparkles className="h-6 w-6 text-secondary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Template Conversation</p>
                        <p className="text-xs text-muted-foreground">Review and proceed when ready</p>
                      </div>
                    </div>
                    <Button 
                      onClick={proceedWithTemplate}
                      size="lg"
                      disabled={isGenerating || messages.length === 0}
                      className="shadow-md btn-glow"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Biography...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Continue to Settings
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BiographyChat;
