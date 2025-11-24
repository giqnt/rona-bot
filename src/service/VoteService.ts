import { inlineCode, roleMention, userMention, Collection, strikethrough, bold, underline } from "discord.js";
import type { Guild, GuildBasedChannel, GuildMember, Message, MessageReactionResolvable, ReactionManager, Role, SendableChannels, User } from "discord.js";
import { and, asc, eq } from "drizzle-orm";
import { config } from "config";
import type { BotService } from "service";
import type { Bot } from "structure/Bot";
import { db } from "db";
import { decorativeRolesTable, guildsTable, nameVotesTable, roleVotesTable, usersTable } from "db/schema";
import { UserError } from "structure/errors/UserError";
import { logger } from "utils/logger";

interface StartRoleVoteOptions {
    type: "role";
    target: GuildMember;
    requester?: GuildMember;
    role: Role;
    remove: boolean;
}

interface StartNameVoteOptions {
    type: "name";
    target: GuildMember;
    requester?: GuildMember;
    name: string;
}

type StartVoteOptions = StartRoleVoteOptions | StartNameVoteOptions;

type VoteType = StartVoteOptions["type"];

interface StartVoteResult {
    message: Message<true>;
}

type VoteData = typeof nameVotesTable.$inferSelect | typeof roleVotesTable.$inferSelect;

export class VoteService implements BotService {
    private readonly timeoutMap = new Map<string, NodeJS.Timeout>();

    public constructor(private readonly bot: Bot) {}

    public async init(): Promise<void> {
        const nameVotesData = await db.select().from(nameVotesTable)
            .where(eq(nameVotesTable.hasEnded, false))
            .orderBy(asc(nameVotesTable.startedAt));
        let now = Date.now();
        for (const nameVoteData of nameVotesData) {
            const expiresAt = nameVoteData.startedAt.getTime() + config.vote.expirationTimeMs;
            if (now >= expiresAt) {
                this.endVote("name", nameVoteData.messageId).catch((error: unknown) => {
                    logger.error(error, `Failed to end vote for message ${nameVoteData.messageId} on init`);
                });
            } else {
                this.timeoutMap.set(nameVoteData.messageId, setTimeout(() => {
                    this.endVote("name", nameVoteData.messageId).catch((error: unknown) => {
                        logger.error(error, `Failed to end vote for message ${nameVoteData.messageId} on expiration`);
                    });
                }, expiresAt - now));
            }
        }

        const roleVotesData = await db.select().from(roleVotesTable)
            .where(eq(roleVotesTable.hasEnded, false))
            .orderBy(asc(roleVotesTable.startedAt));
        now = Date.now();
        for (const roleVoteData of roleVotesData) {
            const expiresAt = roleVoteData.startedAt.getTime() + config.vote.expirationTimeMs;
            if (now >= expiresAt) {
                this.endVote("role", roleVoteData.messageId).catch((error: unknown) => {
                    logger.error(error, `Failed to end vote for message ${roleVoteData.messageId} on init`);
                });
            } else {
                this.timeoutMap.set(roleVoteData.messageId, setTimeout(() => {
                    this.endVote("role", roleVoteData.messageId).catch((error: unknown) => {
                        logger.error(error, `Failed to end vote for message ${roleVoteData.messageId} on expiration`);
                    });
                }, expiresAt - now));
            }
        }
    }

    /**
     * Gets the remaining cooldown time for a user to start a new vote.
     * @param userId The id of the user.
     * @returns The remaining cooldown time in milliseconds. If there is no cooldown, returns -1.
     */
    public async getCooldown(member: GuildMember): Promise<number> {
        const [user] = await db.select().from(usersTable)
            .where(and(eq(usersTable.id, member.id), eq(usersTable.guildId, member.guild.id)));
        if (user == null) return -1;
        const lastVoteRequestedAt = user.lastVoteRequestAt?.getTime();
        if (lastVoteRequestedAt == null) return -1;
        const cooldownEndsAt = lastVoteRequestedAt + config.vote.cooldownMs;
        const now = Date.now();
        if (now >= cooldownEndsAt) return -1;
        return cooldownEndsAt - now;
    }

    public async bumpCooldown(member: GuildMember): Promise<void> {
        const now = new Date();
        await db.insert(usersTable).values({
            id: member.id,
            guildId: member.guild.id,
            lastVoteRequestAt: now,
        }).onConflictDoUpdate({
            target: [usersTable.id, usersTable.guildId],
            set: {
                lastVoteRequestAt: now,
            },
        });
    }

    public async isDecorativeRole(roleId: string): Promise<boolean> {
        const [roleData] = await db.select().from(decorativeRolesTable)
            .where(eq(decorativeRolesTable.id, roleId));
        return roleData != null;
    }

    public async getDecorativeRoleIds(guildId: string): Promise<string[]> {
        const rolesData = await db.select().from(decorativeRolesTable)
            .where(eq(decorativeRolesTable.guildId, guildId));
        return rolesData.map((roleData) => roleData.id);
    }

    public async addDecorativeRole(role: Role): Promise<boolean> {
        const result = await db.insert(decorativeRolesTable)
            .values({ id: role.id, guildId: role.guild.id })
            .onConflictDoNothing();
        return result.rowCount != null && result.rowCount > 0;
    }

    public async removeDecorativeRole(roleId: string): Promise<boolean> {
        const result = await db.delete(decorativeRolesTable)
            .where(eq(decorativeRolesTable.id, roleId));
        return result.rowCount != null && result.rowCount > 0;
    }

    public async setVoteChannel(channel: Extract<SendableChannels, GuildBasedChannel>): Promise<void> {
        await db.insert(guildsTable)
            .values({ id: channel.guildId, voteChannelId: channel.id })
            .onConflictDoUpdate({
                target: guildsTable.id,
                set: {
                    voteChannelId: channel.id,
                },
            });
    }

    public async startVote(options: StartVoteOptions): Promise<StartVoteResult> {
        if (options.type === "name") {
            if (options.name.includes("`")) {
                throw new UserError("이름에는 `가 포함될 수 없어요.");
            }
            if (options.name.length > 32) {
                throw new UserError("이름은 32자 이내여야 해요.");
            }
        }

        const guild = options.target.guild;
        const [guildData] = await db.select().from(guildsTable).where(eq(guildsTable.id, guild.id));
        if (guildData?.voteChannelId == null) {
            throw new UserError("투표 기능이 설정되어있지 않습니다.");
        }
        const channel = await guild.channels.fetch(guildData.voteChannelId).catch(() => undefined);
        if (channel == null || !channel.isSendable()) {
            throw new UserError("올바르지 않은 투표 채널이 설정되어 있습니다.");
        }

        const requesterString = `${options.requester == null ? "누군가가" : userMention(options.requester.id)}가`;
        const messageString = options.type === "name"
            ? `${requesterString} ${userMention(options.target.id)}의 이름을 ${inlineCode(options.name)}로 바꾸자고 요청했습니다.`
            : options.remove
                ? `${requesterString} ${userMention(options.target.id)}한테서 ${roleMention(options.role.id)} 역할을 빼자고 요청했습니다.`
                : `${requesterString} ${userMention(options.target.id)}에게 ${roleMention(options.role.id)} 역할을 추가하자고 요청했습니다.`;

        const message = await channel.send(messageString);
        await message.react(config.vote.emoji.yes);
        await message.react(config.vote.emoji.no);
        const nowDate = new Date();
        if (options.type === "name") {
            await db.insert(nameVotesTable).values({
                messageId: message.id,
                channelId: message.channelId,
                guildId: message.guildId,
                targetUserId: options.target.id,
                name: options.name,
                startedAt: nowDate,
            });
        } else {
            await db.insert(roleVotesTable).values({
                messageId: message.id,
                channelId: message.channelId,
                guildId: message.guildId,
                targetUserId: options.target.id,
                roleId: options.role.id,
                remove: options.remove,
                startedAt: nowDate,
            });
        }
        this.timeoutMap.set(message.id, setTimeout(() => {
            this.endVote(options.type, message.id).catch((error: unknown) => {
                logger.error(error, `Failed to end vote for message ${message.id} on expiration`);
            });
        }, config.vote.expirationTimeMs));
        return { message };
    }

    private async endVote(type: VoteType, messageId: string): Promise<void> {
        clearTimeout(this.timeoutMap.get(messageId));
        this.timeoutMap.delete(messageId);

        const [voteData] = type === "name"
            ? await db.update(nameVotesTable)
                .set({ hasEnded: true })
                .where(eq(nameVotesTable.messageId, messageId))
                .returning()
            : await db.update(roleVotesTable)
                .set({ hasEnded: true })
                .where(eq(roleVotesTable.messageId, messageId))
                .returning();
        if (voteData == null) {
            throw new Error(`Unknown vote with message id ${messageId}`);
        }
        const { channelId, guildId } = voteData;

        const guild = await this.bot.client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);
        if (channel == null || !channel.isSendable()) return;
        const message = await channel.messages.fetch(messageId);
        await message.fetch();
        const yesVotes = await this.getReactionVotes(message.reactions, config.vote.emoji.yes);
        const noVotes = await this.getReactionVotes(message.reactions, config.vote.emoji.no);
        const accepted = yesVotes.size >= config.vote.requiredYesVotes && yesVotes.size > noVotes.size;
        const resultString = [
            bold(`결과: ${underline(accepted ? "통과" : "부결")}`),
            `-# 찬성(${yesVotes.size}): ${this.formatVotes(yesVotes)}`,
            `-# 반대(${noVotes.size}): ${this.formatVotes(noVotes)}`,
        ].join("\n");
        await message.edit(`${strikethrough(message.content)}\n${resultString}`);
        if (!accepted) return;
        await this.perform(voteData, guild);
    }

    private async perform(voteData: VoteData, guild: Guild): Promise<void> {
        const target = await guild.members.fetch(voteData.targetUserId);
        if ("name" in voteData) {
            if (!target.manageable) return;
            await target.setNickname(voteData.name);
        } else {
            const roleId = voteData.roleId;
            if (!await this.isDecorativeRole(roleId)) return;
            const role = await guild.roles.fetch(roleId);
            if (role == null || !role.editable) return;
            if (voteData.remove) {
                if (target.roles.cache.has(roleId)) {
                    await target.roles.remove(roleId);
                }
            } else {
                if (!target.roles.cache.has(roleId)) {
                    await target.roles.add(roleId);
                }
            }
        }
    };

    private async getReactionVotes(
        reactions: ReactionManager,
        emoji: MessageReactionResolvable,
    ): Promise<Collection<string, User>> {
        return reactions.resolve(emoji)?.users.fetch()
            .then((data) => data.filter((user) => !user.bot)) ?? new Collection();
    }

    private formatVotes(votes: Collection<string, User>): string {
        if (votes.size === 0) return "(없음)";
        return votes.map((user) => userMention(user.id)).join(" ");
    }
}
