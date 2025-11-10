import { pino } from "pino";
import PinoPretty from "pino-pretty";
import { config } from "config";

const logger = pino({
    level: config.logLevel,
}, PinoPretty({
    colorize: true,
    translateTime: "SYS:yyyy-mm-dd HH:MM:ss.ms",
    ignore: "pid,hostname",
}));

export { logger };
