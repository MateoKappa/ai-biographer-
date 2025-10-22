import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Share2, Plus } from "lucide-react";
import jsPDF from "jspdf";

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
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      fetchStoryAndPanels();
      
      // Set up real-time subscription for new panels
      const channel = supabase
        .channel('cartoon-panels-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'cartoon_panels',
            filter: `story_id=eq.${storyId}`
          },
          (payload) => {
            console.log('New panel received:', payload);
            const newPanel = payload.new as CartoonPanel;
            setPanels((prev) => {
              // Check if panel already exists
              if (prev.some(p => p.id === newPanel.id)) return prev;
              // Add and sort by order_index
              return [...prev, newPanel].sort((a, b) => a.order_index - b.order_index);
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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

  const handleDownload = async () => {
    if (panels.length === 0) {
      toast({
        title: "No panels to download",
        description: "Please wait for the cartoon to be generated.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generating PDF...",
        description: "This may take a moment.",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];

        if (i > 0) {
          pdf.addPage();
        }

        // Add image
        try {
          const imgData = panel.image_url;
          const imgWidth = contentWidth;
          const imgHeight = contentWidth; // Square aspect ratio (1024x1024)
          
          pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
          
          // Add scene text below image
          const textY = margin + imgHeight + 10;
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "italic");
          
          const splitText = pdf.splitTextToSize(panel.scene_text, contentWidth);
          pdf.text(splitText, margin, textY);
        } catch (err) {
          console.error("Error adding panel to PDF:", err);
        }
      }

      // Save the PDF
      const filename = `memory-cartoon-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      toast({
        title: "Download complete!",
        description: "Your cartoon has been saved as a PDF.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Download failed",
        description: "There was an error generating the PDF.",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    toast({
      title: "Coming soon!",
      description: "Share feature will be available soon.",
    });
  };

  const handleGenerateCartoon = async () => {
    setIsGenerating(true);
    try {
      toast({
        title: "Starting Generation",
        description: "Your biography is now being transformed into a cartoon...",
      });

      const { error } = await supabase.functions.invoke('generate-cartoon', {
        body: { storyId, advancedMode: false }
      });

      if (error) throw error;

      toast({
        title: "Generation Started!",
        description: "Your panels will appear below in about 30-60 seconds.",
      });
    } catch (error: any) {
      console.error("Error starting generation:", error);
      toast({
        title: "Error",
        description: "Failed to start cartoon generation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="card-glass p-10 text-center max-w-md animate-scale-in">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-3 gradient-text">Loading Your Story...</h2>
          <p className="text-muted-foreground text-lg">
            Just a moment ✨
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="hover:bg-primary/10">
            ← Back to Home
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownload} className="hover:shadow-lg">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleShare} className="hover:shadow-lg">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-center mb-3 gradient-text">Your Preserved Memory</h1>
        <p className="text-center text-muted-foreground mb-16 text-lg">
          {status === "processing" 
            ? "Your memory is being transformed into a beautiful cartoon! ✨" 
            : "A moment frozen in time, preserved forever ✨"
          }
        </p>

        {status === "pending" && panels.length === 0 && (
          <Card className="card-glass p-10 text-center mb-10">
            <p className="text-muted-foreground text-lg mb-4">
              Your biography is saved but hasn't been transformed into a cartoon yet.
            </p>
            <Button 
              onClick={handleGenerateCartoon} 
              disabled={isGenerating}
              size="lg"
              variant="gradient"
              className="btn-glow"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Starting Generation...
                </>
              ) : (
                "Generate Cartoon Now"
              )}
            </Button>
          </Card>
        )}

        {status === "processing" && panels.length === 0 && (
          <Card className="card-glass p-10 text-center mb-10 animate-pulse">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground text-lg">
              Creating your panels... This takes 30 to 60 seconds
            </p>
          </Card>
        )}

        <div className="space-y-10">
          {panels.map((panel, index) => (
            <Card
              key={panel.id}
              className="card-clean animate-slide-up overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              <CardContent className="p-0">
                <img
                  src={panel.image_url}
                  alt={panel.scene_text}
                  className="w-full h-auto"
                  loading="lazy"
                />
                <div className="p-8 bg-gradient-to-b from-card to-muted/20">
                  <p className="text-lg italic leading-relaxed">{panel.scene_text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {status === "processing" && panels.length > 0 && (
          <Card className="card-glass p-10 text-center mt-10 animate-pulse">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground text-lg">
              Creating panel {panels.length + 1}... Hang tight!
            </p>
          </Card>
        )}

        {status !== "processing" && panels.length === 0 && (
          <Card className="card-glass p-10 text-center">
            <p className="text-muted-foreground text-lg">
              No panels generated yet. This might be an error.
            </p>
          </Card>
        )}

        <div className="mt-16 text-center">
          <Button size="lg" variant="gradient" onClick={() => navigate("/create")} className="btn-glow">
            <Plus className="h-5 w-5 mr-2" />
            Preserve Another Memory
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
