import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AudioRecorder, encodeAudioForAPI, playAudioData } from '@/utils/RealtimeAudio';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const VoiceInterface = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    recorderRef.current?.stop();
    wsRef.current?.close();
    audioContextRef.current?.close();
  };

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Connect to WebSocket
      const projectRef = 'wczgqokhrlzbvhjpgebo';
      const wsUrl = `wss://${projectRef}.supabase.co/functions/v1/realtime-chat`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        toast.success('Voice conversation started!');
        
        // Start recording
        startRecording();
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data.type);
        
        if (data.type === 'response.audio.delta') {
          setIsSpeaking(true);
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          if (audioContextRef.current) {
            await playAudioData(audioContextRef.current, bytes);
          }
        } else if (data.type === 'response.audio.done') {
          setIsSpeaking(false);
        } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
          setMessages(prev => [...prev, { role: 'user', content: data.transcript }]);
        } else if (data.type === 'response.audio_transcript.delta') {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), { role: 'assistant', content: last.content + data.delta }];
            }
            return [...prev, { role: 'assistant', content: data.delta }];
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Failed to connect. Make sure you have added OpenAI API key in Lovable Cloud settings.');
        setIsConnecting(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setIsSpeaking(false);
      };

    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
      setIsConnecting(false);
    }
  };

  const startRecording = () => {
    recorderRef.current = new AudioRecorder((audioData) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const base64Audio = encodeAudioForAPI(audioData);
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        }));
      }
    });
    recorderRef.current.start();
  };

  const endConversation = () => {
    cleanup();
    setIsConnected(false);
    setIsSpeaking(false);
    toast.success('Conversation ended');
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-muted-foreground">
          Talk with AI to develop your story idea
        </p>
      </div>

      <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto">
        {messages.map((msg, idx) => (
          <Card key={idx} className={`p-4 ${msg.role === 'user' ? 'ml-8 bg-primary/10' : 'mr-8'}`}>
            <p className="text-sm font-medium mb-1">{msg.role === 'user' ? 'You' : 'AI'}</p>
            <p>{msg.content}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        {!isConnected ? (
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
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Note: Voice chat requires OpenAI credits
        </p>
      </div>
    </div>
  );
};

export default VoiceInterface;
