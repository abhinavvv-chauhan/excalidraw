import { NextFunction, Request, Response } from "express";
import jwt, {JwtPayload} from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/src";

declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}
interface CustomJwtPayload extends JwtPayload {
    userId: string;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: "Authorization token is missing or invalid" });
        return;
    }
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
        if (!decoded || !decoded.userId) {
            res.status(401).json({ message: "Invalid token payload" });
            return;
        }
        req.userId = decoded.userId;
        next();
    } catch (e) {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
    }
};