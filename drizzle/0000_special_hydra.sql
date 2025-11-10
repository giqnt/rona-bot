CREATE TABLE "decorative_roles" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"guild_id" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"vote_channel_id" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "name_votes" (
	"message_id" varchar(20) PRIMARY KEY NOT NULL,
	"channel_id" varchar(20) NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"target_user_id" varchar(20) NOT NULL,
	"name" varchar(32) NOT NULL,
	"started_at" timestamp NOT NULL,
	"has_ended" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_votes" (
	"message_id" varchar(20) PRIMARY KEY NOT NULL,
	"channel_id" varchar(20) NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"target_user_id" varchar(20) NOT NULL,
	"role_id" varchar(20) NOT NULL,
	"remove" boolean NOT NULL,
	"started_at" timestamp NOT NULL,
	"has_ended" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(20) NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"last_vote_request_at" timestamp,
	CONSTRAINT "users_id_guild_id_pk" PRIMARY KEY("id","guild_id")
);
--> statement-breakpoint
CREATE INDEX "decorative_roles_guild_id_idx" ON "decorative_roles" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "name_votes_channel_id_idx" ON "name_votes" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "name_votes_guild_id_idx" ON "name_votes" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "name_votes_has_ended_idx" ON "name_votes" USING btree ("has_ended");--> statement-breakpoint
CREATE INDEX "role_votes_channel_id_idx" ON "role_votes" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "role_votes_guild_id_idx" ON "role_votes" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "role_votes_has_ended_idx" ON "role_votes" USING btree ("has_ended");