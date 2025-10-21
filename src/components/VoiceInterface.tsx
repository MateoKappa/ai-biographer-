import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const VoiceInterface = () => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = document.createElement("audio");
    audioRef.current.autoplay = true;
    
    return () => {
      cleanup();
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cleanup = () => {
    dcRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
  };

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      console.log('Getting ephemeral token...');
      
      // Get ephemeral token from our edge function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-realtime-token', {
        body: {}
      });
      
      console.log('Token response:', { tokenData, tokenError });
      
      if (tokenError) {
        console.error('Token error:', tokenError);
        throw new Error(tokenError.message || 'Failed to get authentication token');
      }

      if (!tokenData?.client_secret?.value) {
        throw new Error("Failed to get ephemeral token");
      }

      const EPHEMERAL_KEY = tokenData.client_secret.value;
      console.log('Got ephemeral token, creating peer connection...');

      // Create peer connection
      pcRef.current = new RTCPeerConnection();

      // Set up remote audio
      pcRef.current.ontrack = (e) => {
        console.log('Received remote track');
        if (audioRef.current) {
          audioRef.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track
      console.log('Requesting microphone access...');
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      pcRef.current.addTrack(streamRef.current.getTracks()[0]);

      // Set up data channel
      dcRef.current = pcRef.current.createDataChannel("oai-events");
      
      dcRef.current.addEventListener("open", () => {
        console.log("Data channel opened");
        setIsConnected(true);
        setIsConnecting(false);
        toast.success("Voice conversation started!");
      });

      dcRef.current.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          console.log("Received event:", event.type);
          
          if (event.type === 'response.audio.delta') {
            setIsSpeaking(true);
          } else if (event.type === 'response.audio.done') {
            setIsSpeaking(false);
          } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
            setMessages(prev => [...prev, { role: 'user', content: event.transcript }]);
          } else if (event.type === 'response.audio_transcript.delta') {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return [...prev.slice(0, -1), { role: 'assistant', content: last.content + event.delta }];
              }
              return [...prev, { role: 'assistant', content: event.delta }];
            });
          } else if (event.type === 'error') {
            console.error('OpenAI error:', event);
            toast.error('AI error: ' + (event.error?.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      dcRef.current.addEventListener("error", (e) => {
        console.error("Data channel error:", e);
        toast.error("Connection error");
      });

      dcRef.current.addEventListener("close", () => {
        console.log("Data channel closed");
        setIsConnected(false);
        setIsSpeaking(false);
      });

      // Create and set local description
      console.log('Creating offer...');
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      console.log('Connecting to OpenAI...');
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const error = await sdpResponse.text();
        throw new Error(`OpenAI connection failed: ${error}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await pcRef.current.setRemoteDescription(answer);
      console.log("WebRTC connection established");

    } catch (error) {
      console.error('Error starting conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      toast.error(errorMessage);
      setIsConnecting(false);
      cleanup();
    }
  };

  const endConversation = () => {
    cleanup();
    setIsConnected(false);
    setIsSpeaking(false);
    
    if (messages.length > 0) {
      setConversationEnded(true);
      toast.success('Conversation ended - ready to create your story!');
    } else {
      toast.success('Conversation ended');
      setConversationEnded(false);
    }
  };

  const continueConversation = () => {
    setConversationEnded(false);
    startConversation();
  };

  const createStory = async () => {
    try {
      setIsCreatingStory(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in to create a story');
        return;
      }

      // Combine all messages into story text
      const storyText = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
        .join('\n\n');

      // Create story record
      const { data: storyData, error } = await supabase
        .from('stories')
        .insert({
          user_id: session.user.id,
          story_text: storyText,
          status: 'processing',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Story created! Generating your cartoon...');
      
      // Navigate immediately - the results page will poll for completion
      navigate(`/results/${storyData.id}`);
      
      // Trigger cartoon generation in the background (fire and forget)
      supabase.functions.invoke('generate-cartoon', {
        body: { storyId: storyData.id }
      }).catch(err => {
        console.error('Background generation error:', err);
        // Don't show error toast since we already navigated
      });
      
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error('Failed to create story');
      setIsCreatingStory(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-muted-foreground">
          Talk with AI to develop your story idea
        </p>
      </div>

      {messages.length > 0 && (
        <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Conversation</h3>
          {messages.map((msg, idx) => (
            <Card key={idx} className={`p-4 ${msg.role === 'user' ? 'ml-8 bg-primary/10' : 'mr-8 bg-accent/10'}`}>
              <p className="text-xs font-medium mb-1 text-muted-foreground">{msg.role === 'user' ? 'You' : 'AI Assistant'}</p>
              <p className="text-sm">{msg.content}</p>
            </Card>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        {conversationEnded ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-center text-muted-foreground">
              Ready to turn your conversation into a cartoon?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={continueConversation}
                variant="outline"
                size="lg"
              >
                <Mic className="w-4 h-4 mr-2" />
                Continue Conversation
              </Button>
              <Button
                onClick={createStory}
                disabled={isCreatingStory}
                size="lg"
              >
                {isCreatingStory ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Story
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : !isConnected ? (
          <Button
            onClick={startConversation}
            disabled={isConnecting}
            size="lg"
            className="min-w-[200px]"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Voice Chat
              </>
            )}
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`p-4 rounded-full ${isSpeaking ? 'bg-primary animate-pulse' : 'bg-primary/20'}`}>
              {isSpeaking ? (
                <Mic className="w-8 h-8 text-white" />
              ) : (
                <MicOff className="w-8 h-8 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isSpeaking ? 'AI is speaking...' : 'Listening...'}
            </p>
            <Button
              onClick={endConversation}
              variant="outline"
              size="sm"
            >
              End Conversation
            </Button>
          </div>
        )}
        {!conversationEnded && (
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Note: Voice chat requires OpenAI credits
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceInterface;
