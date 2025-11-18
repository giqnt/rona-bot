import type { Snowflake } from "discord.js";
import { z } from "zod";

const env = z.object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    TOKEN: z.string().min(1),
    POSTGRES_URL: z.url(),
    LOG_LEVEL: z.string().default("info"),
}).parse(process.env);

export const config = {
    environment: env.NODE_ENV,
    token: env.TOKEN,
    postgresUrl: env.POSTGRES_URL,
    logLevel: env.LOG_LEVEL,
    masterUserIds: [
        "454927000490999809",
    ] satisfies Snowflake[],
    vote: {
        emoji: {
            yes: "👍",
            no: "👎",
        },
        cooldownMs: 30 * 60 * 1000, // 30 minutes
        expirationTimeMs: 5 * 60 * 1000, // 5 minutes
        requiredYesVotes: 3,
    },
};
