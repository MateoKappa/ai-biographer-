import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ImagePlus, Mic, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VoiceInterface from "@/components/VoiceInterface";

const StoryInput = () => {
  const [story, setStory] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const maxWords = 300;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      
      // Fetch user's memories
      const { data: memoriesData } = await supabase
        .from("memory_captures")
        .select("*, template_questions(question_text), memory_templates(name)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      
      if (memoriesData) {
        setMemories(memoriesData);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const wordCount = story.trim().split(/\s+/).filter(Boolean).length;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const toggleMemory = (memoryId: string) => {
    setSelectedMemoryIds((prev) =>
      prev.includes(memoryId)
        ? prev.filter((id) => id !== memoryId)
        : [...prev, memoryId]
    );
  };

  const handleGenerate = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to generate cartoons.",
        variant: "destructive",
      });
      return;
    }

    if (wordCount > maxWords) {
      toast({
        title: "Story too long",
        description: `Please keep your story under ${maxWords} words.`,
        variant: "destructive",
      });
      return;
    }

    if (!story.trim()) {
      toast({
        title: "Story required",
        description: "Please write a story before generating.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let photoUrl = null;

      // Upload photo if provided
      if (photo) {
        const fileExt = photo.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("cartoons")
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("cartoons")
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

      // Create story record with status 'processing'
      const { data: storyData, error: storyError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          story_text: story,
          photo_url: photoUrl,
          status: "processing",
          memory_ids: selectedMemoryIds,
        })
        .select()
        .single();

      if (storyError) throw storyError;

      toast({
        title: "Creating your memory cartoon!",
        description: "This will take a moment...",
      });

      // Generate cartoon immediately
      const { error: generateError } = await supabase.functions.invoke(
        "generate-cartoon",
        {
          body: { storyId: storyData.id },
        }
      );

      if (generateError) {
        console.error("Generate error:", generateError);
        toast({
          title: "Error",
          description: "Failed to generate cartoon. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to results page
      navigate(`/results/${storyData.id}`);
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate cartoon.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 hover:bg-primary/10"
        >
          ← Back to Home
        </Button>

        <Card className="card-clean animate-slide-up">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-4xl flex items-center justify-center gap-3 gradient-text mb-2">
              <Sparkles className="h-10 w-10" />
              Capture Your Memory
            </CardTitle>
            <CardDescription className="text-base">
              Tell us about a moment you want to preserve forever
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">
                  <FileText className="w-4 h-4 mr-2" />
                  Write Story
                </TabsTrigger>
                <TabsTrigger value="voice">
                  <Mic className="w-4 h-4 mr-2" />
                  Voice Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="story">What memory would you like to preserve? (up to {maxWords} words)</Label>
                  <Textarea
                    id="story"
                    placeholder="Share a precious memory... Maybe your first day of school, how you met your partner, a family tradition, grandma's special recipe, or any moment you cherish..."
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    rows={10}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground text-right">
                    {wordCount} / {maxWords} words
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo" className="flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    Add a Photo from That Day (Optional)
                  </Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                  {photo && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {photo.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Include Memories (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        type="button"
                      >
                        {selectedMemoryIds.length > 0
                          ? `${selectedMemoryIds.length} memories selected`
                          : "Select memories to include"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <ScrollArea className="h-72">
                        {memories.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">
                            No memories yet. Create some in Memory Templates!
                          </div>
                        ) : (
                          <div className="p-4 space-y-3">
                            {memories.map((memory: any) => (
                              <div
                                key={memory.id}
                                className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                                onClick={() => toggleMemory(memory.id)}
                              >
                                <Checkbox
                                  checked={selectedMemoryIds.includes(memory.id)}
                                  onCheckedChange={() => toggleMemory(memory.id)}
                                />
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm font-medium">
                                    {memory.template_questions?.question_text}
                                  </p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {memory.answer_text}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {memory.memory_templates?.name}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={loading || wordCount > maxWords || !story.trim()}
                  className="w-full"
                  size="lg"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Preserving Your Memory..." : "Create Memory Cartoon"}
                </Button>
              </TabsContent>

              <TabsContent value="voice" className="mt-6">
                <VoiceInterface />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoryInput;
