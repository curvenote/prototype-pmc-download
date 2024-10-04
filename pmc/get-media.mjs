import { findPMCDownload, downloadPMCPackage } from './utils.mjs';

if (process.argv.length < 3) {
  console.error('Usage: node get-media.mjs <pmcId>');
  process.exit(1);
}

const pmcId = process.argv[2];

const entry = await findPMCDownload(pmcId);
if (!entry) {
  console.log('Could not find a media/supplementary data package on PMC.');
  process.exit(1);
}

await downloadPMCPackage(entry);
console.log('Download complete.');
