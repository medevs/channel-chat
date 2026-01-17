import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MessageSquare, Youtube, Sparkles, Zap, Shield, BookOpen, DollarSign, Clock, CheckCircle, Star, TrendingUp, ArrowRight, Mic, Bookmark, Search, Brain, Target } from 'lucide-react';

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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Voice & Text Mentorship
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Your Personal AI Mentor from Any YouTube Creator
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Chat via voice or text with AI trained on your favorite creators' content. 
            Get confidence-backed answers with exact video timestamps and save insights for later.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth?signup=true')} className="h-12 px-8 text-base">
              Start for Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="h-12 px-8 text-base">
              Sign In
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto">
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
              <Mic className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Voice & Text Chat</h3>
            <p className="text-muted-foreground">
              Have natural voice conversations or text chats with AI mentors. Real-time transcription and hands-free learning.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Confidence-Backed Answers</h3>
            <p className="text-muted-foreground">
              Every answer includes confidence levels (high, medium, low) so you know exactly how reliable the information is.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
              <Youtube className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Exact Video Citations</h3>
            <p className="text-muted-foreground">
              Click timestamps to watch the exact moment in the video. Verify every insight directly from the source.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
              <Bookmark className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Save & Organize Insights</h3>
            <p className="text-muted-foreground">
              Bookmark valuable answers and build your personal knowledge library. Access saved insights anytime.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Full Chat Search</h3>
            <p className="text-muted-foreground">
              Search across all your conversations to find past insights instantly. Never lose valuable information.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Private & Secure</h3>
            <p className="text-muted-foreground">
              Your conversations and saved answers are completely private. Only you can access your learning journey.
            </p>
          </div>
        </div>

        {/* Problem Section */}
        <div className="mt-32 max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              The Problem with Learning from YouTube
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Creators share incredible knowledge, but finding specific insights across hundreds of hours of content is nearly impossible.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Clock className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Hours of Searching</h3>
                  <p className="text-muted-foreground">Scrolling through dozens of videos to find that one piece of advice you remember hearing.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <DollarSign className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Expensive Coaching</h3>
                  <p className="text-muted-foreground">One-on-one mentorship costs $200-500/hour, making expert guidance unaffordable for most.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <BookOpen className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Fragmented Learning</h3>
                  <p className="text-muted-foreground">Knowledge scattered across multiple videos with no way to connect the dots or ask follow-up questions.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-8 rounded-2xl border border-red-200 dark:border-red-800">
              <div className="text-center">
                <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">$300+</div>
                <p className="text-red-700 dark:text-red-300 font-medium mb-4">Average cost per hour for expert coaching</p>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-2">20+ hours</div>
                <p className="text-orange-700 dark:text-orange-300">Wasted searching through content</p>
              </div>
            </div>
          </div>
        </div>

        {/* Solution Section */}
        <div className="mt-32 max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Your Personal AI Mentor for Every Creator
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get instant access to any creator's knowledge through voice or text conversations. Ask specific questions and get precise, confidence-backed answers with video citations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-8 rounded-2xl border border-primary/20">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">$0</div>
                <p className="text-primary/80 font-medium mb-4">Cost for unlimited mentorship</p>
                <div className="text-2xl font-bold text-primary mb-2">&lt; 30 seconds</div>
                <p className="text-primary/80">To get any answer with sources</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Mic className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Voice or Text - Your Choice</h3>
                  <p className="text-muted-foreground">Have natural voice conversations while multitasking or text chat when you prefer. Real-time transcription keeps everything searchable.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Confidence-Backed Answers</h3>
                  <p className="text-muted-foreground">Every response includes confidence levels (high, medium, low) and exact video timestamps so you can verify and dive deeper.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bookmark className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Build Your Knowledge Library</h3>
                  <p className="text-muted-foreground">Save valuable insights, search past conversations, and organize your learning journey. Never lose important information again.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-32 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start learning from your favorite creators in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Youtube className="w-8 h-8 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary mb-2">1</div>
              <h3 className="font-semibold mb-2">Add Channel</h3>
              <p className="text-sm text-muted-foreground">
                Paste any YouTube channel URL and we'll index their videos
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary mb-2">2</div>
              <h3 className="font-semibold mb-2">Ask Questions</h3>
              <p className="text-sm text-muted-foreground">
                Chat via voice or text about anything from their content
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary mb-2">3</div>
              <h3 className="font-semibold mb-2">Get Cited Answers</h3>
              <p className="text-sm text-muted-foreground">
                Receive confidence-backed answers with exact video timestamps
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-8 h-8 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary mb-2">4</div>
              <h3 className="font-semibold mb-2">Save & Organize</h3>
              <p className="text-sm text-muted-foreground">
                Bookmark insights and build your personal knowledge base
              </p>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="mt-32 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Perfect for Every Learning Goal
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you're studying, building a business, or developing skills, get personalized one-to-one mentorship from the world's best creators.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-3">Students & Researchers</h3>
              <p className="text-muted-foreground mb-4">
                Get one-to-one mentorship for exam prep, research projects, and concept clarification. Save key insights and search past conversations for study sessions.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Ask complex questions with confidence-backed answers</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Verify every fact with video timestamp citations</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Build study guides from saved answers</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-3">Entrepreneurs & Founders</h3>
              <p className="text-muted-foreground mb-4">
                Get personalized business advice from successful entrepreneurs. Learn strategies, avoid mistakes, and accelerate growth without expensive consulting.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Voice chat while working on your startup</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Save actionable advice for implementation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Search past insights when making decisions</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-3">Professionals & Skill Builders</h3>
              <p className="text-muted-foreground mb-4">
                Level up your career with hands-free learning during commutes. Get specific guidance on techniques, tools, and professional development.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Voice conversations while commuting or exercising</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Organize insights by skill or project</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Track learning progress with conversation history</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof Section */}
        <div className="mt-32 max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Trusted by Learners Worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
              <p className="text-muted-foreground">Hours of content indexed</p>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <p className="text-muted-foreground">Creators available</p>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-primary mb-2">95%</div>
              <p className="text-muted-foreground">Answer accuracy rate</p>
            </div>
          </div>

          <div className="mt-16 grid md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl bg-card border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                "Instead of spending $300/hour on business coaching, I get instant advice from my favorite entrepreneurs. Game changer for my startup!"
              </p>
              <div className="font-medium">Sarah Chen, Founder</div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                "Studying for my physics degree became so much easier. I can ask specific questions and get explanations with exact video references."
              </p>
              <div className="font-medium">Marcus Rodriguez, Student</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Start Your One-to-One Mentorship Journey Today
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join learners worldwide who've unlocked unlimited access to creator knowledge through voice and text conversations. 
              Get confidence-backed answers, save insights, and build your personal knowledge library.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button size="lg" onClick={() => navigate('/auth?signup=true')} className="h-12 px-8 text-base">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="h-12 px-8 text-base">
                Sign In
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Voice & text chat</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Confidence-backed answers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Save unlimited insights</span>
              </div>
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
