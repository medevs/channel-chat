import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function Chat() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      setSignOutError(null);
      await signOut();
      navigate("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sign out";
      setSignOutError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <Navigation />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-orange-200 rounded-full text-sm font-medium text-orange-700 mb-8">
              🎉 Welcome to ChannelChat!
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6">
              Hello, {user?.user_metadata?.full_name || user?.email || 'User'}!
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              You've successfully signed in to ChannelChat. The chat interface is coming soon!
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Coming Soon: AI Creator Chat
            </h2>
            <p className="text-slate-600 mb-6">
              Soon you'll be able to chat with AI mentors trained on your favorite YouTube creators' content.
              Get ready for personalized learning experiences!
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="font-bold text-blue-900 mb-2">📺 Add Creators</div>
                <div className="text-blue-700">Connect your favorite YouTube channels</div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="font-bold text-green-900 mb-2">💬 Chat & Learn</div>
                <div className="text-green-700">Ask questions and get personalized answers</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="font-bold text-purple-900 mb-2">🔗 Verify Sources</div>
                <div className="text-purple-700">Click timestamps to verify insights</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {signOutError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 font-medium">{signOutError}</p>
              </div>
            )}
            <p className="text-slate-500 text-sm">
              Signed in as: <span className="font-medium">{user?.email}</span>
            </p>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-2 border-slate-300 hover:border-orange-500 hover:text-orange-600 font-semibold"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}