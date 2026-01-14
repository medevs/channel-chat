import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";

export function Navigation() {
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-1/2 transform -translate-x-1/2 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 z-50 shadow-sm">
      <div className="flex justify-between items-center h-16 md:h-20">
        <Link to={user ? "/chat" : "/"} className="flex items-center space-x-2 md:space-x-3 group">
          <div className="w-8 h-8 md:w-10 md:h-10 gradient-bg rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
            <span className="text-white font-black text-base md:text-lg">CC</span>
          </div>
          <span className="text-lg md:text-2xl font-black text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
            ChannelChat
          </span>
        </Link>

        <div className="flex items-center space-x-2 md:space-x-4">
          {user ? (
            <>
              <div className="hidden sm:flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <User className="w-4 h-4" />
                <span className="font-medium text-sm md:text-base">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="font-semibold text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-sm md:text-base"
              >
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-semibold text-slate-700 dark:text-slate-300 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 text-sm md:text-base px-2 md:px-4"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="sm"
                  className="gradient-bg font-bold shadow-lg hover:shadow-xl hover:shadow-orange-500/25 transform hover:scale-105 transition-all duration-300 text-sm md:text-base px-3 md:px-4"
                >
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden">Start</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
