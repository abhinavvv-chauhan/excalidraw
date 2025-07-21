import { Tool } from "@/components/Canvas";
import { Game, Shape } from "./Game";

class DrawingController {
    private game: Game;
    private selectedTool: Tool = "pencil";
    private isDrawing = false;
    private startX = 0;
    private startY = 0;
    private currentPencilPoints: { x: number; y: number }[] = [];

    constructor(canvasElement: HTMLCanvasElement, roomId: string, socket: WebSocket) {
        this.game = new Game(canvasElement, roomId, socket);
    }
    
    public setSelectedTool(tool: Tool) {
        this.selectedTool = tool;
        this.game.setTool(tool);
    }

    public setCurrentColor(color: string) {
        this.game.setColor(color);
    }

    public mouseDownHandler = (e: MouseEvent) => {
        this.isDrawing = true;
        const worldCoords = this.game.getWorldCoordinates(e.clientX, e.clientY);
        this.startX = worldCoords.x;
        this.startY = worldCoords.y;

        if (this.selectedTool === "pencil") {
            this.currentPencilPoints = [worldCoords];
        }
    }

    public mouseMoveHandler = (e: MouseEvent) => {
        if (!this.isDrawing) return;
        const worldCoords = this.game.getWorldCoordinates(e.clientX, e.clientY);

        if (this.selectedTool === "pencil") {
            this.currentPencilPoints.push(worldCoords);
        }
        
        if (this.selectedTool === "rect" || this.selectedTool === "ellipse" || this.selectedTool === "arrow" || this.selectedTool === "triangle") {
            this.game.draw(); 
            const tempShape = this._createShape(this.startX, this.startY, worldCoords.x, worldCoords.y);
            if (tempShape) {
                this.game.drawShape(tempShape);
            }
        }
    }

    public mouseUpHandler = (e: MouseEvent) => {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        const worldCoords = this.game.getWorldCoordinates(e.clientX, e.clientY);
        const shape = this._createShape(this.startX, this.startY, worldCoords.x, worldCoords.y);

        if (shape) {
            this.game.existingShapes.push(shape);
            this.game.socket.send(JSON.stringify({
                type: "chat",
                message: JSON.stringify({ shape }),
                roomId: this.game.roomId
            }));
            this.game.draw();
            this.game.saveState();
        }
    }
    
    private _createShape(startX: number, startY: number, endX: number, endY: number): Shape | null {
        const width = endX - startX;
        const height = endY - startY;
        let shape: Shape | null = null;
        
        switch (this.selectedTool) {
            case "rect":
                shape = {
                    id: this.game.generateShapeId(),
                    type: "rect",
                    x: width > 0 ? startX : endX,
                    y: height > 0 ? startY : endY,
                    width: Math.abs(width),
                    height: Math.abs(height),
                    color: this.game.currentColor,
                };
                break;

            case "ellipse":
                shape = {
                    id: this.game.generateShapeId(),
                    type: "ellipse",
                    x: width > 0 ? startX : endX,
                    y: height > 0 ? startY : endY,
                    width: Math.abs(width),
                    height: Math.abs(height),
                    color: this.game.currentColor,
                };
                break;

            case "pencil":
                if (this.currentPencilPoints.length > 1) {
                    shape = {
                        id: this.game.generateShapeId(),
                        type: "pencil",
                        points: this.currentPencilPoints,
                        color: this.game.currentColor,
                    };
                }
                this.currentPencilPoints = [];
                break;

            case "arrow":
                shape = {
                    id: this.game.generateShapeId(),
                    type: "arrow",
                    startX: startX,
                    startY: startY,
                    endX: endX,
                    endY: endY,
                    color: this.game.currentColor,
                };
                break;

            case "triangle":
                shape = {
                    id: this.game.generateShapeId(),
                    type: "triangle",
                    x1: startX + width / 2,
                    y1: startY,
                    x2: startX,
                    y2: endY,
                    x3: endX,
                    y3: endY,
                    color: this.game.currentColor,
                };
                break;
        }
        return shape;
    }
}
