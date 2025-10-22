import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, BookOpen, Image, Zap, Calendar, MessageSquare, Palette, Gift } from "lucide-react";
import logo from "@/assets/logo.png";
import { CreditBalance } from "@/components/CreditBalance";

interface Biography {
  id: string;
  created_at: string;
  status: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [loadingBiographies, setLoadingBiographies] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadBiographies();
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadBiographies();
        } else {
          setBiographies([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
    } finally {
      setLoadingBiographies(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBiographies([]);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="p-4 md:p-6 flex justify-between items-center border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={logo} alt="AI Biographer" className="h-10 w-10" />
          <h2 className="text-2xl font-bold gradient-text">AI Biographer</h2>
        </div>
        <div className="flex gap-3 items-center">
          {user && <CreditBalance />}
          {user ? (
            <>
              <Button variant="outline" onClick={() => navigate("/studio")}>
                Studio
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
      <section className="gradient-hero text-white py-32 md:py-48 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 animate-fade-in border border-white/20">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Life Story Creation</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 animate-slide-up drop-shadow-2xl leading-tight">
            Your Life Story,
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-200">
              Beautifully Told by AI
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 opacity-95 animate-slide-up max-w-3xl mx-auto leading-relaxed">
            Have a natural conversation with our AI interviewer, and watch as your memories transform into stunning illustrated biography cartoons
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
            <Button
              size="lg"
              variant="gradient"
              onClick={() => navigate(user ? "/biography" : "/auth")}
              className="text-lg px-8 py-6 btn-glow hover-scale"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              {user ? "Start Your Biography Interview" : "Get Started Free"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white"
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-24 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 gradient-text">How AI Biography Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our AI-powered platform makes it effortless to create your visual life story
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
              <CardContent className="p-8 text-center">
                <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">1. Voice Interview</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Have a natural conversation with our AI interviewer. Just speak freely about your life, memories, and experiences—no typing required.
                </p>
              </CardContent>
            </Card>

            <Card className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group" style={{ animationDelay: "0.1s" }}>
              <CardContent className="p-8 text-center">
                <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Zap className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">2. AI Creates Your Story</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our advanced AI analyzes your conversation, identifies key moments, and crafts a compelling narrative structure for your biography.
                </p>
              </CardContent>
            </Card>

            <Card className="card-clean animate-slide-up hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-8 text-center">
                <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Palette className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">3. Visual Generation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Watch as AI transforms your story into beautiful cartoon panels—each scene carefully illustrated to capture your unique journey.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 gradient-text">Perfect for Every Occasion</h2>
            <p className="text-muted-foreground text-lg">
              Create meaningful, personalized biography cartoons for life's special moments
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-glass hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
              <CardContent className="p-8">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <div className="text-4xl">🎁</div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-center">Meaningful Gifts</h3>
                <p className="text-muted-foreground leading-relaxed text-center mb-4">
                  Create personalized biography cartoons for birthdays, anniversaries, retirements, or any special milestone.
                </p>
                <p className="text-sm text-primary font-semibold text-center">→ Unique & Heartfelt</p>
              </CardContent>
            </Card>

            <Card className="card-glass hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group" style={{ animationDelay: "0.1s" }}>
              <CardContent className="p-8">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <div className="text-4xl">👨‍👩‍👧‍👦</div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-center">Family Heritage</h3>
                <p className="text-muted-foreground leading-relaxed text-center mb-4">
                  Preserve generational stories, immigration journeys, and family traditions in beautiful visual format.
                </p>
                <p className="text-sm text-primary font-semibold text-center">→ Legacy Building</p>
              </CardContent>
            </Card>

            <Card className="card-glass hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-8">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <div className="text-4xl">💝</div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-center">Personal Memories</h3>
                <p className="text-muted-foreground leading-relaxed text-center mb-4">
                  Document your own life story, childhood memories, or significant life events for yourself and future generations.
                </p>
                <p className="text-sm text-primary font-semibold text-center">→ Self-Reflection</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-accent opacity-10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(139,92,246,0.15),transparent)]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Free to Get Started</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">Ready to Create Your Biography?</h2>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
            Join thousands who have already preserved their life stories. Start your AI-powered biography interview today—no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="gradient"
              onClick={() => navigate(user ? "/biography" : "/auth")}
              className="text-lg px-8 py-6 btn-glow hover-scale"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Start Biography Interview
            </Button>
            {user && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/studio")}
                className="text-lg px-8 py-6"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                Go to Studio
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="AI Biographer" className="h-8 w-8" />
              <span className="text-lg font-bold gradient-text">AI Biographer</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2025 AI Biographer. Preserving memories with AI. Built with ❤️ using Lovable.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
