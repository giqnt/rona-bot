import { Client, Colors, ContainerBuilder, Events, GatewayIntentBits, REST, Routes, TextDisplayBuilder } from "discord.js";
import type { Interaction } from "discord.js";
import { HandlerRegistry } from "./HandlerRegistry";
import { UserError } from "./errors/UserError";
import { commands } from "commands";
import { config } from "config";
import { logger } from "utils/logger";
import { buildServices } from "service";

export class Bot<Ready extends boolean = boolean> {
    public readonly client: Client<Ready>;
    private _terminating = false;
    public readonly services;
    private handlerRegistry?: HandlerRegistry;

    public constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
            ],
            allowedMentions: {
                parse: [],
                repliedUser: false,
            },
        });
        this.services = buildServices(this);
        this.setupEventListeners();
    }

    public isReady(): this is Bot<true> {
        return this.client.isReady();
    }

    public async start(): Promise<void> {
        await this.client.login(config.token);
    }

    public async stop(): Promise<boolean> {
        if (this._terminating) return false;
        this._terminating = true;
        logger.info("Stopping bot...");
        await this.client.destroy();
        logger.info("Bot has been stopped.");
        return true;
    }

    private setupEventListeners(): void {
        this.client.on(Events.ClientReady, (client) => {
            this.handleReady(client).catch((error: unknown) => {
                logger.error(error, "Failed to handle ready event");
            });
        });
        this.client.on("interactionCreate", (interaction) => {
            this.handleInteraction(interaction)
                .catch((error: unknown) => this.handleInteractionError(interaction, error))
                .catch((error: unknown) => {
                    logger.error(error, "Failed to process interaction error");
                });
        });
    }

    private async handleReady(client: Client<true>): Promise<void> {
        logger.info(`Logged in as ${client.user.tag}`);
        await Promise.all(Object.values(this.services).map((service) => service.init()));
        logger.info("Initialized all services.");
        this.handlerRegistry = new HandlerRegistry(this);
        await this.registerCommands();
    }

    private async registerCommands(): Promise<void> {
        const rest = new REST().setToken(config.token);
        const commandData = commands.map((command) => command.data);

        try {
            await rest.put(
                Routes.applicationCommands(this.client.user!.id),
                { body: commandData },
            );
            logger.info("Successfully registered application commands.");
        } catch (error) {
            logger.error(error, "Error registering commands");
        }
    }

    private async handleInteraction(interaction: Interaction): Promise<void> {
        if (this.handlerRegistry == null) {
            logger.warn("Handler registry not initialized");
            return;
        }
        await this.handlerRegistry.handle(interaction);
    }

    private async handleInteractionError(interaction: Interaction, error: unknown): Promise<void> {
        if (interaction.isRepliable()) {
            const message = error instanceof UserError ? error.message : undefined;
            if (message == null) {
                logger.error({ interaction: interaction.toJSON(), err: error }, "Error handling interaction");
            }
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder()
                    .setContent(message ?? "An internal error occurred."))
                .setAccentColor(Colors.Red);
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        flags: ["Ephemeral", "IsComponentsV2"],
                        components: [container],
                    });
                } else {
                    await interaction.reply({
                        flags: ["Ephemeral", "IsComponentsV2"],
                        components: [container],
                    });
                }
            } catch (replyError) {
                logger.error(replyError, "Failed to send error message to user");
            }
        } else {
            logger.error({ interaction: interaction.toJSON(), err: error }, "Error handling interaction");
        }
    }
}
