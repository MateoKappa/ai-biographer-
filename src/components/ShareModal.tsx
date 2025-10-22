import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, Twitter, Facebook, Copy, Globe, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyTitle: string;
  storyId: string;
}

export const ShareModal = ({ isOpen, onClose, storyTitle, storyId }: ShareModalProps) => {
  const { toast } = useToast();
  const [isPublic, setIsPublic] = useState(false);
  
  const shareUrl = `https://ai-biographer.app/story/${storyId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied! 🔗",
      description: "Share link copied to clipboard",
    });
  };

  const handleShareTwitter = () => {
    const text = `Check out my life story: "${storyTitle}" created with AI Biographer!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleTogglePublic = (checked: boolean) => {
    setIsPublic(checked);
    toast({
      title: checked ? "Story Made Public 🌍" : "Story Made Private 🔒",
      description: checked 
        ? "Anyone with the link can now view your story" 
        : "Only you can view this story",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text">
            Share Your Story
          </DialogTitle>
          <p className="text-muted-foreground">
            Share your biography with friends and family
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Public/Private Toggle */}
          <Card className="card-glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="public-toggle" className="text-base font-semibold cursor-pointer">
                      {isPublic ? "Public Story" : "Private Story"}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isPublic ? "Anyone with the link can view" : "Only you can view"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="public-toggle"
                  checked={isPublic}
                  onCheckedChange={handleTogglePublic}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          {isPublic && (
            <Card className="card-clean animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">📖</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{storyTitle}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      An AI-generated biography cartoon
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Share Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={handleCopyLink}
            >
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Copy className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">Copy Link</p>
                <p className="text-xs text-muted-foreground">Share via any platform</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={handleShareTwitter}
            >
              <div className="h-10 w-10 rounded-full bg-sky-500/10 flex items-center justify-center">
                <Twitter className="h-5 w-5 text-sky-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">Share to X (Twitter)</p>
                <p className="text-xs text-muted-foreground">Post to your timeline</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={handleShareFacebook}
            >
              <div className="h-10 w-10 rounded-full bg-blue-600/10 flex items-center justify-center">
                <Facebook className="h-5 w-5 text-blue-700" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">Share to Facebook</p>
                <p className="text-xs text-muted-foreground">Post to your feed</p>
              </div>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            * Sharing features are for demonstration purposes
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
