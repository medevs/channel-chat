import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MessageSquare, Youtube, Sparkles, Shield, CheckCircle, ArrowRight, Mic, Bookmark, Search, Brain } from 'lucide-react';

export function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to app
  useEffect(() => {
    if (!loading && user) {
      navigate('/chat');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <MessageSquare className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl">ChannelChat</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth?signup=true')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Your favorite creators, now AI-powered
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in-up">
            Talk to Any YouTube Creator.
            <span className="text-primary"> Get Real Answers.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            Ever wished you could just ask your favorite creator a question? Now you can. 
            Voice or text. Instant answers. Every word backed by their actual videos.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
            <Button size="lg" onClick={() => navigate('/auth?signup=true')} className="h-12 px-8 text-base group">
              Start Chatting Free
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="h-12 px-8 text-base">
              Sign In
            </Button>
          </div>
        </div>

        {/* Animated Demo Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-card p-8 shadow-2xl overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 animate-gradient"></div>
            
            <div className="relative space-y-6">
              {/* Step 1: Add Channel - Animated */}
              <div className="flex items-start gap-4 animate-slide-in-left animation-delay-600">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 animate-bounce-subtle">
                  <Youtube className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-2">You paste a channel URL...</div>
                  <div className="bg-background/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 font-mono text-sm">
                    youtube.com/@YourFavoriteCreator
                  </div>
                </div>
              </div>

              {/* Step 2: Ask Question - Animated */}
              <div className="flex items-start gap-4 animate-slide-in-right animation-delay-800">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 animate-bounce-subtle animation-delay-200">
                  <Mic className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-2">You ask anything...</div>
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                    "Where does he talk about starting a business with no money?"
                  </div>
                </div>
              </div>

              {/* Step 3: Get Answer - Animated */}
              <div className="flex items-start gap-4 animate-slide-in-left animation-delay-1000">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 animate-bounce-subtle animation-delay-400">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-2">You get the answer with proof...</div>
                  <div className="bg-background/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                    <p className="text-sm">He covers this in his "Bootstrap Your Startup" video. Start by validating your idea with $0 using social media...</p>
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <Youtube className="w-4 h-4" />
                      <span className="font-medium">Video: Bootstrap Your Startup</span>
                      <span className="text-muted-foreground">• 12:34</span>
                      <span className="ml-auto px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">High Confidence</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 max-w-6xl mx-auto">
          <div className="group p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mic className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Talk or Type</h3>
            <p className="text-muted-foreground text-sm">
              Voice chat while you cook. Text when you're at your desk. Your choice.
            </p>
          </div>

          <div className="group p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">No BS Answers</h3>
            <p className="text-muted-foreground text-sm">
              Every answer shows confidence level. If it's not in their videos, we tell you.
            </p>
          </div>
          
          <div className="group p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Youtube className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Click to Verify</h3>
            <p className="text-muted-foreground text-sm">
              Timestamps link to exact moments. Trust, but verify.
            </p>
          </div>

          <div className="group p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bookmark className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Save the Gold</h3>
            <p className="text-muted-foreground text-sm">
              Bookmark insights. Build your personal knowledge vault.
            </p>
          </div>
          
          <div className="group p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Find Anything</h3>
            <p className="text-muted-foreground text-sm">
              Search all your chats. That thing you learned last month? Found it.
            </p>
          </div>

          <div className="group p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Your Eyes Only</h3>
            <p className="text-muted-foreground text-sm">
              Private conversations. Your learning journey stays yours.
            </p>
          </div>
        </div>

        {/* Problem Section */}
        <div className="mt-32 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              You Know This Pain
            </h2>
            <p className="text-lg text-muted-foreground">
              Scrolling through hours of videos, trying to find that one thing they said...
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 animate-fade-in">
              <div className="text-4xl mb-3">😤</div>
              <h3 className="font-semibold text-lg mb-2">The Endless Scroll</h3>
              <p className="text-muted-foreground text-sm">
                "I know they talked about this... was it in that 2-hour podcast or the other one?"
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 animate-fade-in animation-delay-200">
              <div className="text-4xl mb-3">💸</div>
              <h3 className="font-semibold text-lg mb-2">Can't Afford Coaching</h3>
              <p className="text-muted-foreground text-sm">
                "$300/hour? I'm trying to learn, not go broke."
              </p>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="mt-32 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Who's This For?
            </h2>
            <p className="text-lg text-muted-foreground">
              Anyone who learns from YouTube creators
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-xl transition-all">
              <div className="text-3xl mb-3">🎓</div>
              <h3 className="font-display font-semibold text-lg mb-2">Students</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Study smarter. Ask questions, get answers with sources, save the important stuff.
              </p>
              <div className="text-xs text-muted-foreground">
                "Where does he explain photosynthesis?"
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-xl transition-all">
              <div className="text-3xl mb-3">🚀</div>
              <h3 className="font-display font-semibold text-lg mb-2">Founders</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Get business advice while building. Voice chat during your commute.
              </p>
              <div className="text-xs text-muted-foreground">
                "How would she validate this idea?"
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-xl transition-all">
              <div className="text-3xl mb-3">💪</div>
              <h3 className="font-display font-semibold text-lg mb-2">Skill Builders</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Learn techniques from pros. Save tips, search when you need them.
              </p>
              <div className="text-xs text-muted-foreground">
                "What's his editing workflow?"
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 animate-fade-in">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Stop Scrolling?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start chatting with your favorite creators. Free. No credit card. Just paste a channel URL.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button size="lg" onClick={() => navigate('/auth?signup=true')} className="h-12 px-8 text-base group">
                Let's Go
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ChannelChat. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
