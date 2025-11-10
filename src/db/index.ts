import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "config";

export const db = drizzle({
    connection: {
        connectionString: config.postgresUrl,
    },
    casing: "snake_case",
});
