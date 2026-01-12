import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "@/pages/Landing";
import { Auth } from "@/pages/Auth";
import { Chat } from "@/pages/Chat";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AuthenticatedRoute } from "@/components";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import "./App.css";

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
            </Routes>
          </BrowserRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
