import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../packages/backend-common/.env') });

import express from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import jwt from "jsonwebtoken";
import { JWT_SECRET } from '@repo/backend-common/src';
import { prismaClient } from "@repo/db/src";

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 8080;

const rooms = new Map<string, Set<WebSocket>>();
const userConnections = new Map<WebSocket, string>();

interface UserJwtPayload {
    userId: string;
}

app.get('/', (req, res) => {
  res.send('WebSocket server is running');
});


function checkUser(token: string): UserJwtPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as UserJwtPayload;
        if (typeof decoded === "string" || !decoded?.userId) {
            return null;
        }
        return decoded;
    } catch (e) {
        console.error('JWT verification failed:', e);
        return null;
    }
}

function broadcastToRoom(roomId: string, message: string, sender: WebSocket) {
    const clients = rooms.get(roomId);
    if (clients) {
        clients.forEach(client => {
            if (client !== sender && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

wss.on('connection', async function connection(ws, request) {
    const url = request.url;
    if (!url) {
        ws.close(400, 'No URL provided');
        return;
    }

    const token = new URLSearchParams(url.split('?')[1]).get('token') || "";
    const decodedToken = checkUser(token);

    if (!decodedToken) {
        ws.close(402, 'Authentication failed');
        return;
    }
    const userId = decodedToken.userId;

    console.log('User connected:', userId);
    userConnections.set(ws, userId);

    ws.on('message', async function message(data) {
        try {
            const parsedData = JSON.parse(data.toString());
            const currentUserId = userConnections.get(ws);

            if (!currentUserId) return;

            switch (parsedData.type) {
                case "join_room": {
                    const roomId = parsedData.roomId;
                    if (!rooms.has(roomId)) {
                        rooms.set(roomId, new Set());
                    }
                    rooms.get(roomId)?.add(ws);
                    console.log(`User ${currentUserId} joined room ${roomId}`);
                    break;
                }

                case "chat": {
                    const roomId = parsedData.roomId;
                    const messageContent = JSON.parse(parsedData.message);

                    broadcastToRoom(roomId, JSON.stringify({
                        type: "chat",
                        message: parsedData.message,
                    }), ws);

                    const room = await prismaClient.room.findUnique({ where: { slug: roomId } });
                    if (!room) {
                        console.error(`Room with slug ${roomId} not found.`);
                        return;
                    }

                    if (messageContent.shape) {
                        const { id, type } = messageContent.shape;
                        await prismaClient.shape.upsert({
                            where: { id: id },
                            update: { data: JSON.stringify(messageContent.shape) },
                            create: {
                                id: id,
                                roomId: room.id,
                                type: type,
                                data: JSON.stringify(messageContent.shape),
                            },
                        });
                    } else if (messageContent.action === "erase" && messageContent.shapeId) {
                        try {
                            await prismaClient.shape.delete({ where: { id: messageContent.shapeId } });
                        } catch (e) {
                            console.log(`Attempted to erase a shape that was already deleted: ${messageContent.shapeId}`);
                        }
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', function close() {
        const userId = userConnections.get(ws);
        console.log('User disconnected:', userId);
        
        rooms.forEach((clients, roomId) => {
            if (clients.has(ws)) {
                clients.delete(ws);
                if (clients.size === 0) {
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} is now empty and has been closed.`);
                }
            }
        });
        
        userConnections.delete(ws);
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
    });
});

server.listen(PORT, () => {
    console.log(`WebSocket server started on port ${PORT}`);
});
