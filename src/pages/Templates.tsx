import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, Briefcase, Heart, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

interface UserProgress {
  template_id: string;
  completed_count: number;
}

const iconMap: Record<string, any> = {
  Baby: Baby,
  Briefcase: Briefcase,
  Heart: Heart,
};

const Templates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchTemplatesAndProgress(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  const fetchTemplatesAndProgress = async (userId: string) => {
    try {
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from("memory_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at");

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from("user_template_progress")
        .select("template_id, completed_count")
        .eq("user_id", userId);

      if (progressError) throw progressError;

      const progressMap: Record<string, number> = {};
      (progressData || []).forEach((p: UserProgress) => {
        progressMap[p.template_id] = p.completed_count;
      });
      setProgress(progressMap);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = (templateId: string) => {
    navigate(`/session/${templateId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6 hover:bg-primary/10">
          ← Back to Home
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 gradient-text">Guided Memory Templates</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Capture your life story in small, repeatable sessions. Each answer saves instantly as a memory.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {templates.map((template, index) => {
            const IconComponent = iconMap[template.icon] || Baby;
            const answeredCount = progress[template.id] || 0;

            return (
              <Card
                key={template.id}
                className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="text-center">
                  <div className="h-20 w-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                    <IconComponent className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{template.name}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {answeredCount > 0 && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        <span className="text-primary font-semibold">{answeredCount}</span> memories captured
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => handleStartSession(template.id)}
                    className="w-full"
                    size="lg"
                  >
                    {answeredCount > 0 ? "Continue" : "Start Session"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center p-8 card-glass max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-2">How it works</h3>
          <p className="text-muted-foreground">
            Each session takes just 2-3 minutes. Answer a few questions, and each response becomes a stand-alone
            memory—saved instantly. Return anytime to continue where you left off.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Templates;