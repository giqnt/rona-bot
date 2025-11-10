import { Bot } from "structure/Bot";
import { logger } from "utils/logger";

const bot = new Bot();

const terminate = () => {
    bot.stop().then((result) => {
        if (result) process.exit(0);
    }).catch((error: unknown) => {
        logger.error({ err: error }, "Error during shutdown");
        process.exit(1);
    });
};
process.on("SIGINT", terminate);
process.on("SIGTERM", terminate);

await bot.start();
