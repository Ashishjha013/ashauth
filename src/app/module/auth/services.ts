import { and, eq, isNull, lt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "../../../db/config.js";
import { authorizationCodes, oAuthClients, users } from "../../../db/schema.js";
import { generateTokens } from "../../common/utils/jwt.utils.js";
import ApiError from "../../common/utils/ApiError.js";

const sanitizeUser = (user: any) => {
    if (!user) return null;

    const userObj = typeof user.toObject === "function" ? user.toObject() : { ...user };
    delete userObj.passwordHash;
    delete userObj.emailToken;
    delete userObj.passwordToken;
    delete userObj.refreshToken;
    return userObj;
};

const sanitizeClient = (client: typeof oAuthClients.$inferSelect) => ({
    id: client.id,
    ownerUserId: client.ownerUserId,
    applicationName: client.applicationName,
    contactEmail: client.contactEmail,
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    applicationUrl: client.applicationUrl,
    redirectUrl: client.redirectUrl,
    createdAt: client.createdAt
});

type AuthorizationRequest = {
    clientId: string;
    redirectUri: string | undefined;
    state: string | undefined;
};

const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;

const getOAuthClientByClientId = async (clientId: string) => {
    const clients = await db.select().from(oAuthClients).where(eq(oAuthClients.clientId, clientId));

    if (clients.length < 1) {
        throw new ApiError(404, "OAuth client not found");
    }

    return clients[0]!;
};

const getUserByEmail = async (email: string) => {
    const foundUsers = await db.select().from(users).where(eq(users.email, email));
    return foundUsers[0];
};

const getValidatedRedirectUri = (registeredRedirectUri: string, redirectUri?: string) => {
    if (redirectUri && redirectUri !== registeredRedirectUri) {
        throw new ApiError(400, "Invalid redirect URI");
    }

    return redirectUri ?? registeredRedirectUri;
};

const buildRedirectUrl = (redirectUri: string, code: string, state?: string) => {
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set("code", code);

    if (state) {
        redirectUrl.searchParams.set("state", state);
    }

    return redirectUrl.toString();
};

const createAuthorizationCode = async ({
    clientId,
    redirectUri,
    state,
    userId
}: AuthorizationRequest & { userId: number }) => {
    const client = await getOAuthClientByClientId(clientId);
    const resolvedRedirectUri = getValidatedRedirectUri(client.redirectUrl, redirectUri);
    const code = randomUUID();
    const expiresAt = new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS);

    await db.delete(authorizationCodes).where(lt(authorizationCodes.expiresAt, new Date()));

    const insertedCodes = await db.insert(authorizationCodes).values({
        code,
        clientId: client.clientId,
        redirectUri: resolvedRedirectUri,
        userId,
        expiresAt
    }).returning({
        code: authorizationCodes.code,
        clientId: authorizationCodes.clientId,
        redirectUri: authorizationCodes.redirectUri,
        userId: authorizationCodes.userId,
        expiresAt: authorizationCodes.expiresAt
    });

    const insertedCode = insertedCodes[0];

    if (!insertedCode) {
        throw new ApiError(500, "Authorization code could not be saved");
    }

    console.log("[auth] authorization code created", {
        code: insertedCode.code,
        clientId: insertedCode.clientId,
        redirectUri: insertedCode.redirectUri,
        userId: insertedCode.userId,
        expiresAt: insertedCode.expiresAt.toISOString()
    });

    return {
        clientId: client.clientId,
        code,
        expiresIn: Math.floor(AUTHORIZATION_CODE_TTL_MS / 1000),
        redirectTo: buildRedirectUrl(resolvedRedirectUri, code, state),
        redirectUri: resolvedRedirectUri,
        state
    };
};

export const getOAuthClientService = async (clientId: string, redirectUri?: string) => {
    const client = await getOAuthClientByClientId(clientId);

    return {
        client: sanitizeClient(client),
        redirectUri: getValidatedRedirectUri(client.redirectUrl, redirectUri)
    };
};

export const registerOAuthClientService = async (
    ownerUserId: number,
    applicationName: string,
    contactEmail: string,
    applicationUrl: string,
    redirectUrl: string
) => {
    const clientId = randomUUID();
    const clientSecret = randomUUID();
    const client = await db.insert(oAuthClients).values({
        ownerUserId,
        applicationName,
        applicationUrl,
        clientId,
        clientSecret,
        contactEmail,
        redirectUrl
    }).returning();

    if (client.length < 1) {
        throw new ApiError(500, "OAuth client registration failed");
    }

    return sanitizeClient(client[0]!);
};

export const updateOAuthClientService = async (
    ownerUserId: number,
    clientId: string,
    data: {
        applicationName: string;
        contactEmail: string;
        applicationUrl: string;
        redirectUrl: string;
    }
) => {
    const updatedClient = await db.update(oAuthClients)
        .set(data)
        .where(and(eq(oAuthClients.clientId, clientId), eq(oAuthClients.ownerUserId, ownerUserId)))
        .returning();

    if (updatedClient.length < 1) {
        throw new ApiError(404, "Project not found");
    }

    return sanitizeClient(updatedClient[0]!);
};

export const deleteOAuthClientService = async (ownerUserId: number, clientId: string) => {
    const deletedClient = await db.delete(oAuthClients)
        .where(and(eq(oAuthClients.clientId, clientId), eq(oAuthClients.ownerUserId, ownerUserId)))
        .returning();

    if (deletedClient.length < 1) {
        throw new ApiError(404, "Project not found");
    }

    return sanitizeClient(deletedClient[0]!);
};

export const getProjectsForUserService = async (ownerUserId: number) => {
    const clients = await db.select()
        .from(oAuthClients)
        .where(eq(oAuthClients.ownerUserId, ownerUserId));

    return clients.map(sanitizeClient);
};

export const dashboardSignupService = async (email: string, name: string, password: string) => {
    if (await getUserByEmail(email)) {
        throw new ApiError(409, "User already exists");
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const createdUsers = await db.insert(users).values({
        name,
        email,
        passwordHash: hashPassword
    }).returning();

    if (createdUsers.length < 1) {
        throw new ApiError(500, "User registration failed");
    }

    const user = createdUsers[0]!;
    const tokens = await generateTokens(user.id);

    return {
        user: sanitizeUser(user),
        ...tokens
    };
};

export const dashboardSigninService = async (email: string, password: string) => {
    const user = await getUserByEmail(email);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!await bcrypt.compare(password, user.passwordHash)) {
        throw new ApiError(401, "Invalid credentials");
    }

    const tokens = await generateTokens(user.id);

    return {
        user: sanitizeUser(user),
        ...tokens
    };
};

export const signupService = async (
    email: string,
    name: string,
    password: string,
    authorizationRequest: AuthorizationRequest
) => {
    if (!email || !name || !password) {
        throw new ApiError(400, "Bad Request");
    }

    if (await getUserByEmail(email)) {
        throw new ApiError(409, "User already exist");
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const user = await db.insert(users).values({
        name,
        email,
        passwordHash: hashPassword
    }).returning();

    if (!user.length) {
        throw new ApiError(500, "User Registration Failed");
    }

    return createAuthorizationCode({
        ...authorizationRequest,
        userId: user[0]!.id
    });
};

export const signinService = async (
    email: string,
    password: string,
    authorizationRequest: AuthorizationRequest
) => {
    if (!email || !password) {
        throw new ApiError(401, "Invalid Credential, Credential Required");
    }

    const user = await getUserByEmail(email);

    if (!user) {
        throw new ApiError(409, "User Not Found");
    }

    if (!await bcrypt.compare(password, user.passwordHash)) {
        throw new ApiError(401, "Invalid Credential!");
    }

    return createAuthorizationCode({
        ...authorizationRequest,
        userId: user.id
    });
};

export const userInfoService = async (userId: number) => {
    const user = await db.select().from(users).where(eq(users.id, userId));

    if (user.length < 1) {
        throw new ApiError(404, "User Not Found");
    }

    return sanitizeUser(user[0]);
};

export const exchangeAuthorizationCodeService = async (
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri?: string
) => {
    console.log("[auth] authorization code exchange requested", {
        code,
        clientId,
        redirectUri: redirectUri ?? null
    });

    const client = await getOAuthClientByClientId(clientId);

    if (client.clientSecret !== clientSecret) {
        throw new ApiError(401, "Invalid client credentials");
    }

    const matchedCodes = await db.select()
        .from(authorizationCodes)
        .where(eq(authorizationCodes.code, code));

    const authorizationCode = matchedCodes[0];

    if (!authorizationCode) {
        console.warn("[auth] authorization code not found", { code, clientId });
        throw new ApiError(400, "Invalid authorization code");
    }

    if (authorizationCode.expiresAt.getTime() < Date.now()) {
        throw new ApiError(400, "Authorization code expired");
    }

    if (authorizationCode.consumedAt) {
        throw new ApiError(400, "Authorization code already used");
    }

    const resolvedRedirectUri = getValidatedRedirectUri(client.redirectUrl, redirectUri);

    if (authorizationCode.clientId !== client.clientId || authorizationCode.redirectUri !== resolvedRedirectUri) {
        throw new ApiError(400, "Authorization code does not match client");
    }

    const consumedAt = new Date();
    const updatedCodes = await db.update(authorizationCodes)
        .set({ consumedAt })
        .where(and(
            eq(authorizationCodes.code, code),
            isNull(authorizationCodes.consumedAt)
        ))
        .returning({
            code: authorizationCodes.code,
            consumedAt: authorizationCodes.consumedAt
        });

    if (updatedCodes.length < 1) {
        console.warn("[auth] authorization code already consumed", { code, clientId });
        throw new ApiError(400, "Authorization code already used");
    }

    console.log("[auth] authorization code consumed", {
        code,
        clientId,
        userId: authorizationCode.userId,
        consumedAt: consumedAt.toISOString()
    });

    const tokens = await generateTokens(authorizationCode.userId);
    const user = await userInfoService(authorizationCode.userId);

    return {
        ...tokens,
        tokenType: "Bearer",
        user
    };
};
