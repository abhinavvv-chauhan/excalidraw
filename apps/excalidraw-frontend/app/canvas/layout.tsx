"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";

const LoadingScreen = () => (
    <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>
);

export default function CanvasLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { status } = useSession({
        required: true,
        onUnauthenticated() {
            router.replace('/signin');
        },
    });

    if (status === 'loading') return <LoadingScreen />;
    return <>{children}</>;
}