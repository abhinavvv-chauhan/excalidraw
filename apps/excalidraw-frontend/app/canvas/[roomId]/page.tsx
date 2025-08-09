"use client";

import { RoomCanvas } from "@/components/RoomCanvas";
import { useParams } from 'next/navigation'; 

export default function CanvasPage() {
    const params = useParams();
    const roomId = params.roomId as string;

    if (!roomId) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
                Loading Room...
            </div>
        );
    }
    
    return (
        <RoomCanvas roomId={roomId}/>
    );
}