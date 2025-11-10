import { boolean, index, pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";

const snowflake = () => varchar({ length: 20 });

export const usersTable = pgTable("users", {
    id: snowflake().notNull(),
    guildId: snowflake().notNull(),
    lastVoteRequestAt: timestamp(),
}, (table) => ([
    primaryKey({ columns: [table.id, table.guildId] }),
]));

export const guildsTable = pgTable("guilds", {
    id: snowflake().primaryKey(),
    voteChannelId: snowflake(),
});

export const decorativeRolesTable = pgTable("decorative_roles", {
    id: snowflake().primaryKey(),
    guildId: snowflake().notNull(),
}, (table) => ([
    index("decorative_roles_guild_id_idx").on(table.guildId),
]));

export const nameVotesTable = pgTable("name_votes", {
    messageId: snowflake().primaryKey(),
    channelId: snowflake().notNull(),
    guildId: snowflake().notNull(),
    targetUserId: snowflake().notNull(),
    name: varchar({ length: 32 }).notNull(),
    startedAt: timestamp().notNull(),
    hasEnded: boolean().notNull().default(false),
}, (table) => [
    index("name_votes_channel_id_idx").on(table.channelId),
    index("name_votes_guild_id_idx").on(table.guildId),
    index("name_votes_has_ended_idx").on(table.hasEnded),
]);

export const roleVotesTable = pgTable("role_votes", {
    messageId: snowflake().primaryKey(),
    channelId: snowflake().notNull(),
    guildId: snowflake().notNull(),
    targetUserId: snowflake().notNull(),
    roleId: snowflake().notNull(),
    remove: boolean().notNull(),
    startedAt: timestamp().notNull(),
    hasEnded: boolean().notNull().default(false),
}, (table) => [
    index("role_votes_channel_id_idx").on(table.channelId),
    index("role_votes_guild_id_idx").on(table.guildId),
    index("role_votes_has_ended_idx").on(table.hasEnded),
]);
