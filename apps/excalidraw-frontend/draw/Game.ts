import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";

export type Shape = {
    id: string;
    type: "rect";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
} | {
    id: string;
    type: "ellipse";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
} | {
    id: string;
    type: "pencil";
    points: { x: number; y: number }[];
    color: string;
} |  {
    id: string;
    type: "arrow";
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
} | {
    id:string;
    type: "triangle";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
    color: string;
} | {
    id: string;
    type: "text";
    x: number;
    y: number;
    text: string;
    color: string;
    fontSize?: number;
    fontFamily?: string;
    width?: number;
};


export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    public existingShapes: Shape[] = [];
    public roomId: string;
    private isDrawing = false;
    private startX = 0;
    private startY = 0;
    private selectedTool: Tool = "pencil";
    public currentColor: string = "#ffffff";
    private currentPencilPoints: { x: number; y: number }[] = [];
    private isEraserActive = false;
    private eraserSize = 20;
    private cameraOffset = { x: 0, y: 0 };
    private cameraZoom = 1;
    private MAX_ZOOM = 5;
    private MIN_ZOOM = 0.1;
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    socket: WebSocket;
    
    private selectedShape: Shape | null = null;
    private currentAction: { 
        type: 'moving' | 'resizing'; 
        handle: 'tl' | 'tr' | 'bl' | 'br' | 'body';
        initialShapeState: Shape;
    } | null = null;
    private actionStartPoint = { x: 0, y: 0 };

    private history: Shape[][] = [];
    private historyIndex = -1;
    public onHistoryChange: (canUndo: boolean, canRedo: boolean) => void = () => {};


    constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.roomId = roomId;
        this.socket = socket;
        this.cameraOffset = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.init();
        this.initHandlers();
        this.initEventListeners();
        this.saveState();
    }
    
    private initEventListeners() {
        this.canvas.addEventListener("mousedown", this.mouseDownHandler);
        this.canvas.addEventListener("mouseup", this.mouseUpHandler);
        this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
        this.canvas.addEventListener("wheel", this.wheelHandler, { passive: false });
        window.addEventListener("keydown", this.keyDownHandler);
        window.addEventListener("keyup", this.keyUpHandler);
        window.addEventListener("resize", this.onResize);
    }
    
    private onResize = () => {
        this.draw();
    }

    destroy() {
        this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
        this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
        this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
        this.canvas.removeEventListener("wheel", this.wheelHandler);
        window.removeEventListener("keydown", this.keyDownHandler);
        window.removeEventListener("keyup", this.keyUpHandler);
        window.removeEventListener("resize", this.onResize);
    }
    
    public setColor(color: string) {
        this.currentColor = color;
    }
    
    public setTool(tool: Tool) {
        this.selectedTool = tool;
        this.selectedShape = null;
        this.currentAction = null;
        this.draw();

        if (tool === "eraser") {
            this.isEraserActive = true;
            this.canvas.style.cursor = "none";
        } else if (tool === "text") {
            this.isEraserActive = false;
            this.canvas.style.cursor = "text";
        } else if (tool === "grab") {
            this.isEraserActive = false;
            this.canvas.style.cursor = "grab";
        } else if (tool === "select") {
            this.isEraserActive = false;
            this.canvas.style.cursor = "default";
        } else {
            this.isEraserActive = false;
            this.canvas.style.cursor = "crosshair";
        }
    }

    private async init() {
        const shapes = await getExistingShapes(this.roomId);
        this.existingShapes = shapes;
        this.saveState();
        this.draw();
    }

    private initHandlers() {
        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === "chat") {
                const content = JSON.parse(message.message);
                
                if (content.shape) {
                    const existingIndex = this.existingShapes.findIndex(s => s.id === content.shape.id);
                    if (existingIndex !== -1) {
                        this.existingShapes[existingIndex] = content.shape;
                    } else {
                        this.existingShapes.push(content.shape);
                    }
                } else if (content.action === 'erase' && content.shapeId) {
                    this.existingShapes = this.existingShapes.filter(s => s.id !== content.shapeId);
                }
                
                this.draw();
            }
        };
    }

    draw() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.fillStyle = "rgb(18, 18, 18)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.cameraOffset.x, this.cameraOffset.y);
        this.ctx.scale(this.cameraZoom, this.cameraZoom);
        this.ctx.lineWidth = 2 / this.cameraZoom;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        this.existingShapes.forEach((shape) => this.drawShape(shape));
        
        if (this.selectedShape) {
            this.drawSelectionBox(this.selectedShape);
        }

        this.ctx.restore();
    }
    
    mouseDownHandler = (e: MouseEvent) => {
        if ((e.target as HTMLElement).nodeName === 'TEXTAREA') return;
        
        const worldCoords = this.getWorldCoordinates(e.clientX, e.clientY);
        this.actionStartPoint = worldCoords;

        if (this.selectedTool === 'select') {
            const handle = this.selectedShape ? this.getResizeHandleAt(worldCoords, this.selectedShape) : null;
            if (handle) {
                this.currentAction = { type: 'resizing', handle, initialShapeState: JSON.parse(JSON.stringify(this.selectedShape)) };
            } else {
                const clickedShape = this.getShapeAt(worldCoords);
                this.selectedShape = clickedShape;
                if (clickedShape) {
                    this.currentAction = { type: 'moving', handle: 'body', initialShapeState: JSON.parse(JSON.stringify(clickedShape)) };
                } else {
                    this.currentAction = null;
                }
            }
            this.draw();
            return;
        }

        if (this.selectedTool === 'grab' || e.button === 1 || this.isPanning) {
            this.isPanning = true;
            this.canvas.style.cursor = 'grabbing';
            this.panStart = { x: e.clientX - this.cameraOffset.x, y: e.clientY - this.cameraOffset.y };
            return;
        }

        if (this.selectedTool === 'text') return;
        
        this.isDrawing = true;
        if (this.selectedTool === 'eraser') {
            this.eraseShapesAtPoint(worldCoords.x, worldCoords.y);
        } else {
            this.startX = worldCoords.x;
            this.startY = worldCoords.y;
            if (this.selectedTool === "pencil") {
                this.currentPencilPoints = [worldCoords];
            }
        }
    }
    
    mouseMoveHandler = (e: MouseEvent) => {
        const worldCoords = this.getWorldCoordinates(e.clientX, e.clientY);
        const screenCoords = this.getScreenCoordinates(e);
        const dx = worldCoords.x - this.actionStartPoint.x;
        const dy = worldCoords.y - this.actionStartPoint.y;

        if (this.currentAction && this.selectedShape) {
            if (this.currentAction.type === 'moving') {
                this.moveShape(this.selectedShape, dx, dy, this.currentAction.initialShapeState);
            } else if (this.currentAction.type === 'resizing') {
                this.resizeShape(this.selectedShape, dx, dy, this.currentAction.handle, this.currentAction.initialShapeState);
            }
            this.draw();
            return;
        }

        if (this.isPanning) {
            this.cameraOffset.x = e.clientX - this.panStart.x;
            this.cameraOffset.y = e.clientY - this.panStart.y;
            this.draw();
            return;
        }
        
        this.handleToolCursor(worldCoords);
        
        if (this.selectedTool === 'eraser') {
            this.draw();
            this.drawEraserPreview(screenCoords.x, screenCoords.y);
            if (this.isDrawing) {
                this.eraseShapesAtPoint(worldCoords.x, worldCoords.y);
            }
            return;
        }

        if (!this.isDrawing) return;

        this.draw();
        this.ctx.save();
        this.ctx.translate(this.cameraOffset.x, this.cameraOffset.y);
        this.ctx.scale(this.cameraZoom, this.cameraZoom);
        if (this.selectedTool === 'pencil') {
            this.currentPencilPoints.push(worldCoords);
            this.drawPencilPath(this.currentPencilPoints, this.currentColor);
        } else {
            const tempShape = this.createShape(this.startX, this.startY, worldCoords.x, worldCoords.y);
            if (tempShape) {
                this.drawShape(tempShape);
            }
        }
        this.ctx.restore();
    }

    mouseUpHandler = (e: MouseEvent) => {
        if (this.currentAction && this.selectedShape) {
            this.socket.send(JSON.stringify({ type: "chat", message: JSON.stringify({ shape: this.selectedShape }), roomId: this.roomId }));
            this.currentAction = null;
            this.saveState();
        }

        if (this.isPanning) {
            this.isPanning = false;
            this.handleToolCursor(this.getWorldCoordinates(e.clientX, e.clientY));
            return;
        }
        
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.selectedTool === 'text' || this.selectedTool === 'select' || this.selectedTool === 'eraser' || this.selectedTool === 'grab') {
            return;
        };

        const worldCoords = this.getWorldCoordinates(e.clientX, e.clientY);
        let shape: Shape | null = null;
        if (this.selectedTool === "pencil") {
            if (this.currentPencilPoints.length > 1) {
                shape = { id: 'temp', type: "pencil", points: this.currentPencilPoints, color: this.currentColor };
            }
            this.currentPencilPoints = [];
        } else {
            shape = this.createShape(this.startX, this.startY, worldCoords.x, worldCoords.y);
        }
        if (shape) {
            shape.id = this.generateShapeId();
            this.existingShapes.push(shape);
            this.socket.send(JSON.stringify({ type: "chat", message: JSON.stringify({ shape }), roomId: this.roomId }));
            this.saveState();
        }
        this.draw();
    }
    
    wheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        
        if (e.ctrlKey) {
            const zoomAmount = e.deltaY * 0.01;
            const screenCoords = this.getScreenCoordinates(e);
            const mouseX = (screenCoords.x - this.cameraOffset.x) / this.cameraZoom;
            const mouseY = (screenCoords.y - this.cameraOffset.y) / this.cameraZoom;
            
            const newZoom = this.cameraZoom - zoomAmount * this.cameraZoom;
            this.cameraZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, newZoom));
            
            this.cameraOffset.x = screenCoords.x - mouseX * this.cameraZoom;
            this.cameraOffset.y = screenCoords.y - mouseY * this.cameraZoom;
        } else {
            this.cameraOffset.x -= e.deltaX;
            this.cameraOffset.y -= e.deltaY;
        }
        
        this.draw();
    }

    keyDownHandler = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !this.isPanning) {
            this.isPanning = true;
            this.canvas.style.cursor = 'grab';
        }
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            this.undo();
        }
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            this.redo();
        }
    }
    
    keyUpHandler = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            this.isPanning = false;
            this.handleToolCursor(this.getWorldCoordinates(0, 0));
        }
    }
    
    private handleToolCursor(worldCoords: { x: number, y: number }) {
        if (this.selectedTool === 'select') {
            const handle = this.selectedShape ? this.getResizeHandleAt(worldCoords, this.selectedShape) : null;
            if (handle) {
                this.canvas.style.cursor = (handle === 'tl' || handle === 'br') ? 'nwse-resize' : 'nesw-resize';
            } else {
                this.canvas.style.cursor = this.getShapeAt(worldCoords) ? 'move' : 'default';
            }
        } else if (this.selectedTool === 'grab') {
            this.canvas.style.cursor = 'grab';
        } else if (this.selectedTool === 'eraser') {
            this.canvas.style.cursor = 'none';
        } else if (this.selectedTool === 'text') {
            this.canvas.style.cursor = 'text';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }
    
    public addText(text: string, worldX: number, worldY: number) {
        if (!text.trim()) return;
        const shape: Shape = {
            id: this.generateShapeId(),
            type: "text",
            x: worldX,
            y: worldY,
            text: text,
            color: this.currentColor,
            fontSize: 20, 
            fontFamily: "monospace",
            width: 300
        };
        this.existingShapes.push(shape);
        this.socket.send(JSON.stringify({ type: "chat", message: JSON.stringify({ shape }), roomId: this.roomId }));
        this.saveState();
        this.draw();
    }

    public generateShapeId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    public getScreenCoordinates(event: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    
    public getWorldCoordinates(screenX: number, screenY: number) {
        return {
            x: (screenX - this.cameraOffset.x) / this.cameraZoom,
            y: (screenY - this.cameraOffset.y) / this.cameraZoom
        };
    }
    
    public getCanvasElement(): HTMLCanvasElement {
        return this.canvas;
    }

    public getScreenCoordinatesFromWorld(worldX: number, worldY: number) {
        return {
            x: worldX * this.cameraZoom + this.cameraOffset.x,
            y: worldY * this.cameraZoom + this.cameraOffset.y,
        };
    }

    private createShape(x1: number, y1: number, x2: number, y2: number): Shape | null {
        const width = x2 - x1;
        const height = y2 - y1;
        switch (this.selectedTool) {
            case "rect":
                return {
                    id: 'temp', type: "rect", x: width > 0 ? x1 : x2, y: height > 0 ? y1 : y2,
                    width: Math.abs(width), height: Math.abs(height), color: this.currentColor
                };
            case "ellipse":
                return {
                    id: 'temp', type: "ellipse", x: width > 0 ? x1 : x2, y: height > 0 ? y1 : y2,
                    width: Math.abs(width), height: Math.abs(height), color: this.currentColor
                };
            case "arrow":
                return { id: 'temp', type: "arrow", startX: x1, startY: y1, endX: x2, endY: y2, color: this.currentColor };
            case "triangle":
                return {
                    id: 'temp', type: "triangle", x1: x1 + width / 2, y1: y1, x2: x1, y2: y2, x3: x2, y3: y2,
                    color: this.currentColor
                };
            default:
                return null;
        }
    }

    public drawShape(shape: Shape) {
        this.ctx.strokeStyle = shape.color || "#ffffff";
        this.ctx.fillStyle = shape.color || "#ffffff";
        
        if (shape.type === "rect") {
            this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        } else if (shape.type === "ellipse") {
            this.ctx.beginPath();
            const centerX = shape.x + shape.width / 2;
            const centerY = shape.y + shape.height / 2;
            const radiusX = Math.abs(shape.width / 2);
            const radiusY = Math.abs(shape.height / 2);
            this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            this.ctx.stroke();
        } else if (shape.type === "pencil") {
            this.drawPencilPath(shape.points, shape.color);
        } else if (shape.type === "arrow") {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.startX, shape.startY);
            this.ctx.lineTo(shape.endX, shape.endY);
            this.ctx.stroke();
            this.drawArrowHead(this.ctx, shape.startX, shape.startY, shape.endX, shape.endY);
        } else if (shape.type === "triangle") {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.x1, shape.y1);
            this.ctx.lineTo(shape.x2, shape.y2);
            this.ctx.lineTo(shape.x3, shape.y3);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (shape.type === "text") {
            this.drawText(shape);
        }
    }

    private drawPencilPath(points: { x: number; y: number }[], color?: string) {
        if (points.length < 2) return;
        this.ctx.save();
        if (color) this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    private drawArrowHead(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, headLength = 15) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const arrowLength = headLength / this.cameraZoom;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - arrowLength * Math.cos(angle - Math.PI / 6), toY - arrowLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - arrowLength * Math.cos(angle + Math.PI / 6), toY - arrowLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }
    
    private getTextLines(shape: Shape): { text: string, x: number, y: number }[] {
        if (shape.type !== 'text') return [];

        const ctx = document.createElement('canvas').getContext('2d')!;
        const fontSize = shape.fontSize || 20;
        const fontFamily = shape.fontFamily || 'monospace';
        const maxWidth = shape.width || 300;
        const lineHeight = fontSize * 1.2;

        ctx.font = `${fontSize}px ${fontFamily}`;

        const finalLines: { text: string, x: number, y: number }[] = [];
        let currentY = shape.y;

        const paragraphs = shape.text.split('\n');

        for (const paragraph of paragraphs) {
            if (paragraph === "") {
                currentY += lineHeight;
                continue;
            }
            
            let line = '';
            const words = paragraph.split(' ');

            for (const word of words) {
                const testLine = line === '' ? word : line + ' ' + word;
                const testWidth = ctx.measureText(testLine).width;

                if (testWidth <= maxWidth) {
                    line = testLine;
                } else {
                    if (line !== '') {
                        finalLines.push({ text: line, x: shape.x, y: currentY });
                        currentY += lineHeight;
                    }

                    const wordWidth = ctx.measureText(word).width;
                    if (wordWidth <= maxWidth) {
                        line = word;
                    } else {
                        let tempWordLine = '';
                        for (const char of word) {
                            const testWordLine = tempWordLine + char;
                            if (ctx.measureText(testWordLine).width > maxWidth) {
                                finalLines.push({ text: tempWordLine, x: shape.x, y: currentY });
                                currentY += lineHeight;
                                tempWordLine = char;
                            } else {
                                tempWordLine = testWordLine;
                            }
                        }
                        line = tempWordLine;
                    }
                }
            }
            
            if (line !== '') {
                finalLines.push({ text: line, x: shape.x, y: currentY });
            }
            
            currentY += lineHeight;
        }

        return finalLines;
    }

    private drawText(shape: Shape) {
        if (shape.type !== 'text') return;
        
        const fontSize = shape.fontSize || 20;
        const fontFamily = shape.fontFamily || 'monospace';
        
        this.ctx.font = `${fontSize}px ${fontFamily}`;
        this.ctx.fillStyle = shape.color;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        const lines = this.getTextLines(shape);
        lines.forEach(line => {
            this.ctx.fillText(line.text, line.x, line.y);
        });
    }

    private drawEraserPreview(screenX: number, screenY: number) {
        this.ctx.save();
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, this.eraserSize / 2, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    private eraseShapesAtPoint(x: number, y: number) {
        let erasedSomething = false;
        const eraserRadius = (this.eraserSize / 2) / this.cameraZoom;

        for (let i = this.existingShapes.length - 1; i >= 0; i--) {
            const shape = this.existingShapes[i];
            let shouldErase = false;
            
            switch (shape.type) {
                case "rect": shouldErase = this.isPointNearRectBoundary(x, y, shape, eraserRadius); break;
                case "ellipse": shouldErase = this.isPointNearEllipseBoundary(x, y, shape, eraserRadius); break;
                case "pencil": shouldErase = this.isPointNearPencilStroke(x, y, shape, eraserRadius); break;
                case "triangle": shouldErase = this.isPointNearTriangleBoundary(x, y, shape, eraserRadius); break;
                case "arrow": shouldErase = this.isPointNearArrow(x, y, shape, eraserRadius); break;
                case "text": shouldErase = this.isPointNearText(x, y, shape, eraserRadius); break;
            }
            
            if (shouldErase) {
                const shapeToErase = this.existingShapes.splice(i, 1)[0];
                this.socket.send(JSON.stringify({
                    type: "chat", message: JSON.stringify({ action: "erase", shapeId: shapeToErase.id }), roomId: this.roomId
                }));
                erasedSomething = true;
            }
        }

        if (erasedSomething) {
            this.saveState();
            this.draw();
        }
    }
    
    private isPointNearRectBoundary(pointX: number, pointY: number, rect: any, tolerance: number): boolean {
        const { x, y, width, height } = rect;
        const points = [ {x: x, y: y}, {x: x + width, y: y}, {x: x + width, y: y + height}, {x: x, y: y + height} ];
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % 4];
            if (this.distanceFromPointToLineSegment(pointX, pointY, p1.x, p1.y, p2.x, p2.y) < tolerance) return true;
        }
        return false;
    }

    private isPointNearEllipseBoundary(pointX: number, pointY: number, ellipse: any, tolerance: number): boolean {
        const { x, y, width, height } = ellipse;
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const rx = Math.abs(width / 2);
        const ry = Math.abs(height / 2);
        if (rx <= 0 || ry <= 0) return false;
        const dx = pointX - centerX;
        const dy = pointY - centerY;
        const value = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        return value >= (1 - tolerance / rx) && value <= (1 + tolerance / rx);
    }

    private isPointNearPencilStroke(pointX: number, pointY: number, pencil: any, tolerance: number): boolean {
        for (let i = 0; i < pencil.points.length - 1; i++) {
            const point1 = pencil.points[i];
            const point2 = pencil.points[i + 1];
            if (this.distanceFromPointToLineSegment(pointX, pointY, point1.x, point1.y, point2.x, point2.y) <= tolerance) return true;
        }
        return false;
    }

    private isPointNearText(pointX: number, pointY: number, textShape: Shape, tolerance: number): boolean {
        if (textShape.type !== 'text') return false;

        const lines = this.getTextLines(textShape);
        if (lines.length === 0) return false;

        const tempCtx = document.createElement('canvas').getContext('2d')!;
        const fontSize = textShape.fontSize || 20;
        const fontFamily = textShape.fontFamily || 'monospace';
        tempCtx.font = `${fontSize}px ${fontFamily}`;

        let totalWidth = 0;
        
        const firstLine = lines[0];
        const lastLine = lines[lines.length - 1];
        
        lines.forEach(line => {
            const metrics = tempCtx.measureText(line.text);
            if (metrics.width > totalWidth) {
                totalWidth = metrics.width;
            }
        });

        const lineHeight = (textShape.fontSize || 20) * 1.2;
        const totalHeight = (lastLine.y - firstLine.y) + lineHeight;

        const { x, y } = textShape;

        return pointX >= x - tolerance &&
               pointX <= x + totalWidth + tolerance &&
               pointY >= y - tolerance &&
               pointY <= y + totalHeight + tolerance;
    }
    
    private distanceFromPointToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
        const dot = A * C + B * D, lenSq = C * C + D * D;
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        let param = dot / lenSq;
        if (param < 0) param = 0; else if (param > 1) param = 1;
        const xx = x1 + param * C, yy = y1 + param * D;
        const dx = px - xx, dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private isPointNearTriangleBoundary(pointX: number, pointY: number, triangle: any, tolerance: number): boolean {
        const { x1, y1, x2, y2, x3, y3 } = triangle;
        const dist1 = this.distanceFromPointToLineSegment(pointX, pointY, x1, y1, x2, y2);
        const dist2 = this.distanceFromPointToLineSegment(pointX, pointY, x2, y2, x3, y3);
        const dist3 = this.distanceFromPointToLineSegment(pointX, pointY, x3, y3, x1, y1);
        return dist1 <= tolerance || dist2 <= tolerance || dist3 <= tolerance;
    }

    private isPointNearArrow(pointX: number, pointY: number, arrow: any, tolerance: number): boolean {
        return this.distanceFromPointToLineSegment(pointX, pointY, arrow.startX, arrow.startY, arrow.endX, arrow.endY) <= tolerance;
    }

    private getShapeBounds(shape: Shape): { x: number, y: number, width: number, height: number } | null {
        switch(shape.type) {
            case 'rect':
            case 'ellipse':
                return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
            case 'text':
                const lines = this.getTextLines(shape);
                if (lines.length === 0) return { x: shape.x, y: shape.y, width: shape.width || 0, height: 0 };
                const lineHeight = (shape.fontSize || 20) * 1.2;
                const height = lines.length * lineHeight;
                return { x: shape.x, y: shape.y, width: shape.width || 0, height: height };
            case 'triangle':
                const minX = Math.min(shape.x1, shape.x2, shape.x3);
                const maxX = Math.max(shape.x1, shape.x2, shape.x3);
                const minY = Math.min(shape.y1, shape.y2, shape.y3);
                const maxY = Math.max(shape.y1, shape.y2, shape.y3);
                return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
            default:
                return null;
        }
    }

    private getResizeHandles(shape: Shape) {
        const bounds = this.getShapeBounds(shape);
        if (!bounds) return {};
        const { x, y, width, height } = bounds;
        const handleSize = 8 / this.cameraZoom;
        return {
            tl: { x: x - handleSize / 2, y: y - handleSize / 2, width: handleSize, height: handleSize },
            tr: { x: x + width - handleSize / 2, y: y - handleSize / 2, width: handleSize, height: handleSize },
            bl: { x: x - handleSize / 2, y: y + height - handleSize / 2, width: handleSize, height: handleSize },
            br: { x: x + width - handleSize / 2, y: y + height - handleSize / 2, width: handleSize, height: handleSize },
        };
    }
    
    private drawSelectionBox(shape: Shape) {
        const bounds = this.getShapeBounds(shape);
        if (!bounds) return;

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1 / this.cameraZoom;
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

        const handles = this.getResizeHandles(shape);
        this.ctx.fillStyle = '#ffffff';
        for (const key in handles) {
            const handle = handles[key as keyof typeof handles];
            this.ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
        }
    }

    private isPointInShape(point: {x: number, y: number}, shape: Shape): boolean {
        const bounds = this.getShapeBounds(shape);
        if (!bounds) return false;
        
        return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
               point.y >= bounds.y && point.y <= bounds.y + bounds.height;
    }
    
    private getShapeAt(point: {x: number, y: number}): Shape | null {
        for (let i = this.existingShapes.length - 1; i >= 0; i--) {
            const shape = this.existingShapes[i];
            if (this.isPointInShape(point, shape)) {
                return shape;
            }
        }
        return null;
    }

    private getResizeHandleAt(point: {x: number, y: number}, shape: Shape): 'tl' | 'tr' | 'bl' | 'br' | null {
        const handles = this.getResizeHandles(shape);
        for (const key in handles) {
            const handle = handles[key as keyof typeof handles];
            if (point.x >= handle.x && point.x <= handle.x + handle.width &&
                point.y >= handle.y && point.y <= handle.y + handle.height) {
                return key as 'tl' | 'tr' | 'bl' | 'br';
            }
        }
        return null;
    }

    private moveShape(shape: Shape, dx: number, dy: number, initialState: Shape) {
        if (shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'text') {
            const initial = initialState as typeof shape;
            shape.x = initial.x + dx;
            shape.y = initial.y + dy;
        } else if (shape.type === 'triangle') {
            const initial = initialState as typeof shape;
            shape.x1 = initial.x1 + dx;
            shape.y1 = initial.y1 + dy;
            shape.x2 = initial.x2 + dx;
            shape.y2 = initial.y2 + dy;
            shape.x3 = initial.x3 + dx;
            shape.y3 = initial.y3 + dy;
        }
    }

    private resizeShape(shape: Shape, dx: number, dy: number, handle: string, initialState: Shape) {
        if (shape.type === 'rect' || shape.type === 'ellipse') {
            const initial = initialState as typeof shape;
            switch (handle) {
                case 'br':
                    shape.width = Math.max(10, initial.width + dx);
                    shape.height = Math.max(10, initial.height + dy);
                    break;
                case 'bl':
                    shape.x = initial.x + dx;
                    shape.width = Math.max(10, initial.width - dx);
                    shape.height = Math.max(10, initial.height + dy);
                    break;
                case 'tr':
                    shape.y = initial.y + dy;
                    shape.width = Math.max(10, initial.width + dx);
                    shape.height = Math.max(10, initial.height - dy);
                    break;
                case 'tl':
                    shape.x = initial.x + dx;
                    shape.y = initial.y + dy;
                    shape.width = Math.max(10, initial.width - dx);
                    shape.height = Math.max(10, initial.height - dy);
                    break;
            }
        } else if (shape.type === 'text') {
            const initial = initialState as typeof shape;
            switch (handle) {
                case 'br':
                case 'tr':
                    shape.width = Math.max(50, (initial.width || 300) + dx);
                    break;
                case 'bl':
                case 'tl':
                    shape.x = initial.x + dx;
                    shape.width = Math.max(50, (initial.width || 300) - dx);
                    break;
            }
        } else if (shape.type === 'triangle') {
            const initial = initialState as typeof shape;
            const initialBounds = this.getShapeBounds(initial)!;
            
            const newWidth = initialBounds.width + (handle.includes('l') ? -dx : dx);
            const newHeight = initialBounds.height + (handle.includes('t') ? -dy : dy);
            
            const scaleX = newWidth / initialBounds.width;
            const scaleY = newHeight / initialBounds.height;
            
            const anchorX = handle.includes('l') ? initialBounds.x + initialBounds.width : initialBounds.x;
            const anchorY = handle.includes('t') ? initialBounds.y + initialBounds.height : initialBounds.y;

            shape.x1 = anchorX + (initial.x1 - anchorX) * scaleX;
            shape.y1 = anchorY + (initial.y1 - anchorY) * scaleY;
            shape.x2 = anchorX + (initial.x2 - anchorX) * scaleX;
            shape.y2 = anchorY + (initial.y2 - anchorY) * scaleY;
            shape.x3 = anchorX + (initial.x3 - anchorX) * scaleX;
            shape.y3 = anchorY + (initial.y3 - anchorY) * scaleY;
        }
    }
    
    public saveState() {
        this.history.splice(this.historyIndex + 1);
        this.history.push(JSON.parse(JSON.stringify(this.existingShapes)));
        this.historyIndex++;
        this.onHistoryChange(this.historyIndex > 0, false);
    }

    public undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.existingShapes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.draw();
            this.onHistoryChange(this.historyIndex > 0, true);
        }
    }

    public redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.existingShapes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.draw();
            this.onHistoryChange(true, this.historyIndex < this.history.length - 1);
        }
    }
}
