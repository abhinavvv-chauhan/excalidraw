"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPage } from "@/components/AuthPage";

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('auth_token') !== null;
}

export default function Signup() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/canvas/default-room');
    }
  }, [router]);

  return <AuthPage isSignin={false} />;
}