import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-orange-400 to-red-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-400 to-orange-500 rounded-full blur-3xl opacity-15"></div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="mb-12 animate-fade-in">
            <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-orange-200 rounded-full text-sm font-medium text-orange-700 mb-8">
              🚀 AI-Powered Creator Mentorship Platform
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 leading-tight">
              Learn from
              <span className="gradient-text block mt-2">Your Favorite</span>
              <span className="text-slate-900">YouTube Creators</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed font-medium">
              Get AI-powered mentorship based entirely on your favorite
              creator's content. Ask questions, get answers with{" "}
              <span className="font-bold text-orange-600">
                exact video citations
              </span>
              , and learn directly from the source.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20 animate-slide-up">
            <Link to="/signup">
              <Button
                size="lg"
                className="text-lg px-10 py-6 gradient-bg hover:shadow-2xl hover:shadow-orange-500/25 transform hover:scale-105 transition-all duration-300 font-bold"
              >
                Start Learning Now →
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-10 py-6 border-2 border-slate-300 hover:border-orange-500 hover:text-orange-600 font-semibold"
            >
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-black text-slate-900">10K+</div>
              <div className="text-sm text-slate-600 font-medium">
                Active Learners
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-slate-900">500+</div>
              <div className="text-sm text-slate-600 font-medium">Creators</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-slate-900">1M+</div>
              <div className="text-sm text-slate-600 font-medium">
                Questions Answered
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Why ChannelChat is{" "}
              <span className="gradient-text">Different</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Unlike generic AI chatbots, we provide verified, traceable
              insights directly from your chosen creators.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl border border-blue-100 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:animate-bounce-gentle">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">
                100% Verified Answers
              </h3>
              <p className="text-slate-600 text-center leading-relaxed">
                Every response includes exact video timestamps. Click to verify
                insights directly in the original content. No hallucinations,
                just facts.
              </p>
            </div>

            <div className="group p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border border-green-100 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:animate-bounce-gentle">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">
                Creator-Specific Knowledge
              </h3>
              <p className="text-slate-600 text-center leading-relaxed">
                AI trained exclusively on your chosen creator's content. No
                generic responses, just their unique insights and expertise.
              </p>
            </div>

            <div className="group p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border border-purple-100 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:animate-bounce-gentle">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">
                Save & Organize
              </h3>
              <p className="text-slate-600 text-center leading-relaxed">
                Bookmark valuable insights and build your personal knowledge
                base from multiple creators. Your learning, organized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-8">
            Ready to Learn from <span className="gradient-text">the Best</span>?
          </h2>
          <p className="text-xl text-slate-300 mb-12 leading-relaxed">
            Join thousands of learners getting personalized mentorship from
            their favorite YouTube creators.
          </p>
          <Link to="/signup">
            <Button
              size="lg"
              className="text-lg px-12 py-6 gradient-bg hover:shadow-2xl hover:shadow-orange-500/25 transform hover:scale-105 transition-all duration-300 font-bold"
            >
              Get Started Free →
            </Button>
          </Link>
          <p className="text-sm text-slate-400 mt-6">
            No credit card required • 7-day free trial
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
