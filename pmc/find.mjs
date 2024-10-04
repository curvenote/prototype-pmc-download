import { makeS3Client, findFile } from './utils.mjs';

if (process.argv.length < 3) {
  console.error('Usage: node find.mjs <pmcId>');
  process.exit(1);
}

const pmcId = process.argv[2];

const client = makeS3Client();
const found = await findFile(client, pmcId);
if (found) {
  console.log(`File is ${found.type} and at path: ${found.path}`);
} else console.log('File not found in any of the specified paths.');
