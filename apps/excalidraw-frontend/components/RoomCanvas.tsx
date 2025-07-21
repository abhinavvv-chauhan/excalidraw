"use client";
import { WS_URL } from "@/config";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { Canvas, Tool } from "./Canvas";
import { Game } from "@/draw/Game";

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function RoomCanvas({ roomId }: { roomId: string }) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(true);
    const router = useRouter();
    
    const gameRef = useRef<Game | null>(null);
    const [selectedTool, setSelectedTool] = useState<Tool>("select");
    const [selectedColor, setSelectedColor] = useState<string>("#FFFFFF");
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [textInput, setTextInput] = useState<{ worldX: number; worldY: number; screenX: number; screenY: number; } | null>(null);
    const [textValue, setTextValue] = useState("");
    
    const lastSubmitTimestamp = useRef(0);
    
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            router.push('/signin');
            return;
        }
        const ws = new WebSocket(`${WS_URL}?token=${token}`);
        ws.onopen = () => {
            setSocket(ws);
            setIsConnecting(false);
            ws.send(JSON.stringify({ type: "join_room", roomId }));
        };
        ws.onerror = () => { setError('Failed to connect to server'); setIsConnecting(false); };
        ws.onclose = () => { setError('Connection lost. Please refresh.'); setIsConnecting(false); };
        return () => ws.close();
    }, [roomId, router]);

    const setGameInstance = useCallback((game: Game) => {
        if (!gameRef.current) {
            gameRef.current = game;
            game.onHistoryChange = (undoable, redoable) => {
                setCanUndo(undoable);
                setCanRedo(redoable);
            };
        }
    }, []);

    useEffect(() => {
        if (textInput && textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.focus();
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [textInput, textValue]);

    const handleCanvasClickForText = useCallback((event: MouseEvent) => {
        if (Date.now() - lastSubmitTimestamp.current < 100) {
            return;
        }

        if (selectedTool === 'text' && gameRef.current) {
            if (textInput) return;
            const screenCoords = gameRef.current.getScreenCoordinates(event);
            const worldCoords = gameRef.current.getWorldCoordinates(screenCoords.x, screenCoords.y);
            setTextInput({
                worldX: worldCoords.x,
                worldY: worldCoords.y,
                screenX: screenCoords.x,
                screenY: screenCoords.y,
            });
        }
    }, [selectedTool, textInput]);

    useEffect(() => {
        const canvasEl = gameRef.current?.getCanvasElement();
        if (canvasEl) {
            canvasEl.addEventListener('click', handleCanvasClickForText);
            return () => {
                canvasEl.removeEventListener('click', handleCanvasClickForText);
            };
        }
    }, [gameRef.current, handleCanvasClickForText]);

    const handleTextSubmit = useCallback(() => {
        lastSubmitTimestamp.current = Date.now();
        if (gameRef.current && textInput && textValue.trim()) {
            gameRef.current.addText(textValue, textInput.worldX, textInput.worldY);
        }
        setTextInput(null);
        setTextValue("");
    }, [textInput, textValue]); // Add dependencies

    // ✨ FIX: This effect ensures that any active text is submitted when the user switches away from the text tool.
    useEffect(() => {
        if (selectedTool !== 'text' && textInput) {
            handleTextSubmit();
        }
    }, [selectedTool, textInput, handleTextSubmit]);


    const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Escape') {
            setTextInput(null);
            setTextValue("");
        }
    };
    
    const handleUndo = () => {
        gameRef.current?.undo();
    };

    const handleRedo = () => {
        gameRef.current?.redo();
    };

    if (error) return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;
    if (isConnecting || !socket) return <div className="flex items-center justify-center h-screen">Connecting...</div>;

    return (
        <div className="relative w-full h-screen overflow-hidden">
            <Canvas 
                roomId={roomId} 
                socket={socket} 
                setGameInstance={setGameInstance}
                selectedTool={selectedTool}
                setSelectedTool={setSelectedTool}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo}
                canRedo={canRedo}
            />
            {textInput && (
                <textarea
                    ref={textareaRef}
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    onBlur={handleTextSubmit}
                    onKeyDown={handleTextKeyDown}
                    className="textarea-fade-border"
                    style={{
                        position: 'absolute',
                        left: `${textInput.screenX}px`,
                        top: `${textInput.screenY}px`,
                        background: 'transparent',
                        borderColor: '#fff',
                        borderStyle: 'dashed',
                        borderWidth: '1px',
                        color: selectedColor,
                        outline: 'none',
                        overflow: 'hidden',
                        resize: 'none', 
                        font: '20px monospace',
                        lineHeight: '1.2',
                        padding: '2px',
                        zIndex: 100,
                        width: '300px',
                        whiteSpace: 'pre-wrap',
                    }}
                />
            )}
        </div>
    );
}
