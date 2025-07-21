
import { RoomCanvas } from "@/components/RoomCanvas";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default async function CanvasPage({ params }: {
    params: Promise<{
        roomId: string
    }>
}) {
    const { roomId } = await params;
    
    return (
        <ProtectedRoute>
            <RoomCanvas roomId={roomId}/>
        </ProtectedRoute>
    );
}