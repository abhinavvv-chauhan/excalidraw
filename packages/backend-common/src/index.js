"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
if (!process.env.JWT_SECRET) {
    throw new Error('FATAL_ERROR: JWT_SECRET is not defined in the environment variables');
}
exports.JWT_SECRET = process.env.JWT_SECRET;
