import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "@/pages/Landing";
import { Auth } from "@/pages/Auth";
import { Chat } from "@/pages/Chat";
import CreatorProfile from "@/pages/CreatorProfile";
import { VoiceConversations } from "@/pages/VoiceConversations";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AuthenticatedRoute } from "@/components";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route 
                path="/" 
                element={
                  <AuthenticatedRoute>
                    <Landing />
                  </AuthenticatedRoute>
                } 
              />
              <Route 
                path="/auth" 
                element={
                  <AuthenticatedRoute>
                    <Auth />
                  </AuthenticatedRoute>
                } 
              />
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/creator/:creatorId" 
                element={
                  <ProtectedRoute>
                    <CreatorProfile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/voice-conversations" 
                element={
                  <ProtectedRoute>
                    <VoiceConversations />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
