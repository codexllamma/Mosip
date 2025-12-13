'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { User, ShieldCheck, Globe, Settings, Mail, Lock, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  
  // Toggle State: Login vs Signup
  const [isLogin, setIsLogin] = useState(true);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // New field for signup
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 1. DEMO LOGIN (Keeps existing hackathon functionality) ---
  const handleDemoLogin = (role: string, redirectPath: string) => {
    localStorage.setItem('mock_role', role);
    router.push(redirectPath);
  };

  // --- 2. AUTHENTICATION HANDLER ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError("Invalid email or password.");
          setLoading(false);
          return;
        }

        // Fetch real role (Bridging NextAuth -> LocalStorage for the UI)
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const realRole = session?.user?.role || 'EXPORTER'; 

        localStorage.setItem('mock_role', realRole);

        // Redirect logic
        const pathToRedirect = 
          realRole === 'QA_AGENCY' ? '/inspections' :
          realRole === 'IMPORTER' ? '/market' :
          realRole === 'ADMIN' ? '/admin' :
          '/';

        router.push(pathToRedirect);
        router.refresh();

      } else {
        // --- SIGN UP FLOW ---
        // TODO: Replace this with your actual Registration API endpoint
        console.log("Registering user:", { fullName, email, password });
        
        // Simulating a successful registration for UI feedback
        // In a real app, you would fetch('/api/register', body) here.
        
        const res = await fetch('/api/auth/signup', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ name: fullName, email, password }),
        });

        if (!res.ok) {
            throw new Error('Registration failed');
        }

        // Auto-login after signup, or switch to login view
        setIsLogin(true);
        setError(null);
        alert("Account created! Please sign in."); 
      }

    } catch (err) {
      console.error("Auth Error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const demoRoles = [
    { role: 'EXPORTER', label: 'Exporter', description: 'Export compliance & documentation', icon: User, color: 'bg-emerald-600 hover:bg-emerald-700 text-white', path: '/dashboard' },
    { role: 'QA_AGENCY', label: 'QA Agency', description: 'Quality inspections & certifications', icon: ShieldCheck, color: 'bg-blue-600 hover:bg-blue-700 text-white', path: '/inspections' },
    { role: 'IMPORTER', label: 'Importer', description: 'Browse verified products', icon: Globe, color: 'bg-purple-600 hover:bg-purple-700 text-white', path: '/market' },
    { role: 'ADMIN', label: 'Admin', description: 'System administration', icon: Settings, color: 'bg-gray-600 hover:bg-gray-700 text-white', path: '/admin' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-900 mb-2">
            Export Compliance Platform
          </h1>
          <p className="text-gray-600">
            Streamlining global trade with trust and transparency
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-emerald-900">
              {isLogin ? 'Sign In' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Enter your credentials to access your account' 
                : 'Fill in your details to join the platform'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              
              {/* Full Name - Only Visible during Signup */}
              {!isLogin && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="name" className="text-gray-700">Full Name</Label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'Signing In...' : 'Creating Account...'}
                  </>
                ) : (
                  isLogin ? 'Sign In' : 'Sign Up'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500 font-medium">OR</span>
              </div>
            </div>

            {/* Demo Mode Section */}
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-emerald-900">
                  Quick Demo Mode
                </h3>
                <p className="text-sm text-gray-600">
                  Explore different user perspectives instantly
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {demoRoles.map((demo) => {
                  const Icon = demo.icon;
                  return (
                    <button
                      key={demo.role}
                      onClick={() => handleDemoLogin(demo.role, demo.path)}
                      className={`${demo.color} p-4 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex flex-col items-start space-y-2 text-left`}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className="bg-white/20 p-2 rounded">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-lg">{demo.label}</span>
                      </div>
                      <p className="text-sm opacity-90 pl-11">{demo.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Toggle */}
            <div className="pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null); // Clear errors when switching
                  }} 
                  className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline focus:outline-none"
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}