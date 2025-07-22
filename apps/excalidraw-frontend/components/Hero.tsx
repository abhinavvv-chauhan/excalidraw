"use client";

import { Button } from "@repo/ui/button";
import { ArrowRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HTTP_BACKEND } from "@/config"; 

function getLocalStorageItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
}

const HeroActions = () => {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        if (getLocalStorageItem('auth_token')) {
            setIsLoggedIn(true);
        }
    }, []);

    const handleCreateSession = async () => {
        const token = getLocalStorageItem('auth_token');
        if (!token) {
            router.push('/signin');
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
                if (res.status === 401 || res.status === 403) {
                    router.push('/signin');
                    return;
                }
                throw new Error('Failed to create session');
            }

            const data = await res.json();
            if (data.roomSlug) {
                router.push(`/canvas/${data.roomSlug}`);
            }

        } catch (error) {
            console.error("Error creating session:", error);
        }
    };

    const handleGoToCanvas = () => {
        if (isLoggedIn) {
            const personalSlug = getLocalStorageItem('personal_room_slug');
            if (personalSlug) {
                router.push(`/canvas/${personalSlug}`);
            } else {
                router.push('/signin');
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
            >
                Go to My Canvas
                <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
                size="lg"
                variant="primary" 
                className="bg-white text-black rounded-2xl cursor-pointer hover:bg-gray-200 font-semibold px-8 py-4 text-lg transition-all transform hover:scale-105 flex items-center gap-2"
                onClick={handleCreateSession}
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
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-600 to-gray-800 -z-10"></div>
            <div 
                className="absolute inset-0 opacity-30 -z-10"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            ></div>
            
            <div className="max-w-4xl text-center">
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