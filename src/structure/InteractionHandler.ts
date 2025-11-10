import type { Interaction } from "discord.js";
import type { Bot } from "./Bot";

export interface InteractionHandler<T extends Interaction = Interaction> {
    canHandle(interaction: Interaction): interaction is T;
    handle(interaction: T, bot: Bot<true>): Promise<void>;
}
