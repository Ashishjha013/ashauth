import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
    out: './drizzle',
    schema: './src/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
    },
});
//# sourceMappingURL=drizzle.config.js.map
