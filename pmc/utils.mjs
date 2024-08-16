import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import readline from 'readline';
import path from 'path';
import { pipeline } from 'stream';
import config from './config.json' assert { type: 'json' };
import { fileURLToPath } from 'url';

// Create equivalent of __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function makeS3Client() {
  // Create an S3 client without credentials (anonymous access)
  return new S3Client({
    credentials: null, // Anonymous access
    region: 'us-east-1', // Specify the region of your bucket
  });
}

async function checkFileExists(client, id, path) {
  const key = `${path}${id}.xml`;
  try {
    // Create the command to check if the object exists
    const command = new HeadObjectCommand({ Bucket: config.bucketName, Key: key });

    // Send the command to S3
    await client.send(command);

    // If the command succeeds, the file exists
    return key;
  } catch (err) {
    if (err.name === 'NotFound' || err.name === 'NoSuchKey') {
      // The file does not exist in this path
      return null;
    } else {
      // Some other error occurred
      throw err;
    }
  }
}

// Function to find the file in one of the paths
export async function findFile(client, id) {
  console.log(`Checking for ${id}`);
  for (const path of config.paths) {
    const result = await checkFileExists(client, id, path);
    if (result) {
      return {
        path: result,
        type: config.typeMap[path],
      };
    }
  }
}

export async function downloadFileFromS3(client, s3FilePath, pmcId) {
  // Create the local directory structure
  const localFilePath = path.join('articles', pmcId, `${pmcId}.xml`);
  await fs.ensureDir(path.dirname(localFilePath));

  // Create the GetObject command
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: s3FilePath,
  });

  try {
    // Get the file from S3
    const response = await client.send(command);

    // Save the file to the local filesystem
    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(localFilePath);
      pipeline(response.Body, fileStream, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log(`File saved to ${localFilePath}`);
  } catch (err) {
    console.error('Error downloading file:', err);
  }
}

const listingFilePath = 'listings/oa_file_list.csv';

// Function to transform a CSV line into a JSON object
function transformLineToJson(line) {
  const columns = ['url', 'journal', 'pmcId', 'date', 'id', 'license'];
  const values = line.split(',');

  // Create the JSON object by mapping columns to values
  const jsonObject = columns.reduce((obj, col, index) => {
    obj[col] = values[index];
    return obj;
  }, {});

  return jsonObject;
}

// Function to search for a pmcId in a large CSV file and return it as a JSON object
async function searchCsvForPmcId(filePath, pmcId) {
  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.includes(pmcId)) {
      const jsonObject = transformLineToJson(line);
      console.log('Found Supplementary Package Entry:', jsonObject);
      return jsonObject; // Return the JSON object if the pmcId is found
    }
  }

  console.log('pmcId not found.');
  return null; // Return null if the pmcId is not found
}

export async function findPMCDownload(pmcId) {
  const result = await searchCsvForPmcId(listingFilePath, pmcId);
  if (result) {
    return result;
  } else {
    console.log('pmcId was not found in the file.');
  }
}

// Function to download a file using curl
export async function downloadPMCPackage(jsonObject) {
  const baseUrl = 'https://ftp.ncbi.nlm.nih.gov/pub/pmc/';
  const fileUrl = baseUrl + jsonObject.url;

  // Define the output directory and file paths
  const outputDir = path.join(__dirname, 'articles', jsonObject.pmcId);
  const outputFile = path.join(outputDir, path.basename(jsonObject.url));
  const jsonFilePath = path.join(outputDir, 'entry.json');

  // Ensure the output directory exists
  fs.ensureDirSync(outputDir);

  // Construct the curl command
  const curlCommand = 'curl';
  const curlArgs = ['-o', outputFile, fileUrl];

  // Spawn the curl process
  const curlProcess = spawn(curlCommand, curlArgs);

  // Handle curl process stdout (progress and other info)
  curlProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  // Handle curl process stderr (errors)
  curlProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  // Handle curl process exit
  curlProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Curl process exited with code ${code}`);
      return;
    }
    console.log(`File downloaded successfully: ${outputFile}`);

    // Save the JSON object to entry.json
    fs.writeJson(jsonFilePath, jsonObject, { spaces: 2 }, (err) => {
      if (err) {
        console.error(`Error saving JSON object: ${err.message}`);
        return;
      }
      console.log(`JSON object saved successfully: ${jsonFilePath}`);
    });
  });
}
