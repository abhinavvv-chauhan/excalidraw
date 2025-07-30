"use client";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { Circle, Eraser, ArrowRight, Pencil, RectangleHorizontal, Triangle, Type, Hand, MousePointer, Undo, Redo, Copy } from "lucide-react";
import { Game } from "@/draw/Game";

export type Tool = "select" | "ellipse" | "rect" | "pencil" | "arrow" | "triangle" | "text" | "eraser" | "grab";

export function Canvas({
    roomId,
    socket,
    setGameInstance,
    selectedTool,
    setSelectedTool,
    selectedColor,
    setSelectedColor,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
}: {
    socket: WebSocket;
    roomId: string;
    setGameInstance: (game: Game) => void;
    selectedTool: Tool;
    setSelectedTool: (tool: Tool) => void;
    selectedColor: string;
    setSelectedColor: (color: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game | null>(null);
    
    const [showToast, setShowToast] = useState(false);
    const [isCollaborative, setIsCollaborative] = useState(false);

    useEffect(() => {
        const personalSlug = localStorage.getItem('personal_room_slug');
        if (personalSlug && roomId !== personalSlug) {
            setIsCollaborative(true);
        }
    }, [roomId]);

    useEffect(() => {
        if (canvasRef.current && !gameRef.current) {
            const gameInstance = new Game(canvasRef.current, roomId, socket);
            gameRef.current = gameInstance;
            setGameInstance(gameInstance);

            return () => {
                gameInstance.destroy();
                gameRef.current = null;
            };
        }
    }, [roomId, socket, setGameInstance]);

    useEffect(() => {
        if (gameRef.current) {
            gameRef.current.setTool(selectedTool);
        }
    }, [selectedTool]);

    useEffect(() => {
        if (gameRef.current) {
            gameRef.current.setColor(selectedColor);
        }
    }, [selectedColor]);

    return (
        <div className="h-screen w-full overflow-hidden">
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
            
            <Toast message="Copied to clipboard!" show={showToast} />

            {isCollaborative && (
                <ShareSession roomId={roomId} onCopy={() => {
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2000);
                }} />
            )}

            <ColorPicker selectedColor={selectedColor} setSelectedColor={setSelectedColor} />
            <Toolbar 
                selectedTool={selectedTool} 
                setSelectedTool={setSelectedTool}
                onUndo={onUndo}
                onRedo={onRedo}
                canUndo={canUndo}
                canRedo={canRedo}
            />
        </div>
    );
}

function Toast({ message, show }: { message: string, show: boolean }) {
    return (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
            {message}
        </div>
    );
}

function ShareSession({ roomId, onCopy }: { roomId: string, onCopy: () => void }) {
    const handleCopy = () => {
        navigator.clipboard.writeText(roomId).then(() => {
            onCopy();
        }).catch(err => {
            console.error('Failed to copy room ID: ', err);
        });
    };

    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 text-white font-semibold">
            <span>Room: <span className="font-mono bg-gray-700/80 px-2 py-1 rounded">{roomId}</span></span>
            <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-gray-700/90  cursor-pointer transition-colors duration-200">
                <Copy size={18} />
            </button>
        </div>
    );
}


function ColorPicker({ selectedColor, setSelectedColor }: {
    selectedColor: string,
    setSelectedColor: (color: string) => void
}) {
    const colors = ["#FFFFFF", "#b82531", "#5ca3fa", "#4CAF50", "#e3a334", "#ca8ccf"];
    return (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-gray-700/70 backdrop-blur-sm border border-gray-700 rounded-lg p-2">
            {colors.map((color) => (
                <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-md cursor-pointer border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColor === color ? 'border-blue-400 shadow-lg scale-110' : 'border-transparent hover:border-gray-400'}`}
                    style={{ backgroundColor: color }}
                    title={`Select ${color}`} />
            ))}
        </div>
    );
}

function Toolbar({selectedTool,setSelectedTool, onUndo, onRedo,canUndo, canRedo}: {
    selectedTool: Tool,
    setSelectedTool: (s: Tool) => void
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}) {
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-2 shadow-lg">
            <div className="flex">
                <IconButton onClick={() => setSelectedTool("select")} activated={selectedTool === "select"} icon={<MousePointer />} />
                <IconButton onClick={() => setSelectedTool("grab")} activated={selectedTool === "grab"} icon={<Hand />} />
                <IconButton onClick={() => setSelectedTool("pencil")} activated={selectedTool === "pencil"} icon={<Pencil />} />
                <IconButton onClick={() => setSelectedTool("rect")} activated={selectedTool === "rect"} icon={<RectangleHorizontal />} />
                <IconButton onClick={() => setSelectedTool("ellipse")} activated={selectedTool === "ellipse"} icon={<Circle />} />
                <IconButton onClick={() => setSelectedTool("triangle")} activated={selectedTool === "triangle"} icon={<Triangle />} />
                <IconButton onClick={() => setSelectedTool("arrow")} activated={selectedTool === "arrow"} icon={<ArrowRight />} />
                <IconButton onClick={() => setSelectedTool("text")} activated={selectedTool === "text"} icon={<Type />} />
                <IconButton onClick={() => setSelectedTool("eraser")} activated={selectedTool === "eraser"} icon={<Eraser />} />
            </div>
            
            <div className="w-px h-8 bg-gray-600 mx-2"></div>

            <div className="flex">
                <IconButton onClick={onUndo} disabled={!canUndo} icon={<Undo />} />
                <IconButton onClick={onRedo} disabled={!canRedo} icon={<Redo />} />
            </div>
        </div>
    );
}
