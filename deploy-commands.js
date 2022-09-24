import fs from "fs";

const { discordBotToken, discordBotClientId, originalGuildId } = JSON.parse(
	fs.readFileSync("config.json", "utf8")
);

import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";

const commands = [
	new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Replies with pong!"),

	new SlashCommandBuilder()
		.setName("unblacklist")
		.setDescription("Unblacklist a place")
		.addStringOption((option) =>
			option
				.setName("url")
				.setDescription(
					"Discord attachments URL to the file to be unblacklisted, file extension must be .rbxl or .rbxlx"
				)
				.setRequired(true)
		),
].map((command) => command.toJSON());

const rest = new REST({
	version: "9",
}).setToken(discordBotToken);

rest.put(Routes.applicationGuildCommands(discordBotClientId, originalGuildId), {
	body: commands,
})
	.then(() =>
		console.log("Successfully registered application guild commands.")
	)
	.catch(console.error);
