import { VoteService } from "./VoteService";
import type { Bot } from "structure/Bot";

export interface BotService {
    init(): Promise<void>;
}

export const buildServices = (bot: Bot) => ({
    vote: new VoteService(bot),
} satisfies Record<string, BotService>);
