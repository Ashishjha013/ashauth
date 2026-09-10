import { type NextFunction, type Request, type Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import ApiError from "../../common/utils/ApiError.js";

export type AccessTokenPayload = JwtPayload & {
    id: number
    email?: string
    name?: string
}

export interface AuthenticatedRequest extends Request {
    user?: AccessTokenPayload
}

const publicKeyPath = path.resolve(process.cwd(), "cert", "public.pem");

const getPublicKey = () => {
    try {
        return fs.readFileSync(publicKeyPath, "utf8");
    } catch {
        throw new ApiError(500, "Public key is not defined");
    }
}

const getBearerToken = (authorizationHeader?: string) => {
    if (!authorizationHeader?.startsWith("Bearer ")) {
        return null;
    }

    const token = authorizationHeader.slice(7).trim();

    if (!token || token.split(".").length !== 3) {
        return null;
    }

    return token;
}

export const verifyAccessToken = (
    req: AuthenticatedRequest,
    _: Response,
    next: NextFunction
) => {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
        throw new ApiError(401, "Access token required");
    }

    try {
        const decodedToken = jwt.verify(token, getPublicKey(), {
            algorithms: ["RS256"]
        });

        if (typeof decodedToken === "string" || typeof decodedToken.id !== "number") {
            throw new ApiError(401, "Invalid access token");
        }

        req.user = decodedToken as AccessTokenPayload;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new ApiError(401, "Access token expired");
        }

        if (error instanceof jwt.JsonWebTokenError) {
            throw new ApiError(401, "Invalid access token");
        }

        throw error;
    }
}
