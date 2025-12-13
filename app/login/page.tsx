'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, ShieldCheck, Globe, Settings, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleDemoLogin = (role: string, redirectPath: string) => {
    localStorage.setItem('mock_role', role);
    router.push(redirectPath);
  };

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const demoRoles = [
    {
      role: 'EXPORTER',
      label: 'Exporter',
      description: 'Export compliance & documentation',
      icon: User,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      path: '/dashboard',
    },
    {
      role: 'QA_AGENCY',
      label: 'QA Agency',
      description: 'Quality inspections & certifications',
      icon: ShieldCheck,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      path: '/inspections',
    },
    {
      role: 'IMPORTER',
      label: 'Importer',
      description: 'Browse verified products',
      icon: Globe,
      color: 'bg-purple-600 hover:bg-purple-700 text-white',
      path: '/market',
    },
    {
      role: 'ADMIN',
      label: 'Admin',
      description: 'System administration',
      icon: Settings,
      color: 'bg-gray-600 hover:bg-gray-700 text-white',
      path: '/admin',
    },
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
            <CardTitle className="text-2xl text-emerald-900">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleStandardLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Sign In
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500 font-medium">
                  OR
                </span>
              </div>
            </div>

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
                        <span className="font-semibold text-lg">
                          {demo.label}
                        </span>
                      </div>
                      <p className="text-sm opacity-90 pl-11">
                        {demo.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Demo mode allows instant access without authentication. Perfect
                for exploring the platform's capabilities.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Don't have an account?{' '}
            <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Contact Sales
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
