import { RoomCanvas } from "@/components/RoomCanvas";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default async function CanvasPage({params}:{
    params: {
        roomId: string
    }
}){
    const roomId = (await params).roomId;
    
    return (
        <ProtectedRoute>
            <RoomCanvas roomId={roomId}/>
        </ProtectedRoute>
    );
}
