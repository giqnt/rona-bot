import type { AutocompleteInteraction, ChatInputCommandInteraction, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import type { Bot } from "structure/Bot";

export interface SlashCommandDefinitionInput {
    builder: SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction, bot: Bot) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction, bot: Bot) => Promise<void>;
}

export interface SlashCommandDefinition {
    data: RESTPostAPIChatInputApplicationCommandsJSONBody;
    execute: (interaction: ChatInputCommandInteraction, bot: Bot) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction, bot: Bot) => Promise<void>;
}

export const defineSlashCommand = (definition: SlashCommandDefinitionInput): SlashCommandDefinition => {
    return {
        data: definition.builder.toJSON(),
        execute: definition.execute,
        autocomplete: definition.autocomplete,
    };
};
