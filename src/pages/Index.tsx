import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, BookOpen, Image, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="p-4 md:p-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Biographer</h2>
        <div className="flex gap-2">
          {user ? (
            <>
              <Button variant="outline" onClick={() => navigate("/templates")}>
                Memory Templates
              </Button>
              <Button variant="outline" onClick={() => navigate("/create")}>
                Create Story
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero text-white py-24 md:py-40 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block animate-float mb-6">
            <Sparkles className="h-20 w-20 mx-auto drop-shadow-2xl" />
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 animate-slide-up drop-shadow-lg">
            Turn Your Life Story Into a Cartoon
          </h1>
          <p className="text-xl md:text-2xl mb-10 opacity-95 animate-slide-up max-w-2xl mx-auto">
            Transform your memories into delightful cartoon panels in seconds with AI magic ✨
          </p>
          <Button
            size="lg"
            variant="gradient"
            onClick={() => navigate(user ? "/create" : "/auth")}
            className="text-lg animate-slide-up btn-glow"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {user ? "Start Your Story" : "Get Started"}
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-4 gradient-text">How It Works</h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">Three simple steps to cartoon magic</p>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8 text-center">
                <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">1. Write Your Story</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Share your memory or creative tale in up to 300 words. Add a photo for extra personalization!
                </p>
              </CardContent>
            </Card>

            <Card className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: "0.1s" }}>
              <CardContent className="p-8 text-center">
                <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg">
                  <Zap className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">2. AI Works Magic</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our AI analyzes your story and creates 2-4 key scenes in beautiful cartoon style.
                </p>
              </CardContent>
            </Card>

            <Card className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-8 text-center">
                <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center shadow-lg">
                  <Image className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">3. Get Your Cartoon</h3>
                <p className="text-muted-foreground leading-relaxed">
                  View, download, and share your personalized cartoon story with friends and family!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-accent opacity-10"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-5xl font-bold mb-4 gradient-text">Ready to Create?</h2>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Join thousands bringing their stories to life in cartoon form!
          </p>
          <Button
            size="lg"
            variant="gradient"
            onClick={() => navigate(user ? "/create" : "/auth")}
            className="text-lg btn-glow"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Create Your First Cartoon
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-muted-foreground">
        <p>© 2025 AI Biographer. Built with ❤️ using Lovable.</p>
      </footer>
    </div>
  );
};

export default Index;
