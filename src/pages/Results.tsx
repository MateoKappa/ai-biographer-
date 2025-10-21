import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Share2, Plus } from "lucide-react";

interface CartoonPanel {
  id: string;
  scene_text: string;
  image_url: string;
  order_index: number;
}

const Results = () => {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState<CartoonPanel[]>([]);
  const [storyText, setStoryText] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      fetchStoryAndPanels();
    };

    checkAuth();
  }, [storyId, navigate]);

  const fetchStoryAndPanels = async () => {
    try {
      // Fetch story
      const { data: story, error: storyError } = await supabase
        .from("stories")
        .select("*")
        .eq("id", storyId)
        .single();

      if (storyError) throw storyError;

      setStoryText(story.story_text);
      setStatus(story.status);

      // If still processing, poll for updates
      if (story.status === "processing") {
        const interval = setInterval(async () => {
          const { data: updatedStory } = await supabase
            .from("stories")
            .select("status")
            .eq("id", storyId)
            .single();

          if (updatedStory && updatedStory.status !== "processing") {
            setStatus(updatedStory.status);
            clearInterval(interval);
            fetchPanels();
          }
        }, 3000);

        return () => clearInterval(interval);
      }

      // Fetch panels
      await fetchPanels();
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPanels = async () => {
    const { data: panelsData, error: panelsError } = await supabase
      .from("cartoon_panels")
      .select("*")
      .eq("story_id", storyId)
      .order("order_index");

    if (panelsError) throw panelsError;

    setPanels(panelsData || []);
  };

  const handleDownload = () => {
    toast({
      title: "Coming soon!",
      description: "Download feature will be available soon.",
    });
  };

  const handleShare = () => {
    toast({
      title: "Coming soon!",
      description: "Share feature will be available soon.",
    });
  };

  if (loading || status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="comic-panel p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Creating Your Cartoon...</h2>
          <p className="text-muted-foreground">
            This magical process takes about 30-60 seconds
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate("/")}>
            ← Back to Home
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-center mb-2">Your Cartoon Story</h1>
        <p className="text-center text-muted-foreground mb-12">
          Scroll down to see your story come to life!
        </p>

        <div className="space-y-8">
          {panels.map((panel, index) => (
            <Card
              key={panel.id}
              className="comic-panel animate-slide-up overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-0">
                <img
                  src={panel.image_url}
                  alt={panel.scene_text}
                  className="w-full h-auto"
                  loading="lazy"
                />
                <div className="p-6 gradient-card">
                  <p className="text-lg italic">{panel.scene_text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {panels.length === 0 && (
          <Card className="comic-panel p-8 text-center">
            <p className="text-muted-foreground">
              No panels generated yet. This might be an error.
            </p>
          </Card>
        )}

        <div className="mt-12 text-center">
          <Button size="lg" onClick={() => navigate("/create")}>
            <Plus className="h-5 w-5 mr-2" />
            Create Another Story
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
