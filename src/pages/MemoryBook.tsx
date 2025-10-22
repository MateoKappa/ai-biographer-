import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, BookHeart, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Story {
  id: string;
  story_text: string;
  created_at: string;
  status: string;
}

const MemoryBook = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      fetchStories();
    };

    checkAuth();
  }, [navigate]);

  const fetchStories = async () => {
    try {
      const { data: storiesData, error } = await supabase
        .from("stories")
        .select("id, story_text, created_at, status")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setStories(storiesData || []);
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

  const handleDeleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", storyId);

      if (error) throw error;

      setStories(stories.filter((s) => s.id !== storyId));
      toast({
        title: "Memory deleted",
        description: "Your memory has been removed.",
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First, get all story IDs for this user
      const { data: userStories, error: fetchError } = await supabase
        .from("stories")
        .select("id")
        .eq("user_id", session.user.id);

      if (fetchError) throw fetchError;

      if (userStories && userStories.length > 0) {
        const storyIds = userStories.map(s => s.id);

        // Delete all cartoon panels for these stories first
        const { error: panelsError } = await supabase
          .from("cartoon_panels")
          .delete()
          .in("story_id", storyIds);

        if (panelsError) throw panelsError;

        // Then delete all stories
        const { error: storiesError } = await supabase
          .from("stories")
          .delete()
          .eq("user_id", session.user.id);

        if (storiesError) throw storiesError;
      }

      setStories([]);
      toast({
        title: "All memories deleted",
        description: "Your memory book has been cleared.",
      });
    } catch (error: any) {
      console.error("Delete all error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="card-glass p-10 text-center max-w-md animate-scale-in">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-3 gradient-text">Loading Your Memory Book...</h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="hover:bg-primary/10">
            ← Back to Home
          </Button>
          <div className="flex gap-2">
            {stories.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setDeleteAllDialogOpen(true)}
                className="hover:shadow-lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            )}
            <Button onClick={() => navigate("/create")} className="hover:shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Preserve New Memory
            </Button>
          </div>
        </div>

        <div className="text-center mb-12">
          <div className="inline-block animate-float mb-4">
            <BookHeart className="h-16 w-16 mx-auto text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-3 gradient-text">Your Memory Book</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            All your precious memories preserved as beautiful cartoons
          </p>
        </div>

        {stories.length === 0 ? (
          <Card className="card-glass p-16 text-center">
            <BookHeart className="h-20 w-20 mx-auto mb-6 text-muted-foreground/50" />
            <h2 className="text-2xl font-bold mb-3">No Memories Yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start preserving your precious moments! Every memory you create will appear here in your personal collection.
            </p>
            <Button size="lg" onClick={() => navigate("/create")} variant="gradient" className="btn-glow">
              <Plus className="h-5 w-5 mr-2" />
              Preserve Your First Memory
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story, index) => (
              <Card
                key={story.id}
                className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                      <BookHeart className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        story.status === "complete" 
                          ? "bg-green-500/20 text-green-600" 
                          : "bg-yellow-500/20 text-yellow-600"
                      }`}>
                        {story.status === "complete" ? "Ready" : "Processing"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStoryToDelete(story.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div 
                    className="cursor-pointer"
                    onClick={() => navigate(`/results/${story.id}`)}
                  >
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {story.story_text}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {new Date(story.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                      <span className="text-primary hover:underline">View →</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this memory and all its cartoon panels.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (storyToDelete) {
                  handleDeleteStory(storyToDelete);
                  setStoryToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all memories?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your memories and their cartoon panels.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDeleteAll();
                setDeleteAllDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MemoryBook;
