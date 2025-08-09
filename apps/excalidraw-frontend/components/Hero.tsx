"use client";

import { Button } from "@repo/ui/button";
import { ArrowRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { HTTP_BACKEND } from "@/config";

const HeroActions = () => {
    const router = useRouter();
    // Use the entire session object as the single source of truth.
    const { data: session, status } = useSession();

    const handleCreateSession = async () => {
        // If the session is still loading or not authenticated, redirect to signin.
        if (status !== 'authenticated') {
            router.push('/signin');
            return;
        }

        // Get the token directly from the session object.
        const token = session.backendToken;

        if (!token) {
            alert("Your session seems to be invalid. Please try logging out and back in.");
            return;
        }

        try {
            const res = await fetch(`${HTTP_BACKEND}/create-collab-room`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Failed to create session');
            }

            const data = await res.json();
            if (data.roomSlug) {
                router.push(`/canvas/${data.roomSlug}`);
            }
        } catch (error) {
            console.error("Error creating session:", error);
            // If creating a session fails, it might be due to an expired token.
            router.push('/signin');
        }
    };

    const handleGoToCanvas = () => {
        if (status === 'authenticated') {
            // Get the slug directly from the session object, not localStorage.
            const personalSlug = session.roomSlug;
            if (personalSlug) {
                router.push(`/canvas/${personalSlug}`);
            } else {
                alert("Could not find your personal canvas. Please try logging out and back in.");
            }
        } else {
            router.push('/signin');
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
                size="lg"
                variant="secondary"
                className="bg-transparent border border-white text-white rounded-2xl cursor-pointer hover:bg-white hover:text-black font-semibold px-8 py-4 text-lg transition-all transform hover:scale-105 flex items-center gap-2"
                onClick={handleGoToCanvas}
                // Disable the button while the session is loading to prevent race conditions.
                disabled={status === 'loading'}
            >
                Go to My Canvas
                <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
                size="lg"
                variant="primary" 
                className="bg-white text-black rounded-2xl cursor-pointer hover:bg-gray-200 font-semibold px-8 py-4 text-lg transition-all transform hover:scale-105 flex items-center gap-2"
                onClick={handleCreateSession}
                // Disable the button while the session is loading.
                disabled={status === 'loading'}
            >
                Create a Session
                <Users className="h-5 w-5" />
            </Button>
        </div>
    );
};

export const Hero = () => {
    return (
        <section className="min-h-screen relative flex items-center justify-center px-6 overflow-hidden pt-32">
            {/* The rest of your Hero component JSX remains the same */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-600 to-gray-800"></div>
            <div 
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            ></div>
            
            <div className="max-w-4xl text-center relative z-10">
                <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 leading-tight">
                    Draw, Create,
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-white">
                        Collaborate
                    </span>
                </h1>
                
                <p className="text-xl text-gray-100 mb-12 max-w-2xl mx-auto leading-relaxed">
                    A minimalist drawing tool that lets you sketch diagrams, wireframes, and ideas with ease. 
                    Simple, fast, and collaborative.
                </p>
                
                <HeroActions />
            </div>
        </section>
    );
};