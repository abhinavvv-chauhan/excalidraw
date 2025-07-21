import { HTTP_BACKEND } from "@/config";
import axios from "axios";
import { Shape } from "./Game"; 


export async function getExistingShapes(roomSlug: string): Promise<Shape[]> {
    try {
        const res = await axios.get(`${HTTP_BACKEND}/shapes/${roomSlug}`);
        
        const shapesFromApi = res.data.shapes;
        if (Array.isArray(shapesFromApi)) {
            return shapesFromApi;
        }
        return [];

    } catch (error) {
        console.error("Failed to fetch existing shapes:", error);
        return [];
    }
}
