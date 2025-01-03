#!/usr/bin/env node

const { Command } = require('commander');
const packageInfo = require('./package.json');

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadModel(url, outputPath) {
    if (!url) {
        throw new Error('No URL provided');
    }

    if (!outputPath) {
        throw new Error('No output path provided');
    }

    const fullPath = path.resolve(process.cwd(), outputPath);

    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            maxRedirects: 5,
            timeout: 30000,
            headers: {
                'User-Agent': 'Node.js Download Script'
            },
            onDownloadProgress: (progressEvent) => {
                const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                process.stdout.write(`Downloaded: ${percentage}%\r`);
            }
        });

        const totalSize = parseInt(response.headers['content-length'], 10);
        if (totalSize) {
            console.log(`Total file size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        }

        const writer = fs.createWriteStream(fullPath);

        return new Promise((resolve, reject) => {
            response.data.pipe(writer);

            writer.on('finish', () => {
                process.stdout.write('\n');
                console.log('File downloaded successfully!');
                writer.close();
                resolve();
            });

            writer.on('error', err => {
                fs.unlink(fullPath, () => { });
                reject(err);
            });
        });
    } catch (error) {
        // Clean up the file if it exists
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
        throw new Error(`Download failed: ${error.message}`);
    }
}

const program = new Command();
program
    .version(packageInfo.version)
    .requiredOption('-u, --url <url>', 'Download URL')
    .requiredOption('-p, --path <prompt>', 'Output path');

program.parse(process.argv);
const options = program.opts();

const url = `${options.url}`;
const target = `${options.path}`;

console.log(`Downloading from ${url} to ${target}`);

// Run the download
downloadModel(url, target)
    .then(() => {
        console.log('Download completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Download failed:', error.message);
        process.exit(1);
    });