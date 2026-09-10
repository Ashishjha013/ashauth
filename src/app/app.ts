import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import authRouter from "./module/auth/routes.js"
import { openIdConfig } from "./module/auth/controller.js";
import ApiError from "./common/utils/ApiError.js";
import cors from "cors"

const isInvalidJsonError = (error: unknown) => {
    if (!(error instanceof SyntaxError)) {
        return false;
    }

    return "body" in error;
};

const createApplication = () => {
    const app = express();
    app.use(cors(
        // all all
        {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"]
        }
    ))
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use("/public", express.static(path.resolve(process.cwd(), "public")));

    app.get("/.well-known/openid-configuration", openIdConfig);
    app.use("", authRouter);

    app.use((error: unknown, _: Request, res: Response, next: NextFunction) => {
        if (res.headersSent) {
            next(error);
            return;
        }

        if (isInvalidJsonError(error)) {
            res.status(400).json({
                message: "Invalid JSON body",
                success: false
            });
            return;
        }

        if (error instanceof ApiError) {
            res.status(error.statusCode).json({
                message: error.message,
                success: false
            });
            return;
        }

        console.error(error);
        res.status(500).json({
            message: "Internal server error",
            success: false
        });
    });

    return app;
}

export default createApplication;
