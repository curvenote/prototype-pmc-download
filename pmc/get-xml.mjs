import { makeS3Client, findFile, downloadFileFromS3 } from './utils.mjs';

if (process.argv.length < 3) {
  console.error('Usage: node get-xml.mjs <pmcId>');
  process.exit(1);
}

const pmcId = process.argv[2];

const client = makeS3Client();
const found = await findFile(client, pmcId);

if (!found) {
  console.log('File not found on any path.');
} else {
  await downloadFileFromS3(client, found.path, pmcId);
}
