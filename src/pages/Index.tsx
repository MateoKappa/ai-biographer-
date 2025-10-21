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
      <section className="gradient-hero text-primary-foreground py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block animate-float mb-6">
            <Sparkles className="h-16 w-16 mx-auto" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            Turn Your Life Story Into a Cartoon
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 animate-slide-up">
            Transform your memories into delightful cartoon panels in seconds.
            Powered by AI magic! ✨
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate(user ? "/create" : "/auth")}
            className="text-lg px-8 py-6 animate-slide-up"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {user ? "Start Your Story" : "Get Started"}
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="comic-panel animate-slide-up">
              <CardContent className="p-6 text-center">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">1. Write Your Story</h3>
                <p className="text-muted-foreground">
                  Share your memory or creative tale in up to 300 words. Add a
                  photo for extra personalization!
                </p>
              </CardContent>
            </Card>

            <Card className="comic-panel animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <CardContent className="p-6 text-center">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">2. AI Works Magic</h3>
                <p className="text-muted-foreground">
                  Our AI analyzes your story and creates 2-4 key scenes in
                  beautiful cartoon style.
                </p>
              </CardContent>
            </Card>

            <Card className="comic-panel animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-6 text-center">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Image className="h-8 w-8 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">3. Get Your Cartoon</h3>
                <p className="text-muted-foreground">
                  View, download, and share your personalized cartoon story with
                  friends and family!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-muted">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Create?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands bringing their stories to life in cartoon form!
          </p>
          <Button
            size="lg"
            onClick={() => navigate(user ? "/create" : "/auth")}
            className="text-lg px-8 py-6"
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
