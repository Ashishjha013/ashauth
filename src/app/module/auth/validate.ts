import { z } from "zod"

const authClientFields = {
    clientId: z.string().uuid(),
    redirectUri: z.string().url().optional(),
    state: z.string().max(2048).optional()
}

export const userSignup = z.object({
    name: z.string().min(5).max(100),
    email: z.string().email().max(322),
    password: z.string().min(5).max(64),
    ...authClientFields
});

export const userLogin = z.object({
    email: z.string().email().max(322),
    password: z.string().min(5).max(64),
    ...authClientFields
})

export const dashboardLogin = z.object({
    email: z.string().email().max(322),
    password: z.string().min(5).max(64)
})


export const oAuthClientRegister = z.object({
    applicationName: z.string().min(3).max(255),
    contactEmail: z.string().email().max(322),
    applicationUrl: z.string().url(),
    redirectUrl: z.string().url()
})

export const oAuthClientUpdate = z.object({
    applicationName: z.string().min(3).max(255),
    contactEmail: z.string().email().max(322),
    applicationUrl: z.string().url(),
    redirectUrl: z.string().url()
})

export const dashboardSignup = z.object({
    name: z.string().min(3).max(100),
    email: z.string().email().max(322),
    password: z.string().min(5).max(64)
})

export const tokenExchange = z.object({
    code: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
    redirectUri: z.string().optional()
})
