import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ImagePlus, Settings2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PanelData {
  description: string;
  referenceImage: File | null;
}

const StoryInput = () => {
  const [story, setStory] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [panelCount, setPanelCount] = useState(3);
  const [panels, setPanels] = useState<PanelData[]>([
    { description: "", referenceImage: null },
    { description: "", referenceImage: null },
    { description: "", referenceImage: null },
  ]);
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

  const handlePanelCountChange = (value: string) => {
    const count = parseInt(value);
    setPanelCount(count);
    const newPanels = Array(count).fill(null).map((_, i) => 
      panels[i] || { description: "", referenceImage: null }
    );
    setPanels(newPanels);
  };

  const updatePanelDescription = (index: number, description: string) => {
    const newPanels = [...panels];
    newPanels[index] = { ...newPanels[index], description };
    setPanels(newPanels);
  };

  const updatePanelImage = (index: number, file: File | null) => {
    const newPanels = [...panels];
    newPanels[index] = { ...newPanels[index], referenceImage: file };
    setPanels(newPanels);
  };

  const removePanelImage = (index: number) => {
    updatePanelImage(index, null);
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

    // Validation for simple mode
    if (!advancedMode) {
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
    } else {
      // Validation for advanced mode
      const emptyPanels = panels.filter(p => !p.description.trim());
      if (emptyPanels.length > 0) {
        toast({
          title: "Missing panel descriptions",
          description: "Please provide a description for all panels.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      let photoUrl = null;
      let panelDataForDB = null;

      // Simple mode: upload single photo if provided
      if (!advancedMode && photo) {
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

      // Advanced mode: upload all panel reference images
      if (advancedMode) {
        const panelUploads = await Promise.all(
          panels.map(async (panel, index) => {
            let imageUrl = null;
            if (panel.referenceImage) {
              const fileExt = panel.referenceImage.name.split(".").pop();
              const fileName = `${user.id}/panel_${Date.now()}_${index}.${fileExt}`;
              const { error: uploadError } = await supabase.storage
                .from("cartoons")
                .upload(fileName, panel.referenceImage);

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                .from("cartoons")
                .getPublicUrl(fileName);

              imageUrl = publicUrl;
            }
            return {
              description: panel.description,
              referenceImageUrl: imageUrl,
            };
          })
        );
        panelDataForDB = panelUploads;
      }

      // Create story record with status 'processing'
      const { data: storyData, error: storyError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          story_text: advancedMode ? `Advanced mode with ${panelCount} custom panels` : story,
          photo_url: photoUrl,
          status: "processing",
          context_qa: advancedMode ? panelDataForDB : [],
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
          body: { 
            storyId: storyData.id,
            advancedMode: advancedMode,
          },
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
            {/* Advanced Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    <div>
                      <Label htmlFor="advanced-mode" className="text-base font-semibold cursor-pointer">
                        Advanced Mode
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Control number of panels and add descriptions for each
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="advanced-mode"
                    checked={advancedMode}
                    onCheckedChange={setAdvancedMode}
                  />
                </div>

                {!advancedMode ? (
                  <>
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
                  </>
                ) : (
                  <>
                    {/* Panel Count Selector */}
                    <div className="space-y-2">
                      <Label htmlFor="panel-count">Number of Panels</Label>
                      <Select value={panelCount.toString()} onValueChange={handlePanelCountChange}>
                        <SelectTrigger id="panel-count">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Panels</SelectItem>
                          <SelectItem value="3">3 Panels</SelectItem>
                          <SelectItem value="4">4 Panels</SelectItem>
                          <SelectItem value="5">5 Panels</SelectItem>
                          <SelectItem value="6">6 Panels</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Panel Configuration */}
                    <div className="space-y-4">
                      {panels.map((panel, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-3">
                            <Label className="text-base font-semibold">Panel {index + 1}</Label>
                            <div className="space-y-2">
                              <Label htmlFor={`panel-desc-${index}`}>Description</Label>
                              <Textarea
                                id={`panel-desc-${index}`}
                                placeholder="Describe what happens in this panel... (e.g., 'We gathered around the dinner table, candles flickering')"
                                value={panel.description}
                                onChange={(e) => updatePanelDescription(index, e.target.value)}
                                rows={3}
                                className="resize-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`panel-image-${index}`} className="flex items-center gap-2">
                                <ImagePlus className="h-4 w-4" />
                                Reference Image (Optional)
                              </Label>
                              <Input
                                id={`panel-image-${index}`}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    updatePanelImage(index, e.target.files[0]);
                                  }
                                }}
                              />
                              {panel.referenceImage && (
                                <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                                  <span>Selected: {panel.referenceImage.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePanelImage(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={loading || (!advancedMode && (wordCount > maxWords || !story.trim()))}
                  className="w-full"
                  size="lg"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Preserving Your Memory..." : "Create Memory Cartoon"}
                </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoryInput;
