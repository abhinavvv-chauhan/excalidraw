"use client";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { Circle, Eraser, ArrowRight, Pencil, RectangleHorizontal, Triangle, Type, Hand, MousePointer2, Undo, Redo, Copy, Wand2, X, Check } from "lucide-react";
import { Game } from "@/draw/Game";
import axios from "axios";

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

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

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

    const handleMakeItReal = async () => {
        if (!gameRef.current) return;
        
        setIsGenerating(true);
        setGeneratedCode(null);
        
        try {
            const canvasEl = gameRef.current.getCanvasElement();
            const base64Image = canvasEl.toDataURL("image/png");
            
            const response = await axios.post("http://localhost:3001/api/ai/diagram-to-code", {
                image: base64Image
            });

            setGeneratedCode(response.data.code);
        } catch (error) {
            console.error("Failed to generate code:", error);
            alert("Failed to generate code. Make sure your backend is running and API key is set.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-screen w-full overflow-hidden relative">
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
                onMakeItReal={handleMakeItReal}
                isGenerating={isGenerating}
            />

            {generatedCode && (
                <CodeModal 
                    code={generatedCode} 
                    onClose={() => setGeneratedCode(null)} 
                />
            )}
        </div>
    );
}

function CodeModal({ code, onClose }: { code: string, onClose: () => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <Wand2 className="text-purple-400 h-5 w-5" />
                        <h3 className="text-white font-semibold text-lg">Generated React Code</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleCopy}
                            className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors border border-gray-700"
                        >
                            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                            {copied ? "Copied!" : "Copy Code"}
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-[#0d1117]">
                    <pre className="text-sm font-mono text-gray-300">
                        <code>{code}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
}

function Toast({ message, show }: { message: string, show: boolean }) {
    return (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[5000] bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
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
        <div className="fixed top-4 right-4 z-[4000] flex items-center gap-2 bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 text-white font-semibold shadow-lg">
            <span>Room: <span className="font-mono bg-gray-700/80 px-2 py-1 rounded">{roomId}</span></span>
            <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-gray-700/90 cursor-pointer transition-colors duration-200"
                title="Copy Room ID"
            >
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
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[4000] flex flex-col gap-2 bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg p-2 shadow-lg">
            {colors.map((color) => (
                <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-md cursor-pointer border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColor === color 
                            ? 'border-blue-400 shadow-lg scale-110' 
                            : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Select ${color}`}
                />
            ))}
        </div>
    );
}

function Toolbar({ 
    selectedTool, 
    setSelectedTool,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onMakeItReal,
    isGenerating
}: {
    selectedTool: Tool,
    setSelectedTool: (s: Tool) => void
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onMakeItReal: () => void;
    isGenerating: boolean;
}) {
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[4000] flex items-center justify-center bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg p-1 shadow-2xl">
            <div className="flex">
                <IconButton onClick={() => setSelectedTool("select")} activated={selectedTool === "select"} icon={<MousePointer2 />} />
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

            <div className="w-px h-8 bg-gray-600 mx-2"></div>
            
            <button 
                onClick={onMakeItReal}
                disabled={isGenerating}
                className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md text-sm font-semibold transition-all duration-200 ${
                    isGenerating 
                    ? "bg-purple-900/50 text-purple-300 cursor-not-allowed" 
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)] hover:shadow-[0_0_20px_rgba(147,51,234,0.6)]"
                }`}
            >
                <Wand2 className={`h-4 w-4 ${isGenerating ? "animate-pulse" : ""}`} />
                {isGenerating ? "Generating..." : "Make it Real"}
            </button>
        </div>
    );
}