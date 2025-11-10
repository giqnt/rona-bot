import { defineConfig } from "drizzle-kit";
import { z } from "zod";

const env = z.object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    POSTGRES_URL: z.url(),
}).parse(process.env);

export default defineConfig({
    out: "./drizzle",
    schema: "./src/db/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: env.POSTGRES_URL,
    },
    strict: true,
    verbose: env.NODE_ENV !== "production",
    casing: "snake_case",
});
