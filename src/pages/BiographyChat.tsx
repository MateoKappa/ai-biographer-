import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { AudioRecorder, encodeAudioForAPI, AudioQueue } from "@/utils/BiographyAudio";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const BiographyChat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationData, setConversationData] = useState<any[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const startConversation = async () => {
    try {
      console.log("Starting conversation...");
      
      // Request microphone permission first
      console.log("Requesting microphone permission...");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone permission granted");
      
      // Initialize audio context and queue
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      audioQueueRef.current = new AudioQueue(audioContextRef.current);
      console.log("Audio context initialized");

      // Connect to WebSocket
      const projectRef = "wczgqokhrlzbvhjpgebo";
      const wsUrl = `wss://${projectRef}.supabase.co/functions/v1/biography-chat`;
      console.log("Connecting to WebSocket:", wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        toast({
          title: "Connected",
          description: "Your biography interview is starting...",
        });
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("Received:", data.type);

        if (data.type === 'session.updated') {
          // Start recording after session is ready
          startRecording();
        } else if (data.type === 'response.audio.delta') {
          setIsSpeaking(true);
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await audioQueueRef.current?.addToQueue(bytes);
        } else if (data.type === 'response.audio.done') {
          setIsSpeaking(false);
        } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
          setMessages(prev => [...prev, { role: 'user', content: data.transcript }]);
        } else if (data.type === 'response.audio_transcript.delta') {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + data.delta }
              ];
            }
            return [...prev, { role: 'assistant', content: data.delta }];
          });
        } else if (data.type === 'response.done') {
          setConversationData(prev => [...prev, data]);
        } else if (data.type === 'error') {
          throw new Error(data.error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        toast({
          title: "Connection Error",
          description: "Failed to connect to the interview service. Please check your connection.",
          variant: "destructive",
        });
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket closed");
        setIsConnected(false);
        stopRecording();
      };

    } catch (error: any) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
    try {
      recorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const base64Audio = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio
          }));
        }
      });
      
      await recorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  };

  const endConversation = async () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    stopRecording();
    audioQueueRef.current?.clear();
    
    // Save the conversation to database
    try {
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'You' : 'Interviewer'}: ${m.content}`)
        .join('\n\n');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('stories')
        .insert({
          user_id: session.user.id,
          story_text: conversationText,
          status: 'pending',
          context_qa: conversationData
        });

      if (error) throw error;

      toast({
        title: "Interview Saved",
        description: "Your biography is being created...",
      });

      navigate('/');
    } catch (error: any) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Failed to save your interview",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
        >
          ← Back to Home
        </Button>

        <Card className="p-8 card-glass">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 gradient-text">Your Life Story</h1>
            <p className="text-muted-foreground">
              Let's have a conversation about your life and create a beautiful biography
            </p>
          </div>

          {!isConnected ? (
            <div className="text-center py-12">
              <Button 
                size="lg" 
                onClick={startConversation}
                className="btn-glow"
              >
                <Mic className="mr-2 h-5 w-5" />
                Start Biography Interview
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8 h-96 overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isSpeaking && (
                  <div className="flex justify-start">
                    <div className="bg-card p-4 rounded-lg flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Speaking...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-4">
                <div className={`p-4 rounded-full ${isRecording ? 'bg-red-500/20' : 'bg-muted'}`}>
                  {isRecording ? (
                    <MicOff className="h-8 w-8 text-red-500" />
                  ) : (
                    <Mic className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <Button 
                  onClick={endConversation}
                  variant="secondary"
                  size="lg"
                >
                  End Interview & Create Biography
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
