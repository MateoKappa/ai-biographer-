import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, BookOpen, Calendar, Trash2, ArrowLeft, FileText } from "lucide-react";
import { CreditBalance } from "@/components/CreditBalance";
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
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Biography {
  id: string;
  created_at: string;
  status: string;
}

interface Story {
  id: string;
  story_text: string;
  created_at: string;
  status: string;
}

const Studio = () => {
  const navigate = useNavigate();
  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [memories, setMemories] = useState<Story[]>([]);
  const [loadingBiographies, setLoadingBiographies] = useState(false);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      
      loadBiographies();
      loadMemories();
    };

    checkUser();
  }, [navigate]);

  const loadBiographies = async () => {
    setLoadingBiographies(true);
    try {
      const { data, error } = await supabase
        .from("stories")
        .select("id, created_at, status")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBiographies(data || []);
    } catch (error) {
      console.error("Error loading biographies:", error);
      toast.error("Failed to load biographies");
    } finally {
      setLoadingBiographies(false);
    }
  };

  const loadMemories = async () => {
    setLoadingMemories(true);
    try {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error("Error loading memories:", error);
      toast.error("Failed to load memories");
    } finally {
      setLoadingMemories(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", memoryId);

      if (error) throw error;

      setMemories(memories.filter((m) => m.id !== memoryId));
      toast.success("Memory deleted successfully");
    } catch (error) {
      console.error("Error deleting memory:", error);
      toast.error("Failed to delete memory");
    } finally {
      setDeleteDialogOpen(false);
      setSelectedMemoryId(null);
    }
  };

  const handleDeleteAllMemories = async () => {
    try {
      const { error } = await supabase.rpc("delete_all_user_stories");
      if (error) throw error;

      setMemories([]);
      toast.success("All memories deleted successfully");
    } catch (error) {
      console.error("Error deleting all memories:", error);
      toast.error("Failed to delete all memories");
    } finally {
      setDeleteAllDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Management Studio</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
          <CreditBalance />
          <Button variant="gradient" onClick={() => navigate("/biography")} className="btn-glow flex-1 sm:flex-initial">
            <Sparkles className="mr-2 h-4 md:h-5 w-4 md:w-5" />
            <span className="hidden sm:inline">New Biography</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Tabs defaultValue="biographies" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="biographies">Biographies</TabsTrigger>
            <TabsTrigger value="memories">Memories</TabsTrigger>
          </TabsList>

          {/* Biographies Tab */}
          <TabsContent value="biographies" className="mt-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Your Biographies</h2>
              <p className="text-muted-foreground">
                Manage your preserved life stories and create new ones
              </p>
            </div>

            {loadingBiographies ? (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading biographies...</p>
              </div>
            ) : biographies.length === 0 ? (
              <Card className="card-glass p-12 text-center">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-2xl font-bold mb-2">No biographies yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start your first biography by sharing your life story
                </p>
                <Button
                  size="lg"
                  variant="gradient"
                  onClick={() => navigate("/biography")}
                  className="btn-glow"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Create Your First Biography
                </Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {biographies.map((bio) => (
                  <Card
                    key={bio.id}
                    className="card-clean hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => {
                      if (bio.status === 'draft') {
                        navigate(`/biography-settings/${bio.id}`);
                      } else {
                        navigate(`/results/${bio.id}`);
                      }
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <BookOpen className="h-8 w-8 text-primary" />
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          bio.status === 'complete' ? 'bg-green-500/20 text-green-700' :
                          bio.status === 'processing' ? 'bg-yellow-500/20 text-yellow-700' :
                          'bg-blue-500/20 text-blue-700'
                        }`}>
                          {bio.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg mb-2">Biography</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(bio.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Memories Tab */}
          <TabsContent value="memories" className="mt-8">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold mb-2">Your Memories</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Individual memory snapshots you can use in biographies
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={() => navigate("/gallery")} className="flex-1 md:flex-initial">
            <Sparkles className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">View Gallery</span>
            <span className="sm:hidden">Gallery</span>
          </Button>
          <Button variant="outline" onClick={() => navigate("/create")} className="flex-1 md:flex-initial">
            <FileText className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">New Memory</span>
            <span className="sm:hidden">New</span>
          </Button>
          {memories.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setDeleteAllDialogOpen(true)}
              className="flex-1 md:flex-initial"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Delete All</span>
              <span className="sm:hidden">Delete</span>
            </Button>
          )}
        </div>
      </div>

            {loadingMemories ? (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading memories...</p>
              </div>
            ) : memories.length === 0 ? (
              <Card className="card-glass p-12 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-2xl font-bold mb-2">No memories yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first memory to get started
                </p>
                <Button
                  size="lg"
                  variant="gradient"
                  onClick={() => navigate("/create")}
                  className="btn-glow"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  Create Your First Memory
                </Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {memories.map((memory) => (
                  <Card key={memory.id} className="card-clean hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <FileText className="h-8 w-8 text-primary" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMemoryId(memory.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-sm line-clamp-3 mb-4">
                        {memory.story_text}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(memory.created_at).toLocaleDateString()}
                      </div>
                      <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold ${
                        memory.status === 'complete' ? 'bg-green-500/20 text-green-700' :
                        memory.status === 'processing' ? 'bg-yellow-500/20 text-yellow-700' :
                        'bg-blue-500/20 text-blue-700'
                      }`}>
                        {memory.status}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Single Memory Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this memory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedMemoryId && handleDeleteMemory(selectedMemoryId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Memories Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Memories</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL your memories? This action cannot be undone and will remove all stored memories permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllMemories}
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

export default Studio;
