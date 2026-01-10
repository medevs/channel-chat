import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { validateEmail } from "@/lib/validation";
import type { SignUpFormData } from "@/types/auth";

export function SignUp() {
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleOAuthClick = (provider: string) => {
    // TODO: Implement OAuth authentication
    alert(`${provider} authentication coming soon!`);
  };

  const handleTermsClick = (e: React.MouseEvent, type: string) => {
    e.preventDefault();
    alert(`${type} page coming soon!`);
  };

  const validateForm = (): string | null => {
    if (!formData.fullName.trim()) {
      return "Full name is required";
    }
    
    const emailError = validateEmail(formData.email);
    if (emailError) return emailError;
    
    if (formData.password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match";
    }
    if (!formData.terms) {
      return "You must agree to the Terms of Service and Privacy Policy";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await signUp(formData.email, formData.password, formData.fullName);
      // Show email confirmation message instead of redirecting
      setUserEmail(formData.email);
      setEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <Navigation />

      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden py-12 pt-24">
        {/* Background decoration */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-orange-400 to-red-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-400 to-orange-500 rounded-full blur-3xl opacity-15"></div>

        <div className="w-full max-w-md relative z-10">
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-black text-slate-900">
                Create your account
              </CardTitle>
              <CardDescription className="text-lg text-slate-600">
                Start learning from your favorite YouTube creators today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {emailSent ? (
                // Email confirmation message
                <div className="text-center space-y-6">
                  <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-green-900 mb-2">
                      Check Your Email!
                    </h3>
                    <p className="text-green-700 mb-4">
                      We sent a confirmation email to <span className="font-semibold">{userEmail}</span>
                    </p>
                    <p className="text-sm text-green-600">
                      Please check your inbox and click the confirmation link to activate your account.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-slate-600 text-sm">
                      Didn't receive the email? Check your spam folder or{" "}
                      <button 
                        onClick={() => {
                          setEmailSent(false);
                          setError(null);
                        }}
                        className="text-orange-600 hover:text-orange-700 font-bold underline"
                      >
                        try again
                      </button>
                    </p>
                    
                    <Link
                      to="/signin"
                      className="inline-block w-full"
                    >
                      <Button className="w-full h-12 text-lg gradient-bg font-bold shadow-lg hover:shadow-xl hover:shadow-orange-500/25 transform hover:scale-105 transition-all duration-300">
                        Go to Sign In →
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                // Original signup form
                <>
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                  )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="fullName"
                    className="block text-left text-sm font-bold text-slate-900 uppercase tracking-wide"
                  >
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full h-12 text-lg border-2 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-left text-sm font-bold text-slate-900 uppercase tracking-wide"
                  >
                    Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full h-12 text-lg border-2 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-left text-sm font-bold text-slate-900 uppercase tracking-wide"
                  >
                    Password
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full h-12 text-lg border-2 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-left text-sm font-bold text-slate-900 uppercase tracking-wide"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full h-12 text-lg border-2 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl"
                  />
                </div>

                <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <input
                    type="checkbox"
                    id="terms"
                    name="terms"
                    checked={formData.terms}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="mt-1 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-slate-700 leading-relaxed"
                  >
                    I agree to the{" "}
                    <a
                      href="#"
                      onClick={(e) => handleTermsClick(e, "Terms of Service")}
                      className="text-orange-600 hover:text-orange-700 font-bold underline"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="#"
                      onClick={(e) => handleTermsClick(e, "Privacy Policy")}
                      className="text-orange-600 hover:text-orange-700 font-bold underline"
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-lg gradient-bg font-bold shadow-lg hover:shadow-xl hover:shadow-orange-500/25 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? "Creating Account..." : "Create Account →"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-slate-500 font-bold tracking-wide">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleOAuthClick("Google")}
                  className="w-full h-12 border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 font-semibold"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOAuthClick("Facebook")}
                  className="w-full h-12 border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 font-semibold"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Button>
              </div>

              <p className="text-center text-slate-600">
                Already have an account?{" "}
                <Link
                  to="/signin"
                  className="text-orange-600 hover:text-orange-700 font-bold"
                >
                  Sign in
                </Link>
              </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
