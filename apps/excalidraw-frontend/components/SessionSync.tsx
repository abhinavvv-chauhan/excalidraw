"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function SessionSync() {
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "authenticated") {
            if (session?.backendToken && session.user && session.roomSlug) {
                localStorage.setItem('auth_token', session.backendToken);
                localStorage.setItem('user_info', JSON.stringify(session.user));
                localStorage.setItem('personal_room_slug', session.roomSlug);
            }
        } else if (status === "unauthenticated") {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            localStorage.removeItem('personal_room_slug');
        }
    }, [session, status]);

    return null;
}