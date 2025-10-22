import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Memory {
  id: string;
  answer_text: string;
  occurred_date: string | null;
  template_questions: {
    question_text: string;
  } | null;
}

const BiographySettings = () => {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [desiredPanels, setDesiredPanels] = useState(3);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemories, setSelectedMemories] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      await loadStoryAndMemories();
    };
    checkAuth();
  }, [navigate, storyId]);

  const loadStoryAndMemories = async () => {
    try {
      // Load story to get existing settings
      const { data: story, error: storyError } = await supabase
        .from("stories")
        .select("*")
        .eq("id", storyId)
        .single();

      if (storyError) throw storyError;

      setTemperature(story.temperature || 0.7);
      setDesiredPanels(story.desired_panels || 3);
      setSelectedMemories(story.memory_ids || []);

      // Load available memories
      const { data: memoriesData, error: memoriesError } = await supabase
        .from("memory_captures")
        .select("*, template_questions(question_text)")
        .order("created_at", { ascending: false });

      if (memoriesError) throw memoriesError;

      setMemories(memoriesData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load biography settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMemory = (memoryId: string) => {
    setSelectedMemories(prev =>
      prev.includes(memoryId)
        ? prev.filter(id => id !== memoryId)
        : [...prev, memoryId]
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Update story with settings
      const { error: updateError } = await supabase
        .from("stories")
        .update({
          temperature,
          desired_panels: desiredPanels,
          memory_ids: selectedMemories,
          status: "pending"
        })
        .eq("id", storyId);

      if (updateError) throw updateError;

      // Trigger generation
      const { error: genError } = await supabase.functions.invoke("generate-cartoon", {
        body: { storyId, advancedMode: false }
      });

      if (genError) throw genError;

      toast({
        title: "Generation Started!",
        description: "Your biography is being created...",
      });

      navigate(`/results/${storyId}`);
    } catch (error: any) {
      console.error("Error generating:", error);
      toast({
        title: "Error",
        description: "Failed to start generation",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3 gradient-text">
              Configure Your Biography
            </h1>
            <p className="text-muted-foreground text-lg">
              Customize how your life story will be created
            </p>
          </div>

          <div className="space-y-8">
          <div>
            <Label className="text-lg font-semibold mb-4 block">
              AI Creativity (Temperature)
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Note: This setting is saved but currently not applied due to model limitations. The biography will use the default creativity level.
            </p>
            <div className="flex items-center gap-4 opacity-50">
              <span className="text-sm text-muted-foreground min-w-[80px]">Factual (0.0)</span>
              <Slider
                value={[temperature]}
                onValueChange={(value) => setTemperature(value[0])}
                min={0}
                max={1}
                step={0.1}
                className="flex-1"
                disabled
              />
              <span className="text-sm text-muted-foreground min-w-[80px] text-right">Creative (1.0)</span>
            </div>
            <p className="text-center mt-2 font-semibold text-muted-foreground">
              Current: {temperature.toFixed(1)} (not applied)
            </p>
          </div>

            {/* Panels Setting */}
            <div>
              <Label className="text-lg font-semibold mb-4 block">
                Number of Panels
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose how many cartoon panels to generate (1-8)
              </p>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground min-w-[40px]">1</span>
                <Slider
                  value={[desiredPanels]}
                  onValueChange={(value) => setDesiredPanels(value[0])}
                  min={1}
                  max={8}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-[40px] text-right">8</span>
              </div>
              <p className="text-center mt-2 font-semibold text-primary">
                {desiredPanels} panel{desiredPanels !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Memories Selection */}
            <div>
              <Label className="text-lg font-semibold mb-4 block">
                Include Memories (Optional)
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Select memories to include in your biography for additional context
              </p>
              {memories.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No memories saved yet. You can create your biography without memories.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedMemories.includes(memory.id)}
                        onCheckedChange={() => toggleMemory(memory.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">
                          {memory.template_questions?.question_text || "Memory"}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {memory.answer_text}
                        </p>
                        {memory.occurred_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(memory.occurred_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="pt-6 border-t">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full btn-glow"
                variant="gradient"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Your Biography...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Biography
                  </>
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                This will take about {desiredPanels * 20}-{desiredPanels * 30} seconds
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BiographySettings;
