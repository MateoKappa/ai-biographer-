import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Share2, Loader2, Plus } from "lucide-react";
import { ShareModal } from "@/components/ShareModal";

interface Memory {
  id: string;
  story_text: string;
  created_at: string;
  image_url?: string;
  status: string;
}

const Gallery = () => {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      fetchMemories();
    };

    checkAuth();
  }, [navigate]);

  const fetchMemories = async () => {
    try {
      const { data: stories, error } = await supabase
        .from("stories")
        .select("*")
        .eq("status", "complete")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get first panel image for each story
      const memoriesWithImages = await Promise.all(
        (stories || []).map(async (story) => {
          const { data: panels } = await supabase
            .from("cartoon_panels")
            .select("image_url")
            .eq("story_id", story.id)
            .order("order_index")
            .limit(1);

          return {
            ...story,
            image_url: panels?.[0]?.image_url
          };
        })
      );

      setMemories(memoriesWithImages);
    } catch (error) {
      console.error("Error fetching memories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (memory: Memory) => {
    setSelectedMemory(memory);
    setShareModalOpen(true);
  };

  const getMemoryPreview = (text: string) => {
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="card-glass p-10 text-center">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-3 gradient-text">Loading Gallery...</h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Header */}
      <header className="p-4 md:p-6 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/studio")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Studio
        </Button>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-2 md:mb-3 gradient-text">Memory Gallery</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Your collection of preserved memories and stories
          </p>
        </div>

        {memories.length === 0 ? (
          <Card className="card-glass p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <span className="text-4xl">📸</span>
              </div>
              <h3 className="text-2xl font-bold mb-3">No Memories Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start creating beautiful biography cartoons and they'll appear here
              </p>
              <Button
                size="lg"
                variant="gradient"
                onClick={() => navigate("/create")}
                className="btn-glow"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Memory
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memories.map((memory) => (
              <Card
                key={memory.id}
                className="card-clean hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group cursor-pointer"
                onClick={() => navigate(`/results/${memory.id}`)}
              >
                <CardContent className="p-0">
                  {memory.image_url ? (
                    <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                      <img
                        src={memory.image_url}
                        alt="Memory preview"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                      <span className="text-6xl">📖</span>
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      {new Date(memory.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-sm leading-relaxed mb-4 line-clamp-3">
                      {getMemoryPreview(memory.story_text)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(memory);
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedMemory && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          storyTitle={getMemoryPreview(selectedMemory.story_text)}
          storyId={selectedMemory.id}
        />
      )}
    </div>
  );
};

export default Gallery;
