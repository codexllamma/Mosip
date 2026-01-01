'use client';

import { useState } from 'react';
// 👇 CHANGE 1: Use the localized router
import { useRouter } from '@/i18n/routing'; 
// 👇 CHANGE 2: Get current language
import { useLocale, useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { 
  User, ShieldCheck, Globe, Settings, Mail, Lock, 
  Loader2, AlertCircle, UserPlus, ArrowRight, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale(); 
  const t = useTranslations('Auth');
  const tRoles = useTranslations('Roles');

  const [isLogin, setIsLogin] = useState(true);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('EXPORTER'); // Default role
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 1. STANDARD AUTH HANDLER ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // LOGIN FLOW
        const result = await signIn('credentials', { 
            redirect: false, 
            email, 
            password,
            // 👇 Ensure we redirect to the localized dashboard
            callbackUrl: `/${locale}/dashboard`
        });
        
        if (result?.error) {
          setError(t('error_invalid'));
          setLoading(false);
          return;
        }

        await finalizeLogin();

      } else {
        // SIGNUP FLOW
        const res = await fetch('/api/auth/signup', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
               name: fullName, 
               email, 
               password,
               role: role // Send selected role to API
             }),
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Registration failed');
        }
        
        setIsLogin(true);
        setError(null);
        alert("Account created successfully! Please sign in."); 
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  // --- SMART DEMO LOGIN HANDLER ---
  const handleDemoLogin = async (role: string, demoEmail: string, redirectPath: string) => {
    setLoading(true);
    setError(null);
    const demoPassword = "password123"; // Standard password for all demo users

    try {
      // 1. Attempt to Login first
      const result = await signIn('credentials', { 
        redirect: false, 
        email: demoEmail, 
        password: demoPassword,
        callbackUrl: `/${locale}/dashboard`
      });

      if (!result?.error) {
        // Login successful! Bridge the session and redirect.
        await finalizeLogin(redirectPath);
        return;
      }

      // 2. Login failed? User doesn't exist. Auto-Register them now.
      console.log(`Creating demo user for role: ${role}...`);
      
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: `Demo ${role.replace('_', ' ')}`, // e.g. "Demo QA Agency"
          email: demoEmail, 
          password: demoPassword,
          role: role // <--- CRITICAL: Sending the specific role to your API
        }),
      });

      // With the API fix, existing users will return 200 (healed) or 201 (created)
      if (res.ok) {
        // 3. Registration/Healing successful. Login automatically.
        const retryResult = await signIn('credentials', { 
          redirect: false, 
          email: demoEmail, 
          password: demoPassword,
          callbackUrl: `/${locale}/dashboard`
        });
        
        if (!retryResult?.error) {
          await finalizeLogin(redirectPath);
          return;
        }
      }
      
      throw new Error("Could not initialize demo user.");

    } catch (err) {
      console.error("Demo Error:", err);
      setError("Demo login failed. Please try signing up manually.");
      setLoading(false);
    }
  };

  // Helper to handle the post-login redirect (used by both standard and demo auth)
  const finalizeLogin = async (customRedirect?: string) => {
    try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
            const session = await sessionRes.json();
            const realRole = session?.user?.role || 'EXPORTER'; 
            localStorage.setItem('mock_role', realRole); // Legacy support
        }
    } catch (e) {
        console.warn("Session fetch warning", e);
    }
    
    // Redirect based on intent or default
    // We default to /dashboard to match your new structure
    router.push(customRedirect || '/dashboard');
    router.refresh();
  };

  // --- DEMO ROLES CONFIG ---
  const demoRoles = [
    { 
      role: 'EXPORTER', 
      email: 'exporter@demo.com', 
      label: tRoles('EXPORTER_LABEL'), 
      description: tRoles('EXPORTER_DESC'), 
      icon: User, 
      color: 'from-emerald-500 to-emerald-700',
      path: '/' 
    },
    { 
      role: 'QA_AGENCY', 
      email: 'qa@demo.com', 
      label: tRoles('QA_LABEL'), 
      description: tRoles('QA_DESC'), 
      icon: ShieldCheck, 
      color: 'from-blue-500 to-blue-700',
      path: '/' // Redirects straight to their work
    },
    { 
      role: 'IMPORTER', 
      email: 'importer@demo.com', 
      label: tRoles('IMPORTER_LABEL'), 
      description: tRoles('IMPORTER_DESC'), 
      icon: Globe, 
      color: 'from-purple-500 to-purple-700',
      path: '/' 
    },
    { 
      role: 'ADMIN', 
      email: 'admin@demo.com', 
      label: tRoles('ADMIN_LABEL'), 
      description: tRoles('ADMIN_DESC'), 
      icon: Settings, 
      color: 'from-gray-600 to-gray-800',
      path: '/' 
    },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-emerald-200 via-slate-50 to-emerald-300">
      
      {/* Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 z-10">
        
        {/* Left Side */}
        <div className="hidden lg:flex flex-col justify-center space-y-6 text-slate-800 p-8">
          <div className="bg-white/80 backdrop-blur-sm w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4">
             <Globe className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-900">
            {t.rich('hero_headline', { br: () => <br/> })}
          </h1>
          <p className="text-lg text-slate-700 leading-relaxed max-w-md font-medium">
            {t('hero_subheadline')}
          </p>
          <div className="flex items-center space-x-4 pt-4">
            <div className="flex -space-x-2">
              {[1,2,3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
              ))}
            </div>
            <p className="text-sm font-medium text-slate-600">{t('trusted_by')}</p>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="space-y-1 pb-2 border-b border-slate-100 bg-slate-50/50 p-8">
            <CardTitle className="text-2xl font-bold text-slate-900">
              {isLogin ? t('login_title') : t('signup_title')}
            </CardTitle>
            <CardDescription className="text-base text-slate-500">
              {isLogin ? t('login_desc') : t('signup_desc')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8 space-y-6">
            
            {error && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              
              {!isLogin && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700 font-medium">{t('label_name')}</Label>
                    <div className="relative group">
                        <UserPlus className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                        <Input
                        id="name"
                        placeholder={t('placeholder_name')}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="text-slate-700 pl-10 h-11 bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        required={!isLogin}
                        />
                    </div>
                  </div>

                  {/* ROLE SELECTION DROPDOWN */}
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-slate-700 font-medium">{t('label_role')}</Label>
                    <Select onValueChange={setRole} defaultValue={role}>
                      <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900">
                        <SelectValue placeholder={t('placeholder_role')} />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-700 shadow-xl z-50 max-h-[200px]">
                        <SelectItem value="EXPORTER" className="hover:bg-slate-100 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700">
                          {tRoles('EXPORTER_SELECT')}
                        </SelectItem>
                        <SelectItem value="QA_AGENCY" className="hover:bg-slate-100 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700">
                          {tRoles('QA_SELECT')}
                        </SelectItem>
                        <SelectItem value="IMPORTER" className="hover:bg-slate-100 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700">
                          {tRoles('IMPORTER_SELECT')}
                        </SelectItem>
                        <SelectItem value="ADMIN" className="hover:bg-slate-100 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700">
                          {tRoles('ADMIN_SELECT')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">{t('label_email')}</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('placeholder_email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-black pl-10 h-11 bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 font-medium">{t('label_password')}</Label>
                  {isLogin && <a href="#" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">{t('forgot')}</a>}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('placeholder_password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-black pl-10 h-11 bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t('processing')}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>{isLogin ? t('btn_signin') : t('btn_signup')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-medium tracking-wider flex items-center gap-1">
                  <Zap className="h-3 w-3 text-emerald-500 fill-emerald-500" /> 
                  {t('demo_access')}
                </span>
              </div>
            </div>

            {/* Functional Demo Grid */}
            <div className="grid grid-cols-2 gap-3">
              {demoRoles.map((demo) => {
                const Icon = demo.icon;
                return (
                  <button
                    key={demo.role}
                    disabled={loading}
                    onClick={() => handleDemoLogin(demo.role, demo.email, demo.path)}
                    className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-3 hover:shadow-md hover:border-emerald-200 transition-all text-left disabled:opacity-50"
                  >
                      <div className={`absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${demo.color}`} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${demo.color} text-white shadow-sm`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 group-hover:text-emerald-800 transition-colors">{demo.label}</p>
                          <p className="text-[10px] text-slate-400 leading-tight">{t('one_click')}</p>
                        </div>
                      </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Toggle */}
            <div className="text-center">
              <p className="text-sm text-slate-500">
                {isLogin ? t('footer_new') + " " : t('footer_existing') + " "}
                <button 
                  onClick={() => { setIsLogin(!isLogin); setError(null); }} 
                  className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                >
                  {isLogin ? t('link_signup') : t('link_login')}
                </button>
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}