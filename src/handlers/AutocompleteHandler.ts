import type { AutocompleteInteraction, Interaction } from "discord.js";
import { commands } from "commands";
import type { Bot } from "structure/Bot";
import type { InteractionHandler } from "structure/InteractionHandler";

export class AutocompleteHandler implements InteractionHandler<AutocompleteInteraction> {
    public canHandle(interaction: Interaction): interaction is AutocompleteInteraction {
        return interaction.isAutocomplete();
    }

    public async handle(interaction: AutocompleteInteraction, bot: Bot<true>): Promise<void> {
        const command = commands.find((cmd) => cmd.data.type === interaction.commandType && cmd.data.name === interaction.commandName);
        if (command?.autocomplete == null) return;
        await command.autocomplete(interaction, bot);
    }
}
