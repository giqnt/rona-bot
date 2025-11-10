import { PermissionFlagsBits, roleMention, SlashCommandBuilder } from "discord.js";
import { defineSlashCommand } from "structure/command/SlashCommandDefinition";
import { UserError } from "structure/errors/UserError";

export default defineSlashCommand({
    builder: new SlashCommandBuilder()
        .setName("설정")
        .setDescription("설정")
        .addSubcommand((builder) => builder
            .setName("투표-채널")
            .setDescription("투표 채널을 설정합니다.")
            .addChannelOption((option) => option
                .setName("채널")
                .setDescription("투표를 진행할 채널")
                .setRequired(true),
            ))
        .addSubcommandGroup((builder) => builder
            .setName("치장-역할")
            .setDescription("치장 역할")
            .addSubcommand((builder) => builder
                .setName("목록")
                .setDescription("설정된 치장 역할을 나열합니다."),
            )
            .addSubcommand((builder) => builder
                .setName("추가")
                .setDescription("치장 역할을 추가합니다.")
                .addRoleOption((option) => option
                    .setName("역할")
                    .setDescription("추가할 역할")
                    .setRequired(true),
                ),
            )
            .addSubcommand((builder) => builder
                .setName("삭제")
                .setDescription("치장 역할을 삭제합니다.")
                .addRoleOption((option) => option
                    .setName("역할")
                    .setDescription("삭제할 역할")
                    .setRequired(true),
                ),
            )
            .addSubcommand((builder) => builder
                .setName("삭제-아이디")
                .setDescription("치장 역할을 아이디로 삭제합니다.")
                .addStringOption((option) => option
                    .setName("역할-아이디")
                    .setDescription("삭제할 역할의 아이디")
                    .setRequired(true),
                ),
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: async (interaction, bot) => {
        if (!interaction.inCachedGuild()) return;
        await interaction.deferReply({ flags: ["Ephemeral"] });

        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (subcommandGroup == null && subcommand === "투표-채널") {
            const voteChannel = interaction.options.getChannel("채널", true);
            if (!voteChannel.isSendable()) {
                throw new UserError("올바르지 않은 채널이에요.");
            }
            await bot.services.vote.setVoteChannel(voteChannel);
            await interaction.editReply("투표 채널 설정 완료.");
        } else if (subcommandGroup === "치장-역할") {
            if (subcommand === "목록") {
                const roleIds = await bot.services.vote.getDecorativeRoleIds(interaction.guildId);
                const output = roleIds.map((id) => `- ${roleMention(id)}`).join("\n");
                await interaction.editReply(`치장 역할 목록:\n${output}`);
            } else if (subcommand === "추가") {
                const role = interaction.options.getRole("역할", true);
                if (await bot.services.vote.addDecorativeRole(role)) {
                    await interaction.editReply("역할이 추가되었습니다.");
                } else {
                    throw new UserError("해당 역할은 이미 추가되어 있습니다.");
                }
            } else if (subcommand === "삭제") {
                const role = interaction.options.getRole("역할", true);
                if (await bot.services.vote.removeDecorativeRole(role.id)) {
                    await interaction.editReply("역할이 삭제되었습니다.");
                } else {
                    throw new UserError("해당 역할은 치장 역할로 추가되어있지 않습니다.");
                }
            } else if (subcommand === "삭제-아이디") {
                const roleId = interaction.options.getString("역할-아이디", true);
                if (await bot.services.vote.removeDecorativeRole(roleId)) {
                    await interaction.editReply("역할이 삭제되었습니다.");
                } else {
                    throw new UserError("해당 역할은 치장 역할로 추가되어있지 않습니다.");
                }
            }
        } else {
            throw new Error("Unknown subcommand group");
        }
    },
});
