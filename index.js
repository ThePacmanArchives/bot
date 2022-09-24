import {
	Client,
	Intents,
	MessageActionRow,
	MessageEmbed,
	MessageButton,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process";

import fs from "fs";
import cron from "node-cron";
import chalk from "chalk";
import express from "express";
import argon2 from "argon2";
import rateLimit from "express-rate-limit";
import validator from "validator";
import path from "path";
import download from "download";
import replace from "replace-in-file";
import encryptor from "file-encryptor";
import randomstring from "randomstring";

const {
	discordBotToken,
	originalGuildId,
	replyEmojiId,
	replyContinuedEmojiId,
	loadingEmojiId,
	checkmarkEmojiId,
	crossEmojiId,
	buyerRoleId,
} = JSON.parse(fs.readFileSync("config.json", "utf8"));

const { db_port, db_password } = JSON.parse(
	fs.readFileSync("../../../database.json", "utf8")
);

const { blueHex, greenHex, redHex, yellowHex, orangeHex, purpleHex, pinkHex } =
	JSON.parse(fs.readFileSync("../../../colors.json", "utf8"));

const { successColor, errorColor, infoColor, warningColor } = JSON.parse(
	fs.readFileSync("../../../discord-colors.json", "utf8")
);

const client = new Client({
	disableEveryone: true,
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.GUILD_BANS,
		Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
		Intents.FLAGS.GUILD_INTEGRATIONS,
		Intents.FLAGS.GUILD_WEBHOOKS,
		Intents.FLAGS.GUILD_INVITES,
		Intents.FLAGS.GUILD_VOICE_STATES,
		Intents.FLAGS.GUILD_PRESENCES,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		Intents.FLAGS.GUILD_MESSAGE_TYPING,
		Intents.FLAGS.DIRECT_MESSAGES,
		Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
		Intents.FLAGS.DIRECT_MESSAGE_TYPING,
		Intents.FLAGS.GUILD_SCHEDULED_EVENTS,
	],
});

const downloadLimiter = rateLimit({
	windowMs: 10000,
	max: 10,
	message: "Too Many Requests",
	standardHeaders: true,
	legacyHeaders: false,
});

const app = express();

async function updateStatus(client) {
	client.user.setActivity(
		`ROBLOX with ${
			(await JSON.parse(fs.readFileSync("data.json", "utf8")))
				.unblacklistedCount
		} places unblacklisted!`,
		{ type: "WATCHING" }
	);
}

async function unblacklist(interaction, fileURL, fileName, emojis) {
	const {
		replyEmoji,
		replyContinuedEmoji,
		loadingEmoji,
		checkmarkEmoji,
		crossEmoji,
	} = emojis;

	await interaction.editReply({
		embeds: [
			new MessageEmbed()
				.setColor(infoColor)
				.setTitle("Unblacklisting")
				.setDescription(
					`${fileURL}\n${replyContinuedEmoji}Downloading file ${checkmarkEmoji}\n${replyContinuedEmoji}Converting file ${checkmarkEmoji}\n${replyEmoji}Unblacklisting file ${loadingEmoji}`
				)
				.setTimestamp(),
		],
	});

	exec(
		`python3 unblacklister.py convertedFiles/${fileName}x false`,
		async function (error, stdout) {
			if (error) {
				console.log(
					chalk
						.hex(redHex)
						.bold(`${fileName}x failed to unblacklist.\n${error}`)
				);

				await interaction.editReply({
					embeds: [
						new MessageEmbed()
							.setColor(errorColor)
							.setTitle("Unexpected error")
							.setDescription(
								`${fileURL}\n${replyContinuedEmoji}Downloading file ${checkmarkEmoji}\n${replyContinuedEmoji}Converting file ${checkmarkEmoji}\n${replyEmoji}Unblacklisting file ${crossEmoji}`
							)
							.setTimestamp(),
					],
				});

				if (fs.existsSync(`convertedFiles/${fileName}`)) {
					fs.unlinkSync(`convertedFiles/${fileName}`);
				}

				if (fs.existsSync(`convertedFiles/${fileName}x`)) {
					fs.unlinkSync(`convertedFiles/${fileName}x`);
				}

				return;
			}

			await interaction.editReply({
				embeds: [
					new MessageEmbed()
						.setColor(infoColor)
						.setTitle("Unblacklisting")
						.setDescription(
							`${fileURL}\n${replyContinuedEmoji}Downloading file ${checkmarkEmoji}\n${replyContinuedEmoji}Converting file ${checkmarkEmoji}\n${replyContinuedEmoji}Unblacklisting file ${checkmarkEmoji}\n${replyEmoji}Finishing ${loadingEmoji}`
						)
						.setTimestamp(),
				],
			});

			const fileUUID = uuidv4();
			const secretKey = randomstring.generate({
				length: 64,
				charset: "alphanumeric",
			});

			const filesInfo = JSON.parse(fs.readFileSync("files.json"));

			filesInfo.push({
				uuid: fileUUID,
				name: `${fileName}x`,
				expires: new Date().getTime() + 5 * 60 * 1000,
				secretKey: await argon2.hash(secretKey),
			});

			fs.writeFileSync(
				"files.json",
				JSON.stringify(filesInfo, null, 4),
				"utf8"
			);

			fs.copyFileSync(
				`convertedFiles/${fileName}x`,
				`files/${fileUUID}.rbxlx`
			);

			await interaction.editReply({
				embeds: [
					new MessageEmbed()
						.setColor(successColor)
						.setTitle("Unblacklisted")
						.setDescription(
							`Successfully unblacklisted\n${replyEmoji}File size: ${
								fs.statSync(`files/${fileUUID}.rbxlx`).size /
								1000000
							} MB\n\nThe download button will expire in 5 minutes.`
						)
						.setTimestamp(),
				],
				components: [
					new MessageActionRow().addComponents(
						new MessageButton()
							.setURL(
								`https://pacman.falcon-utility.com/download/${fileUUID}?secretKey=${secretKey}`
							)
							.setLabel(`Download file`)
							.setStyle("LINK")
					),
				],
			});

			fs.writeFileSync(
				"data.json",
				JSON.stringify(
					{
						unblacklistedCount:
							JSON.parse(fs.readFileSync("data.json", "utf8"))
								.unblacklistedCount + 1,
					},
					null,
					4
				),
				"utf8"
			);

			if (fs.existsSync(`convertedFiles/${fileName}`)) {
				fs.unlinkSync(`convertedFiles/${fileName}`);
			}

			if (fs.existsSync(`convertedFiles/${fileName}x`)) {
				fs.unlinkSync(`convertedFiles/${fileName}x`);
			}
		}
	);
}

app.use(express.json({ extended: true }));

app.get("/*", downloadLimiter, async (request, response) => {
	const targetFiles = fs
		.readdirSync("files")
		.filter(
			(fileName) =>
				`/${path.basename(fileName, path.extname(fileName))}` ===
				request.url.split("?")[0]
		);

	if (targetFiles.length === 0) {
		response.json({
			error: "File not found/expired",
		});
	} else {
		const targetFileName = targetFiles[0];
		const targetFilePath = `files/${targetFileName}`;

		const filteredFilesInfo = JSON.parse(
			fs.readFileSync("files.json")
		).filter(
			(info) =>
				info.uuid ===
				path.basename(targetFileName, path.extname(targetFileName))
		);

		if (filteredFilesInfo.length === 0) {
			response.json({
				error: "File found but not in database",
			});
		} else {
			if (
				argon2.verify(
					filteredFilesInfo[0].secretKey,
					request.query.secretKey
				)
			) {
				const targetFileInfo = filteredFilesInfo[0];
				const targetFileRealName = targetFileInfo.name;

				const newTargetFilePath = `tempFiles/${targetFileRealName}`;

				fs.copyFileSync(targetFilePath, newTargetFilePath);

				response.status(200).download(newTargetFilePath, (error) => {
					if (error)
						console.log(
							chalk
								.hex(redHex)
								.bold(
									`Error while trying to serve a file\n${error}`
								)
						);

					if (fs.existsSync(newTargetFilePath)) {
						fs.unlinkSync(newTargetFilePath);
					}
				});
			} else {
				response.json({
					error: "Invalid secret key",
				});
			}
		}
	}
});

client.once("ready", async () => {
	console.log(chalk.hex(yellowHex).bold(`Logged in as ${client.user.tag}`));

	await updateStatus(client);

	cron.schedule("*/10 * * * * *", async () => {
		await updateStatus(client);
	});

	cron.schedule("*/1 * * * * *", async () => {
		const filesInfo = JSON.parse(fs.readFileSync("files.json"));

		for (const fileInfo of filesInfo) {
			if (new Date().getTime() > fileInfo.expires) {
				console.log(
					chalk.hex(orangeHex).bold(`${fileInfo.name} expired`)
				);

				const expiredFilePath = `files/${fileInfo.uuid}${path.extname(
					fileInfo.name
				)}`;

				if (fs.existsSync(expiredFilePath)) {
					console.log(
						chalk.hex(blueHex).bold(`Deleting ${fileInfo.name}`)
					);

					fs.unlinkSync(expiredFilePath);

					console.log(
						chalk
							.hex(greenHex)
							.bold(`Successfully deleted ${fileInfo.name}`)
					);
				} else {
					console.log(
						chalk
							.hex(redHex)
							.bold(
								`${fileInfo.name} not deleted because it doesn't exist`
							)
					);
				}
			}
		}

		fs.writeFileSync(
			"files.json",
			JSON.stringify(
				filesInfo.filter(
					(fileInfo) =>
						new Date().getTime() < parseInt(fileInfo.expires)
				),
				null,
				4
			),
			"utf8"
		);

		for (const file of fs.readdirSync("files")) {
			const targetFilesInfo = filesInfo.filter(
				(fileInfo) =>
					fileInfo.uuid === path.basename(file, path.extname(file))
			);

			if (targetFilesInfo.length === 0) {
				console.log(
					chalk
						.hex(orangeHex)
						.bold(
							`Deleting ${file} because file not found in database`
						)
				);

				fs.unlinkSync(`files/${file}`);

				console.log(
					chalk
						.hex(greenHex)
						.bold(
							`Deleted ${file} because file not found in database`
						)
				);
			}
		}
	});
});

client.on("interactionCreate", async (interaction) => {
	const emojis = {
		replyEmoji: client.emojis.cache.get(replyEmojiId),
		replyContinuedEmoji: client.emojis.cache.get(replyContinuedEmojiId),
		loadingEmoji: client.emojis.cache.get(loadingEmojiId),
		checkmarkEmoji: checkmarkEmojiId,
		crossEmoji: crossEmojiId,
	};

	const {
		replyEmoji,
		replyContinuedEmoji,
		loadingEmoji,
		checkmarkEmoji,
		crossEmoji,
	} = emojis;

	if (interaction.guild === null) {
		await interaction.reply({
			embeds: [
				new MessageEmbed()
					.setColor(redHex)
					.setTitle("Error")
					.setDescription(`You cannot interact inside DM`)
					.setTimestamp(),
			],
			ephemeral: true,
		});

		return;
	} else if (interaction.guild.id !== originalGuildId) {
		await interaction.reply({
			embeds: [
				new MessageEmbed()
					.setColor(redHex)
					.setTitle("Error")
					.setDescription(
						`You cannot interact outside of the original server`
					)
					.setTimestamp(),
			],
			ephemeral: true,
		});

		return;
	}

	if (interaction.isCommand()) {
		const { commandName } = interaction;

		if (commandName === "ping") {
			await interaction.reply({
				embeds: [
					new MessageEmbed()
						.setColor(successColor)
						.setTitle("Pong 🏓")
						.setDescription(
							`${replyContinuedEmoji}Latency: \`${
								Date.now() - interaction.createdTimestamp
							}ms\`\n${replyEmoji}API Latency: \`${Math.round(
								client.ws.ping
							)}ms\``
						)
						.setTimestamp(),
				],
				ephemeral: true,
			});
		} else if (commandName === "unblacklist") {
			if (!interaction.member.roles.cache.has(buyerRoleId)) {
				await interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(errorColor)
							.setTitle("Error")
							.setDescription(
								"You don't have permission to use this command"
							)
							.setTimestamp(),
					],
					ephemeral: true,
				});
			}

			await interaction.deferReply();

			const fileURL = interaction.options.getString("url");

			if (
				validator.isURL(fileURL) &&
				fileURL.startsWith("https://cdn.discordapp.com/attachments/") &&
				(path.extname(fileURL) === ".rbxl" ||
					path.extname(fileURL) === ".rbxlx")
			) {
				await interaction.editReply({
					embeds: [
						new MessageEmbed()
							.setColor(infoColor)
							.setTitle("Unblacklisting")
							.setDescription(
								`${fileURL}\n${replyEmoji}Downloading file ${loadingEmoji}`
							)
							.setTimestamp(),
					],
				});

				const fileName = `unblacklisted-${uuidv4()}${path.extname(
					fileURL
				)}`;

				try {
					fs.writeFileSync(
						`convertedFiles/${fileName}`,
						await download(fileURL)
					);
				} catch (error) {
					console.log(
						chalk
							.hex(redHex)
							.bold(`${fileName} failed to download.\n${error}`)
					);

					await interaction.editReply({
						embeds: [
							new MessageEmbed()
								.setColor(infoColor)
								.setTitle("Unexpected error")
								.setDescription(
									`${fileURL}\n${replyContinuedEmoji}Downloading file ${crossEmoji}\n\`\`\`\n${error}\`\`\``
								)
								.setTimestamp(),
						],
					});

					if (fs.existsSync(`convertedFiles/${fileName}`)) {
						fs.unlinkSync(`convertedFiles/${fileName}`);
					}

					return;
				}

				await interaction.editReply({
					embeds: [
						new MessageEmbed()
							.setColor(infoColor)
							.setTitle("Unblacklisting")
							.setDescription(
								`${fileURL}\n${replyContinuedEmoji}Downloading file ${checkmarkEmoji}\n${replyEmoji}Converting file ${loadingEmoji}`
							)
							.setTimestamp(),
					],
				});

				if (path.extname(fileURL) === ".rbxl") {
					exec(
						"echo 'fs.write(\"convertedFiles/" +
							fileName +
							'x", fs.read("convertedFiles/' +
							fileName +
							"\"))' | ./rbxmk run --desc-latest --desc-patch dump.desc-patch.json -",
						async function (error, stdout) {
							if (
								error ||
								!fs.existsSync(`convertedFiles/${fileName}x`)
							) {
								console.log(
									chalk
										.hex(redHex)
										.bold(
											`${fileName} failed to convert.\n${error}`
										)
								);

								await interaction.editReply({
									embeds: [
										new MessageEmbed()
											.setColor(errorColor)
											.setTitle("Unexpected error")
											.setDescription(
												`${fileURL}\n${replyContinuedEmoji}Downloading file ${checkmarkEmoji}\n${replyEmoji}Converting file ${crossEmoji}`
											)
											.setTimestamp(),
									],
								});

								if (
									fs.existsSync(`convertedFiles/${fileName}`)
								) {
									fs.unlinkSync(`convertedFiles/${fileName}`);
								}

								if (
									fs.existsSync(`convertedFiles/${fileName}x`)
								) {
									fs.unlinkSync(
										`convertedFiles/${fileName}x`
									);
								}

								return;
							}

							await replace({
								files: `convertedFiles/${fileName}x`,
								from: "&#16;",
								to: "",
							});

							await unblacklist(
								interaction,
								fileURL,
								fileName,
								emojis
							);
						}
					);
				} else {
					await unblacklist(
						interaction,
						fileURL,
						`${path.basename(
							fileName,
							path.extname(fileName)
						)}.rbxl`,
						emojis
					);
				}
			} else {
				await interaction.editReply({
					embeds: [
						new MessageEmbed()
							.setColor(errorColor)
							.setTitle("Error")
							.setDescription(
								"Invalid URL. Please make sure the file URL is a Discord attachments URL and the file extension is .rbxl or .rbxlx"
							)
							.setTimestamp(),
					],
				});
			}
		} else {
			await interaction.reply({
				embeds: [
					new MessageEmbed()
						.setColor(errorColor)
						.setTitle("Error")
						.setDescription(`This command is not finished yet.`)
						.setTimestamp(),
				],
				ephemeral: true,
			});
		}
	}
});

app.listen(3004, () => {
	console.log(chalk.hex(greenHex).bold("Server listening on port 3004"));
});

client.login(discordBotToken);
