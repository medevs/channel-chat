import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AuthenticatedRouteProps {
  children: ReactNode;
}

export function AuthenticatedRoute({ children }: AuthenticatedRouteProps) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/chat" replace />;
  }
  
  return <>{children}</>;
}
