import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, ArrowRight, SkipForward, X } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  follow_up_hints: string;
  order_index: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
}

const Session = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [template, setTemplate] = useState<Template | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadTemplateAndQuestion(session.user.id);
    };

    checkAuth();
  }, [templateId, navigate]);

  const loadTemplateAndQuestion = async (userId: string) => {
    try {
      // Load template
      const { data: templateData, error: templateError } = await supabase
        .from("memory_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

      // Get answered question IDs
      const { data: answeredData, error: answeredError } = await supabase
        .from("memory_captures")
        .select("question_id")
        .eq("user_id", userId)
        .eq("template_id", templateId);

      if (answeredError) throw answeredError;

      const answeredIds = new Set((answeredData || []).map((a) => a.question_id));
      setTotalAnswered(answeredIds.size);

      // Get all questions for this template
      const { data: questionsData, error: questionsError } = await supabase
        .from("template_questions")
        .select("*")
        .eq("template_id", templateId)
        .order("order_index");

      if (questionsError) throw questionsError;

      // Find first unanswered question
      const unanswered = (questionsData || []).find((q) => !answeredIds.has(q.id));
      
      if (unanswered) {
        setCurrentQuestion(unanswered);
      } else {
        // All questions answered
        toast({
          title: "Template Complete! 🎉",
          description: "You've answered all questions in this template.",
        });
        navigate("/templates");
      }
    } catch (error: any) {
      console.error("Error loading session:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/templates");
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async () => {
    if (!answer.trim()) {
      toast({
        title: "Empty answer",
        description: "Please write something before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!user || !currentQuestion) return;

    setSaving(true);
    try {
      // Save memory capture
      const { error: captureError } = await supabase
        .from("memory_captures")
        .insert({
          user_id: user.id,
          template_id: templateId!,
          question_id: currentQuestion.id,
          answer_text: answer,
        });

      if (captureError) throw captureError;

      // Update progress
      const { data: progressData } = await supabase
        .from("user_template_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("template_id", templateId!)
        .single();

      if (progressData) {
        await supabase
          .from("user_template_progress")
          .update({
            last_question_id: currentQuestion.id,
            completed_count: progressData.completed_count + 1,
          })
          .eq("user_id", user.id)
          .eq("template_id", templateId!);
      } else {
        await supabase.from("user_template_progress").insert({
          user_id: user.id,
          template_id: templateId!,
          last_question_id: currentQuestion.id,
          completed_count: 1,
        });
      }

      // Show success animation
      setShowSuccess(true);
      setSessionCount(sessionCount + 1);
      setTotalAnswered(totalAnswered + 1);
      
      setTimeout(async () => {
        setShowSuccess(false);
        setAnswer("");
        
        // End session after 3-5 answers
        if (sessionCount + 1 >= 3) {
          toast({
            title: "Great session! ✨",
            description: `You captured ${sessionCount + 1} memories. Come back anytime to continue.`,
          });
          navigate("/templates");
        } else {
          await loadNext();
        }
      }, 1500);

    } catch (error: any) {
      console.error("Error saving answer:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const loadNext = async () => {
    if (!user) return;

    // Get answered question IDs (including the one we just saved)
    const { data: answeredData } = await supabase
      .from("memory_captures")
      .select("question_id")
      .eq("user_id", user.id)
      .eq("template_id", templateId);

    const answeredIds = new Set((answeredData || []).map((a) => a.question_id));

    // Get all questions
    const { data: questionsData } = await supabase
      .from("template_questions")
      .select("*")
      .eq("template_id", templateId)
      .order("order_index");

    // Find next unanswered question
    const unanswered = (questionsData || []).find((q) => !answeredIds.has(q.id));
    
    if (unanswered) {
      setCurrentQuestion(unanswered);
    } else {
      toast({
        title: "Template Complete! 🎉",
        description: "You've answered all questions in this template.",
      });
      navigate("/templates");
    }
  };

  const handleSkip = async () => {
    await loadNext();
    toast({
      title: "Question skipped",
      description: "Moving to the next question.",
    });
  };

  const handleEndSession = () => {
    if (sessionCount > 0) {
      toast({
        title: "Session saved!",
        description: `You captured ${sessionCount} memories.`,
      });
    }
    navigate("/templates");
  };

  if (loading || !currentQuestion || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
        <Card className="card-glass max-w-md text-center animate-scale-in p-10">
          <CheckCircle2 className="h-20 w-20 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Memory Saved! ✨</h2>
          <p className="text-muted-foreground">Loading next question...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={handleEndSession} className="hover:bg-primary/10">
            <X className="mr-2 h-4 w-4" />
            End Session
          </Button>
          <div className="text-sm text-muted-foreground">
            {totalAnswered} captured · {sessionCount} this session
          </div>
        </div>

        <Card className="card-clean animate-slide-up">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-4xl mb-2">{template.name}</CardTitle>
            <CardDescription className="text-base">
              {sessionCount + 1} of 3-5 questions this session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5">
                <Label className="text-2xl font-semibold leading-relaxed">
                  {currentQuestion.question_text}
                </Label>
                {currentQuestion.follow_up_hints && (
                  <p className="text-sm text-muted-foreground mt-3 italic">
                    {currentQuestion.follow_up_hints}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Tap here to type your answer..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={8}
                  className="resize-none text-base"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={saveAnswer}
                disabled={saving || !answer.trim()}
                className="flex-1"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save & Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              <Button
                onClick={handleSkip}
                variant="outline"
                disabled={saving}
                size="lg"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Each answer is saved immediately. You can stop anytime and continue later.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Session;