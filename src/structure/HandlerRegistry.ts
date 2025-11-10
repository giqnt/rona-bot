import type { Interaction } from "discord.js";
import type { Bot } from "./Bot";
import type { InteractionHandler } from "./InteractionHandler";
import { CommandHandler } from "handlers/CommandHandler";
import { AutocompleteHandler } from "handlers/AutocompleteHandler";

export class HandlerRegistry {
    private readonly handlers: InteractionHandler[] = [];
    private readonly bot: Bot;

    public constructor(bot: Bot) {
        this.bot = bot;
        this.registerDefaultHandlers();
    }

    private registerDefaultHandlers(): void {
        this.register(new CommandHandler());
        this.register(new AutocompleteHandler());
    }

    private register(handler: InteractionHandler): void {
        this.handlers.push(handler);
    }

    public async handle(interaction: Interaction): Promise<void> {
        if (!this.bot.isReady()) return;
        for (const handler of this.handlers) {
            if (handler.canHandle(interaction)) {
                await handler.handle(interaction, this.bot);
                return;
            }
        }
    }
}
