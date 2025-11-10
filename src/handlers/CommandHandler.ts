import type { ChatInputCommandInteraction, Interaction } from "discord.js";
import { commands } from "commands";
import type { Bot } from "structure/Bot";
import type { InteractionHandler } from "structure/InteractionHandler";

export class CommandHandler implements InteractionHandler<ChatInputCommandInteraction> {
    public canHandle(interaction: Interaction): interaction is ChatInputCommandInteraction {
        return interaction.isCommand();
    }

    public async handle(interaction: ChatInputCommandInteraction, bot: Bot<true>): Promise<void> {
        const command = commands.find((cmd) => cmd.data.type === interaction.commandType && cmd.data.name === interaction.commandName);
        if (command == null) return;
        await command.execute(interaction, bot);
    }
}
