
import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    emailToken: text("email_token"),
    passwordToken: text("password_token"),
    refreshToken: text("refresh_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const oAuthClients = pgTable("oauth_clients", {
    id: serial("id").primaryKey(),
    ownerUserId: integer("owner_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    applicationName: varchar("application_name", { length: 255 }).notNull(),
    contactEmail: varchar("contact_email", { length: 255 }).notNull(),
    clientId: varchar("client_id", { length: 255 }).notNull().unique(),
    clientSecret: text("client_secret").notNull(),
    applicationUrl: text("application_url").notNull(),
    redirectUrl: text("redirect_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authorizationCodes = pgTable("authorization_codes", {
    code: text("code").primaryKey(),
    clientId: varchar("client_id", { length: 255 }).notNull(),
    redirectUri: text("redirect_uri").notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
