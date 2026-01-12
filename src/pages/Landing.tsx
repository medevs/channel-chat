import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MessageSquare, Youtube, Sparkles, Zap, Shield, BookOpen, DollarSign, Clock, CheckCircle, Star, Users, TrendingUp, ArrowRight } from 'lucide-react';

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
            AI-Powered Creator Chat
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Chat with Any YouTube Creator's Knowledge
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Add your favorite YouTube channels and ask questions about their content. 
            Get instant answers with source citations and timestamps.
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
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
              <Youtube className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Add Any Channel</h3>
            <p className="text-muted-foreground">
              Paste a YouTube channel URL and we'll index all their videos automatically.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Instant Answers</h3>
            <p className="text-muted-foreground">
              Ask any question and get AI-powered answers with exact video timestamps.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Private & Secure</h3>
            <p className="text-muted-foreground">
              Your chat history is private. Only you can see your conversations.
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
              Get instant access to any creator's knowledge through AI-powered conversations. Ask specific questions and get precise answers with video citations.
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
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Instant Expert Access</h3>
                  <p className="text-muted-foreground">Chat with AI trained on your favorite creator's entire content library. Get personalized advice instantly.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Verified Answers</h3>
                  <p className="text-muted-foreground">Every response includes exact video timestamps so you can verify and dive deeper into the original content.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Unlimited Learning</h3>
                  <p className="text-muted-foreground">Ask as many questions as you want. Build your knowledge systematically without time or cost constraints.</p>
                </div>
              </div>
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
              Whether you're studying, building a business, or developing skills, get personalized guidance from the world's best creators.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-3">Students & Researchers</h3>
              <p className="text-muted-foreground mb-4">
                Study complex topics by chatting with educational creators. Get explanations, examples, and study guidance tailored to your questions.
              </p>
              <div className="text-sm text-muted-foreground">
                <strong>Example:</strong> "Explain quantum mechanics like Veritasium would, with practical examples"
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-3">Entrepreneurs & Founders</h3>
              <p className="text-muted-foreground mb-4">
                Get business advice from successful entrepreneurs. Learn from their experiences, strategies, and lessons without expensive consulting.
              </p>
              <div className="text-sm text-muted-foreground">
                <strong>Example:</strong> "How would Gary Vaynerchuk approach social media marketing for a SaaS startup?"
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-3">Professionals & Creators</h3>
              <p className="text-muted-foreground mb-4">
                Level up your skills by learning from industry experts. Get specific advice on techniques, tools, and career development.
              </p>
              <div className="text-sm text-muted-foreground">
                <strong>Example:</strong> "What editing techniques does Peter McKinnon recommend for cinematic videos?"
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
              Start Learning from Your Favorite Creators Today
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of learners who've unlocked unlimited access to creator knowledge. 
              No more expensive coaching or endless video searching.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/auth?signup=true')} className="h-12 px-8 text-base">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="h-12 px-8 text-base">
                Sign In
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Free to start • No credit card required • Add any YouTube channel
            </p>
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
