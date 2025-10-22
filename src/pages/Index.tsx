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
              <Button variant="outline" onClick={() => navigate("/memory-book")}>
                My Memories
              </Button>
              <Button variant="outline" onClick={() => navigate("/create")}>
                Preserve Memory
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
            Preserve Your Memories Forever
          </h1>
          <p className="text-xl md:text-2xl mb-10 opacity-95 animate-slide-up max-w-2xl mx-auto">
            Transform your precious life stories into beautiful illustrated cartoons that last forever ✨
          </p>
          <Button
            size="lg"
            variant="gradient"
            onClick={() => navigate(user ? "/biography" : "/auth")}
            className="text-lg animate-slide-up btn-glow"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {user ? "Start Your Biography" : "Get Started"}
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-4 gradient-text">How It Works</h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">Three simple steps to preserve your memories</p>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8 text-center">
                <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">1. Share Your Memory</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Tell us about a precious memory—your first day of school, meeting your spouse, grandma's recipes, or any moment you want to preserve forever.
                </p>
              </CardContent>
            </Card>

            <Card className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: "0.1s" }}>
              <CardContent className="p-8 text-center">
                <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg">
                  <Zap className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">2. AI Brings It to Life</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our AI captures the key moments and emotions, creating beautiful cartoon panels that tell your story visually.
                </p>
              </CardContent>
            </Card>

            <Card className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-8 text-center">
                <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center shadow-lg">
                  <Image className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">3. Preserve & Share</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your memory is now preserved forever! Download it, gift it to loved ones, or share it with family for generations to come.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <h2 className="text-5xl font-bold text-center mb-4 gradient-text">Memories Worth Preserving</h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">
            See how others are preserving their precious moments
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-glass hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8">
                <div className="text-4xl mb-4">👵</div>
                <h3 className="text-xl font-bold mb-2">"Grandma's Immigration Story"</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Sarah captured her grandmother's journey from Italy to America in the 1950s—a gift that brought tears to the whole family.
                </p>
                <p className="text-sm text-primary font-semibold">Perfect for: Family History</p>
              </CardContent>
            </Card>

            <Card className="card-glass hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: "0.1s" }}>
              <CardContent className="p-8">
                <div className="text-4xl mb-4">💍</div>
                <h3 className="text-xl font-bold mb-2">"How We Met"</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Mike surprised his wife on their anniversary with a cartoon of their first date at the coffee shop where they met.
                </p>
                <p className="text-sm text-primary font-semibold">Perfect for: Anniversaries</p>
              </CardContent>
            </Card>

            <Card className="card-glass hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-8">
                <div className="text-4xl mb-4">🎓</div>
                <h3 className="text-xl font-bold mb-2">"Dad's First Day Teaching"</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Emma created a cartoon of her father's first day as a teacher—a retirement gift he'll treasure forever.
                </p>
                <p className="text-sm text-primary font-semibold">Perfect for: Retirements</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-accent opacity-10"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-5xl font-bold mb-4 gradient-text">Start Preserving Your Memories</h2>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Don't let precious memories fade away. Capture them as beautiful cartoons today!
          </p>
          <Button
            size="lg"
            variant="gradient"
            onClick={() => navigate(user ? "/biography" : "/auth")}
            className="text-lg btn-glow"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Start Your Biography
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
