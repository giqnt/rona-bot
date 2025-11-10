import { roleMention, SlashCommandBuilder } from "discord.js";
import { defineSlashCommand } from "structure/command/SlashCommandDefinition";
import { UserError } from "structure/errors/UserError";

export default defineSlashCommand({
    builder: new SlashCommandBuilder()
        .setName("투표")
        .setDescription("투표")
        .addSubcommand((builder) => builder
            .setName("이름")
            .setDescription("특정 유저의 이름을 바꾸는 투표를 시작합니다.")
            .addUserOption((option) => option
                .setName("유저")
                .setDescription("역할을 부여할 유저")
                .setRequired(true),
            )
            .addStringOption((option) => option
                .setName("이름")
                .setDescription("바꿀 이름")
                .setRequired(true),
            ))
        .addSubcommand((builder) => builder
            .setName("역할")
            .setDescription("특정 유저에게 역할을 주거나 뺏는 투표를 시작합니다.")
            .addUserOption((option) => option
                .setName("유저")
                .setDescription("역할을 부여할 유저")
                .setRequired(true),
            )
            .addRoleOption((option) => option
                .setName("역할")
                .setDescription("부여할 역할")
                .setRequired(true),
            )
            .addBooleanOption((option) => option
                .setName("제거")
                .setDescription("역할을 부여하는 대신 제거할지 여부")
                .setRequired(false),
            )),
    execute: async (interaction, bot) => {
        if (!interaction.inCachedGuild()) return;

        const target = interaction.options.getMember("유저");
        if (target == null) {
            throw new UserError("해당 유저는 이 서버에 존재하지 않아요.");
        }

        await interaction.deferReply({ flags: ["Ephemeral"] });

        const cooldown = await bot.services.vote.getCooldown(interaction.member);
        if (cooldown > 0) {
            const minutes = Math.ceil(cooldown / 60000);
            const seconds = Math.ceil((cooldown % 60000) / 1000);
            const timeString = minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
            throw new UserError(`아직 투표를 시작할 수 없어요. 남은 대기 시간: ${timeString}`);
        }

        const subCommand = interaction.options.getSubcommand(true);
        if (subCommand === "이름") {
            const name = interaction.options.getString("이름", true);
            if (name.includes("`")) {
                throw new UserError("이름에는 `가 포함될 수 없어요.");
            }
            await bot.services.vote.bumpCooldown(interaction.member);
            const result = await bot.services.vote.startVote({
                type: "name",
                target,
                requester: interaction.member,
                name,
            });
            await interaction.editReply(`투표가 개시되었습니다: ${result.message.url}`);
        } else if (subCommand === "역할") {
            const role = interaction.options.getRole("역할", true);
            const remove = interaction.options.getBoolean("제거") ?? false;
            if (!await bot.services.vote.isDecorativeRole(role.id)) {
                throw new UserError(`${roleMention(role.id)} 역할은 투표로 추가 가능한 역할이 아닙니다.`);
            }
            await bot.services.vote.bumpCooldown(interaction.member);
            const result = await bot.services.vote.startVote({
                type: "role",
                target,
                requester: interaction.member,
                role,
                remove,
            });
            await interaction.editReply(`투표가 개시되었습니다: ${result.message.url}`);
        } else {
            throw new Error("Unknown subcommand");
        }
    },
});
