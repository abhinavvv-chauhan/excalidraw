import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../packages/backend-common/.env') });

import express, { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./middleware";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from '@repo/backend-common/src';
import { CreateUserSchema, SigninSchema, CreateRoomSchema } from "@repo/common/src/types";
import { prismaClient } from "@repo/db/src";
import cors from "cors";
import bcrypt from "bcrypt";
import { nanoid } from 'nanoid';
import { Prisma } from '@prisma/client';
// ✨ NEW: Import the Google Generative AI SDK
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();

// ✨ CRUCIAL FIX: Increase the JSON payload limit to 50mb. 
// Base64 images are large, and the default 100kb limit will crash the server!
app.use(express.json({ limit: '50mb' }));

const allowedOrigins = [
    "https://excalidraw-ten-gamma.vercel.app", 
    "http://localhost:3000"                     
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));


const SALT_ROUNDS = 10;

// ✨ NEW: Initialize Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.get("/", (req: Request, res: Response) => {
    res.status(200).json({ message: "Server is healthy and running." });
});

// ✨ NEW: Diagram to Code AI Endpoint
app.post("/api/ai/diagram-to-code", async (req: Request, res: Response): Promise<void> => {
    try {
        const { image } = req.body; // This will be a base64 string from the frontend canvas

        if (!image) {
            res.status(400).json({ message: "No image provided" });
            return;
        }

        // Clean the base64 string (remove the data:image/png;base64, prefix)
        const base64Data = image.replace(/^data:image\/(png|jpeg);base64,/, "");

        // Use the Gemini 1.5 Flash model (Fast, Multimodal, and generous free tier)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        You are an expert frontend developer. 
        Look at this wireframe/diagram drawn on a digital whiteboard.
        Convert this drawing into a functional, single-file React component using Tailwind CSS.
        
        Rules:
        1. Use modern React (functional components).
        2. Use Tailwind CSS for all styling.
        3. Make reasonable assumptions about layout, colors, and functionality based on the drawing.
        4. Return ONLY the raw code. Do not include markdown codeblocks (like \`\`\`tsx) or conversational text. Just the code.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/png"
                }
            }
        ]);

        const code = result.response.text();

        res.json({ code });
    } catch (e) {
        console.error("AI Generation Error:", e);
        res.status(500).json({ message: "Failed to generate code from diagram" });
    }
});


app.post("/signup", async (req: Request, res: Response): Promise<void> => {
    const parsedData = CreateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Incorrect inputs" });
        return;
    }

    const { username: email, password, name } = parsedData.data;

    try {
        const existingUser = await prismaClient.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ message: "User with this email already exists" });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = await prismaClient.user.create({
            data: { 
                email, 
                password: hashedPassword, 
                name 
            },
        });

        const newRoom = await prismaClient.room.create({
            data: {
                slug: nanoid(12),
                adminId: newUser.id,
            },
        });

        const token = jwt.sign({ userId: newUser.id }, JWT_SECRET);

        res.status(201).json({
            token,
            user: { id: newUser.id, email: newUser.email, name: newUser.name },
            roomSlug: newRoom.slug, 
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "An unexpected error occurred" });
    }
});

app.post("/signin", async (req: Request, res: Response): Promise<void> => {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Incorrect inputs" });
        return;
    }

    const { username: email, password } = parsedData.data;

    try {
        const user = await prismaClient.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            res.status(403).json({ message: "Invalid email or password" });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(403).json({ message: "Invalid email or password" });
            return;
        }

        let room = await prismaClient.room.findFirst({
            where: { adminId: user.id },
        });

        if (!room) {
            room = await prismaClient.room.create({
                data: { slug: nanoid(12), adminId: user.id },
            });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET);

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name },
            roomSlug: room.slug,
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "An unexpected error occurred" });
    }
});

app.post("/auth/google", async (req: Request, res: Response): Promise<void> => {
    const { email, name } = req.body;

    if (!email) {
        res.status(400).json({ message: "Email is required for Google Sign-In" });
        return;
    }

    try {
        let user = await prismaClient.user.findUnique({
            where: { email },
        });

       
        if (!user) {
            user = await prismaClient.user.create({
                data: {
                    email,
                    name: name || 'Excalidraw User',
                },
            });
        }

        let room = await prismaClient.room.findFirst({
            where: { adminId: user.id },
        });

        if (!room) {
            room = await prismaClient.room.create({
                data: {
                    slug: nanoid(12),
                    adminId: user.id,
                },
            });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET);

        res.status(200).json({
            token,
            user: { id: user.id, email: user.email, name: user.name },
            roomSlug: room.slug,
        });

    } catch (e) {
        console.error("Google Auth Backend Error:", e);
        res.status(500).json({ message: "An unexpected error occurred" });
    }
});

app.get("/shapes/:roomSlug", async (req: Request, res: Response): Promise<void> => {
    try {
        const { roomSlug } = req.params;

        const room = await prismaClient.room.findUnique({
            where: { slug: roomSlug },
        });

        if (!room) {
            res.status(404).json({ message: "Room not found" });
            return;
        }

        const shapes = await prismaClient.shape.findMany({
            where: {
                roomId: room.id,
            },
            orderBy: {
                createdAt: "asc",
            },
        });
        //@ts-ignore
        const parsedShapes = shapes.map(shape => JSON.parse(shape.data as string));

        res.json({ shapes: parsedShapes });

    } catch (e) {
        console.error("Failed to fetch shapes:", e);
        res.status(500).json({ message: "Failed to fetch shapes" });
    }
});

app.post("/room", authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Incorrect inputs" });
        return;
    }
    
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const room = await prismaClient.room.create({
            data: {
                slug: parsedData.data.name,
                adminId: userId
            }
        })

        res.json({
            roomId: room.id
        })
    } catch(e) {
        res.status(411).json({
            message: "Room already exists with this name"
        })
    }
})

app.get("/chats/:roomId", async (req: Request, res: Response): Promise<void> => {
    try {
        const roomId = Number(req.params.roomId);
        const messages = await prismaClient.chat.findMany({
            where: {
                roomId: roomId
            },
            orderBy: {
                id: "desc"
            },
            take: 1000
        });

        res.json({
            messages
        })
    } catch(e) {
        console.log(e);
        res.status(500).json({
            messages: []
        })
    }
    
})

app.get("/room/:slug", async (req: Request, res: Response): Promise<void> => {
    const slug = req.params.slug;
    const room = await prismaClient.room.findFirst({
        where: {
            slug
        }
    });

    res.json({
        room
    })
})

app.post("/create-collab-room", authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const slug = nanoid(12);
        const newRoom = await prismaClient.room.create({
            data: {
                slug: slug,
                adminId: userId,
            },
        });

        res.status(201).json({ roomSlug: newRoom.slug });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed to create collaboration room" });
    }
});

app.listen(3001, () => {
    console.log("http-backend listening on port 3001");
});