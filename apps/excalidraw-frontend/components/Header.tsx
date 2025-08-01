"use client";

import { Button } from "@repo/ui/button";
import { PenTool, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    email: string;
    name?: string;
}

const Header = () => {
    const [user, setUser] = useState<User | null>(null);
    const [joinSlug, setJoinSlug] = useState('');
    const router = useRouter();

    useEffect(() => {
        const userInfo = localStorage.getItem("user_info");
        if (userInfo) {
            setUser(JSON.parse(userInfo));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_info");
        localStorage.removeItem("personal_room_slug");
        setUser(null);
        window.location.reload(); 
    };
    
    const handleJoinSession = () => {
        if (joinSlug.trim()) {
            router.push(`/canvas/${joinSlug.trim()}`);
        }
    };

    return (
        <header className="absolute top-0 left-0 right-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                    <PenTool className="h-7 w-7 md:h-9 md:w-9 text-white" />
                    <span className="text-2xl md:text-3xl font-bold text-white">Excalidraw</span>
                </Link>
                
                <div className="flex items-center space-x-2 md:space-x-4">
                    {user ? (
                        <>
                            <form onSubmit={(e) => { e.preventDefault(); handleJoinSession(); }} className="hidden md:flex items-center gap-2">
                                <input
                                    type="text"
                                    value={joinSlug}
                                    onChange={(e) => setJoinSlug(e.target.value)}
                                    placeholder="Enter room code..."
                                    className="p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all text-sm"
                                />
                                <Button
                                    size="sm"
                                    variant="primary"
                                    className="bg-white text-black h-9 hover:bg-gray-200 p-2 rounded-lg cursor-pointer font-semibold text-sm transition-all"
                                    onClick={handleJoinSession}
                                >
                                    Join
                                </Button>
                            </form>
                            <div className="hidden md:block w-px h-8 bg-gray-700"></div>
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="h-10 w-10 bg-gray-900 rounded-full cursor-default flex items-center justify-center text-white font-bold">
                                    {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={20} />}
                                </div>
                                <Button 
                                    onClick={handleLogout}
                                    size="sm"
                                    variant="outline" 
                                    className="text-gray-300 hover:text-white p-2 rounded-lg border-none font-semibold cursor-pointer hover:bg-gray-800 transition-colors"
                                >
                                    Logout
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link href={"/signin"}>
                                <Button 
                                    size="sm"
                                    variant="outline" 
                                    className="text-gray-300 hover:text-white px-3 py-2 md:px-4 md:py-3 rounded-xl md:rounded-3xl border-none font-semibold font-sans text-sm md:text-lg cursor-pointer hover:bg-gray-800 hover:scale-105 transition-colors">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href={"/signup"}>
                                <Button 
                                    size="sm"
                                    variant="primary"
                                    className="bg-amber-50 text-black hover:bg-gray-200 px-3 py-2 md:px-4 md:py-3 rounded-xl md:rounded-3xl cursor-pointer font-semibold text-sm md:text-lg font-sans transition-all transform hover:scale-105">
                                    Sign Up
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;