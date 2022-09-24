const fileUuid = uuid();
const filePath = `files/${fileUuid}${fileExtension}`;

const filesInfo = JSON.parse(readFileSync("files.json"));

filesInfo.push({
	uuid: fileUuid,
	name: `${videoMetaInfo.title}${fileExtension}`,
	expires: new Date().getTime() + toMilliseconds(10, "m"),
});

writeFileSync("files.json", JSON.stringify(filesInfo));
