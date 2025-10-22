import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const BiographySettings = () => {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [desiredPanels, setDesiredPanels] = useState(3);
  const [animationStyle, setAnimationStyle] = useState('classic_cartoon');

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

      setDesiredPanels(story.desired_panels || 3);
      setAnimationStyle(story.animation_style || 'classic_cartoon');
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

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Update story with settings
      const { error: updateError } = await supabase
        .from("stories")
        .update({
          desired_panels: desiredPanels,
          animation_style: animationStyle,
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
            {/* Animation Style */}
            <div>
              <Label className="text-lg font-semibold mb-4 block">
                Animation Style
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the visual style for your biography
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { value: 'classic_cartoon', label: 'Classic Cartoon', emoji: '🎨' },
                  { value: 'anime', label: 'Anime', emoji: '⭐' },
                  { value: 'comic_book', label: 'Comic Book', emoji: '💥' },
                  { value: 'watercolor', label: 'Watercolor', emoji: '🖌️' },
                  { value: 'pixel_art', label: 'Pixel Art', emoji: '👾' },
                  { value: 'realistic', label: 'Realistic', emoji: '📸' }
                ].map(style => (
                  <button
                    key={style.value}
                    onClick={() => setAnimationStyle(style.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-center hover:scale-105 ${
                      animationStyle === style.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{style.emoji}</div>
                    <div className="text-sm font-medium">{style.label}</div>
                  </button>
                ))}
              </div>
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
