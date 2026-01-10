import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "@/pages/Landing";
import { SignIn } from "@/pages/SignIn";
import { SignUp } from "@/pages/SignUp";
import { Chat } from "@/pages/Chat";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AuthenticatedRoute } from "@/components";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./App.css";

function App() {
  return (
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
              path="/signin" 
              element={
                <AuthenticatedRoute>
                  <SignIn />
                </AuthenticatedRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <AuthenticatedRoute>
                  <SignUp />
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
  );
}

export default App;
