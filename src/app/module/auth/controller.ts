import { type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { createPublicKey } from "node:crypto";
import {
    dashboardSigninService,
    dashboardSignupService,
    deleteOAuthClientService,
    exchangeAuthorizationCodeService,
    getOAuthClientService,
    getProjectsForUserService,
    registerOAuthClientService,
    signinService,
    signupService,
    updateOAuthClientService,
    userInfoService
} from "./services.js";
import ApiError from "../../common/utils/ApiError.js";
import ApiResponse from "../../common/utils/ApiResponse.js";
import {
    dashboardLogin,
    dashboardSignup,
    oAuthClientRegister,
    oAuthClientUpdate,
    tokenExchange,
    userLogin,
    userSignup
} from "./validate.js";
import { type AuthenticatedRequest } from "./middleware.js";

const publicDir = path.resolve(process.cwd(), "public");

const getRequestValue = (value: unknown) => {
    if (typeof value === "string") {
        return value;
    }

    if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0];
    }

    return undefined;
};

const getBody = (req: Request) => (req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {});

const getAuthorizationPayload = (req: Request) => {
    const body = getBody(req);

    return {
        clientId: getRequestValue(body.clientId) ?? getRequestValue(body.client_id) ?? getRequestValue(req.query.client_id),
        redirectUri: getRequestValue(body.redirectUri) ?? getRequestValue(body.redirect_uri) ?? getRequestValue(req.query.redirect_uri),
        state: getRequestValue(body.state) ?? getRequestValue(req.query.state)
    };
};

const sendPublicPage = (res: Response, fileName: string) => {
    res.sendFile(path.resolve(publicDir, fileName));
};

const requireUserId = (req: AuthenticatedRequest) => {
    const userId = req.user?.id;

    if (!userId) {
        throw new ApiError(401, "Invalid access token");
    }

    return userId;
};

export const dashboardPage = (_: Request, res: Response) => {
    sendPublicPage(res, "dashboard.html");
};

export const landingPage = (_: Request, res: Response) => {
    sendPublicPage(res, "index.html");
};

export const registerClientPage = (_: Request, res: Response) => {
    sendPublicPage(res, "client-register.html");
};

export const userRegisterPage = async (req: Request, res: Response) => {
    const { clientId, redirectUri } = getAuthorizationPayload(req);

    if (clientId) {
        await getOAuthClientService(clientId, redirectUri);
    }

    sendPublicPage(res, "signup.html");
};

export const userLoginPage = async (req: Request, res: Response) => {
    const { clientId, redirectUri } = getAuthorizationPayload(req);

    if (clientId) {
        await getOAuthClientService(clientId, redirectUri);
    }

    sendPublicPage(res, "signin.html");
};

export const getClientMeta = async (req: Request, res: Response) => {
    const { clientId, redirectUri } = getAuthorizationPayload(req);

    if (!clientId) {
        throw new ApiError(400, "client_id is required");
    }

    const response = await getOAuthClientService(clientId, redirectUri);
    return new ApiResponse(res, 200, "Client loaded successfully", response);
};

export const dashboardSignupController = async (req: Request, res: Response) => {
    const result = await dashboardSignup.safeParseAsync(req.body);

    if (!result.success) {
        throw new ApiError(400, "Validation Error");
    }

    const { email, name, password } = result.data;
    const response = await dashboardSignupService(email, name, password);
    return new ApiResponse(res, 201, "User account created successfully", response);
};

export const dashboardSigninController = async (req: Request, res: Response) => {
    const result = await dashboardLogin.safeParseAsync(req.body);

    if (!result.success) {
        throw new ApiError(400, "Validation Error");
    }

    const { email, password } = result.data;
    const response = await dashboardSigninService(email, password);
    return new ApiResponse(res, 200, "User signed in successfully", response);
};

export const getDashboardProjectsController = async (req: AuthenticatedRequest, res: Response) => {
    const response = await getProjectsForUserService(requireUserId(req));
    return new ApiResponse(res, 200, "Projects fetched successfully", response);
};

export const registerOAuthClient = async (req: AuthenticatedRequest, res: Response) => {
    const result = await oAuthClientRegister.safeParseAsync(req.body);

    if (!result.success) {
        throw new ApiError(400, "Validation Error");
    }

    const { applicationName, applicationUrl, contactEmail, redirectUrl } = result.data;
    const response = await registerOAuthClientService(
        requireUserId(req),
        applicationName,
        contactEmail,
        applicationUrl,
        redirectUrl
    );

    return new ApiResponse(res, 201, "OAuth client registered successfully", response);
};

export const updateOAuthClient = async (req: AuthenticatedRequest, res: Response) => {
    const result = await oAuthClientUpdate.safeParseAsync(req.body);

    if (!result.success) {
        throw new ApiError(400, "Validation Error");
    }

    const clientId = getRequestValue(req.params.clientId);

    if (!clientId) {
        throw new ApiError(400, "clientId is required");
    }

    const response = await updateOAuthClientService(requireUserId(req), clientId, result.data);
    return new ApiResponse(res, 200, "Project updated successfully", response);
};

export const deleteOAuthClient = async (req: AuthenticatedRequest, res: Response) => {
    const clientId = getRequestValue(req.params.clientId);

    if (!clientId) {
        throw new ApiError(400, "clientId is required");
    }

    const response = await deleteOAuthClientService(requireUserId(req), clientId);
    return new ApiResponse(res, 200, "Project deleted successfully", response);
};

export const signup = async (req: Request, res: Response) => {
    const authorizationPayload = getAuthorizationPayload(req);

    if (!authorizationPayload.clientId) {
        return dashboardSignupController(req, res);
    }

    const payload = {
        ...req.body,
        ...authorizationPayload
    };
    const result = await userSignup.safeParseAsync(payload);

    if (!result.success) {
        throw new ApiError(400, "Validation Error");
    }

    const { clientId, email, name, password, redirectUri, state } = result.data;
    const response = await signupService(email, name, password, {
        clientId,
        redirectUri,
        state
    });

    return new ApiResponse(res, 201, "User created successfully", response);
};

export const signin = async (req: Request, res: Response) => {
    const authorizationPayload = getAuthorizationPayload(req);

    if (!authorizationPayload.clientId) {
        return dashboardSigninController(req, res);
    }

    const payload = {
        ...req.body,
        ...authorizationPayload
    };
    const result = await userLogin.safeParseAsync(payload);

    if (!result.success) {
        throw new ApiError(400, "Validation Error");
    }

    const { clientId, email, password, redirectUri, state } = result.data;
    const response = await signinService(email, password, {
        clientId,
        redirectUri,
        state
    });

    if (!response) {
        throw new ApiError(401, "User Login failed");
    }

    return new ApiResponse(res, 200, "Authorization code generated successfully", response);
};

export const token = async (req: Request, res: Response) => {
    const body = getBody(req);
    const payload = {
        ...body,
        clientId: getRequestValue(body.clientId) ?? getRequestValue(body.client_id),
        clientSecret: getRequestValue(body.clientSecret) ?? getRequestValue(body.client_secret),
        redirectUri: getRequestValue(body.redirectUri) ?? getRequestValue(body.redirect_uri)
    };
    const result = await tokenExchange.safeParseAsync(payload);

    if (!result.success) {
        throw new ApiError(400, "Validation Error");
    }

    const { clientId, clientSecret, code, redirectUri } = result.data;
    const response = await exchangeAuthorizationCodeService(
        code,
        clientId,
        clientSecret,
        redirectUri
    );

    return new ApiResponse(res, 200, "Tokens generated successfully", response);
};

export const userinfo = async (req: AuthenticatedRequest, res: Response) => {
    const response = await userInfoService(requireUserId(req));
    return new ApiResponse(res, 200, "User fetched successfully", response);
};

export const certs = (_: Request, res: Response) => {
    const publicKey = fs.readFileSync(
        path.resolve(process.cwd(), "cert", "public.pem"),
        "utf8"
    );
    const jwk = createPublicKey(publicKey).export({ format: "jwk" }) as JsonWebKey;

    return res.status(200).json({
        keys: [
            {
                ...jwk,
                use: "sig",
                alg: "RS256",
                kid: "auth-service-rs256"
            }
        ]
    });
};

export const openIdConfig = (req: Request, res: Response) => {
    const baseURL = `${req.protocol}://${req.get("host") ?? "localhost:8000"}`;
    res.status(200).json({
        issuer: baseURL,
        authorization_endpoint: `${baseURL}/user/login`,
        token_endpoint: `${baseURL}/token`,
        userinfo_endpoint: `${baseURL}/userinfo`,
        jwks_uri: `${baseURL}/certs`,
        registration_endpoint: `${baseURL}/client/register`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        token_endpoint_auth_methods_supported: ["client_secret_post"]
    });
};
