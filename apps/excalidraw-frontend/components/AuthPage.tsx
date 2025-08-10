"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { PenTool } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const AuthLoading = () => (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-900 text-white">
        Loading session...
    </div>
);

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.021,35.596,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);

export function AuthPage({ isSignin }: { isSignin: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  const handleGoogleSignIn = () => {
    setLoading(true);
    signIn('google', { callbackUrl: '/' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isSignin 
      ? `${API_URL}/signin` 
      : `${API_URL}/signup`;
    
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
      
      router.replace('/');
      
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

  if (status !== 'unauthenticated') {
    return <AuthLoading />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noisefilter)'/%3E%3C/svg%3E")`,
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

          <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full p-3 mb-4 cursor-pointer flex items-center justify-center bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white disabled:opacity-50 disabled:scale-100"
          >
              <GoogleIcon />
              Sign {isSignin ? 'in' : 'up'} with Google
          </button>

          <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="flex-shrink mx-4 text-gray-400">OR</span>
              <div className="flex-grow border-t border-gray-600"></div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isSignin && (
              <div>
                <label htmlFor="name" className="text-sm font-medium text-gray-300">Name</label>
                <input id="name" type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all" required={!isSignin}/>
              </div>
            )}
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-300">Email</label>
              <input id="email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all" required/>
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
              <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all" required/>
            </div>
            {error && (<div className="text-red-400 text-sm text-center pt-1">{error}</div>)}
            <button type="submit" disabled={loading} className="w-full p-3 cursor-pointer mt-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100">
              {loading ? 'Loading...' : (isSignin ? 'Sign In with Email' : 'Create Account')}
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