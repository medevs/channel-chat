import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";

export function Navigation() {
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-1/2 transform -translate-x-1/2 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 z-50 shadow-sm">
      <div className="flex justify-between items-center h-20">
        <Link to={user ? "/chat" : "/"} className="flex items-center space-x-3 group">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
            <span className="text-white font-black text-lg">CC</span>
          </div>
          <span className="text-2xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">
            ChannelChat
          </span>
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <div className="flex items-center space-x-2 text-slate-700">
                <User className="w-4 h-4" />
                <span className="font-medium">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="lg"
                onClick={signOut}
                className="font-semibold text-slate-700 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button
                  variant="ghost"
                  size="lg"
                  className="font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="gradient-bg font-bold shadow-lg hover:shadow-xl hover:shadow-orange-500/25 transform hover:scale-105 transition-all duration-300"
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
