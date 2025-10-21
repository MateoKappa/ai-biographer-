import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";

const StoryQuestions = () => {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!storyId) return;

    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "analyze-story",
          {
            body: { storyId },
          }
        );

        if (error) throw error;

        setQuestions(data.questions || []);
      } catch (error) {
        console.error("Error fetching questions:", error);
        toast.error("Failed to generate questions");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [storyId]);

  const handleSkip = async () => {
    setSubmitting(true);
    try {
      // Trigger cartoon generation
      const { error: functionError } = await supabase.functions.invoke(
        "generate-cartoon",
        {
          body: { storyId },
        }
      );

      if (functionError) throw functionError;

      navigate(`/results/${storyId}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to start cartoon generation");
      setSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording stopped, processing...");
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result?.toString().split(",")[1];
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Failed to convert audio"));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read audio file"));
        reader.readAsDataURL(audioBlob);
      });

      // Transcribe audio
      const { data: transcriptionData, error: transcriptionError } =
        await supabase.functions.invoke("transcribe-audio", {
          body: { audio: base64Audio },
        });

      if (transcriptionError) {
        console.error("Transcription error:", transcriptionError);
        throw new Error(transcriptionError.message || "Failed to transcribe audio");
      }

      if (!transcriptionData?.text) {
        throw new Error("No transcription received");
      }

      const transcription = transcriptionData.text;
      console.log("Transcription:", transcription);

      // Analyze and match to questions
      const { data: answersData, error: answersError } =
        await supabase.functions.invoke("analyze-answers", {
          body: { transcription, questions },
        });

      if (answersError) {
        console.error("Analysis error:", answersError);
        throw new Error(answersError.message || "Failed to analyze answers");
      }

      // Prefill answers
      setAnswers(answersData.answers);
      toast.success("Answers prefilled from recording!");
    } catch (error) {
      console.error("Error processing audio:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process recording";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Build context_qa array
      const contextQa = questions.map((q, index) => ({
        question: q,
        answer: answers[index] || "",
      }));

      // Update story with answers
      const { error: updateError } = await supabase
        .from("stories")
        .update({ context_qa: contextQa })
        .eq("id", storyId);

      if (updateError) throw updateError;

      // Trigger cartoon generation
      const { error: functionError } = await supabase.functions.invoke(
        "generate-cartoon",
        {
          body: { storyId },
        }
      );

      if (functionError) throw functionError;

      navigate(`/results/${storyId}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to submit answers");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">
            Analyzing your story...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-3xl mx-auto py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-3">
            Add More Details
          </h1>
          <p className="text-muted-foreground mb-4">
            Answer these questions to make your cartoon even better, or skip to
            continue
          </p>
          <div className="flex justify-center">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              disabled={isProcessing || submitting}
              className="min-w-[200px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Record Your Story
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={index} className="p-6 backdrop-blur-sm bg-card/50">
              <label className="block mb-3 font-medium">{question}</label>
              <Textarea
                placeholder="Your answer..."
                value={answers[index] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [index]: e.target.value }))
                }
                className="min-h-[100px]"
              />
            </Card>
          ))}
        </div>

        <div className="flex gap-4 mt-8">
          <Button
            onClick={handleSkip}
            variant="outline"
            size="lg"
            disabled={submitting}
            className="flex-1"
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Submit & Create Cartoon"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoryQuestions;
