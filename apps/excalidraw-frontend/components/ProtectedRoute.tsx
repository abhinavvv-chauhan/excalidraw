"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('auth_token') !== null;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/signin');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}