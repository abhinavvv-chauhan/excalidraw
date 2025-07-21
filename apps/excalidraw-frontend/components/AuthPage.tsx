"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PenTool } from 'lucide-react';
import Link from 'next/link';

export function AuthPage({ isSignin }: { isSignin: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (isSignin && localStorage.getItem('auth_token')) {
        const personalSlug = localStorage.getItem('personal_room_slug');
        if (personalSlug) {
            router.push(`/canvas/${personalSlug}`);
        }
    }
  }, [isSignin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isSignin ? 'http://localhost:3001/signin' : 'http://localhost:3001/signup';
    
    const body = isSignin 
      ? { username: email, password }
      : { username: email, password, name };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }
      
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_info', JSON.stringify(data.user));
      localStorage.setItem('personal_room_slug', data.roomSlug);
      
      router.push('/');
      
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unexpected error occurred');
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      ></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center items-center space-x-2 mb-8">
          <PenTool className="h-8 w-8 text-white" />
          <span className="text-3xl font-bold text-white">Excalidraw</span>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="text-3xl font-bold mb-6 text-center text-white">
            {isSignin ? 'Welcome Back' : 'Create an Account'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isSignin && (
              <div>
                <label htmlFor="name" className="text-sm font-medium text-gray-300">Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
                  required={!isSignin}
                />
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-300">Email</label>
              <input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center pt-1">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 cursor-pointer mt-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loading ? 'Loading...' : (isSignin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-400">
              {isSignin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <Link href={isSignin ? '/signup' : '/signin'} passHref>
              <span className="ml-1 font-semibold text-white hover:underline cursor-pointer">
                {isSignin ? 'Sign up' : 'Sign in'}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}