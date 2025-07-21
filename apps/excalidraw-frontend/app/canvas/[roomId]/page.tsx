import { RoomCanvas } from "@/components/RoomCanvas";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function CanvasPage({ params }: {
    params: {
        roomId: string
    }
}) {
    const roomId = params.roomId;
    
    return (
        <ProtectedRoute>
            <RoomCanvas roomId={roomId}/>
        </ProtectedRoute>
    );
}
