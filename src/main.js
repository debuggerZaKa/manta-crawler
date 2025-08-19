import { PuppeteerCrawler, Dataset } from 'crawlee';
import { router } from './routes.js';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import readline from 'readline';

puppeteerExtra.use(StealthPlugin());

const searchParams = {
    search: 'Restaurants',
    context: 'industry',
    search_source: 'nav',
    city: 'Indianapolis',
    state: 'Indiana',
    device: 'desktop',
    screenResolution: '1920x1080'
};

const baseUrl = 'https://www.manta.com/search';
const queryString = new URLSearchParams(searchParams).toString();
const startUrls = [`${baseUrl}?${queryString}`];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const crawler = new PuppeteerCrawler({
    requestHandler: router,
    maxRequestsPerCrawl: 1000,
    maxConcurrency: 4, 
    headless: true,
    navigationTimeoutSecs: 120,
    maxRequestRetries: 2,
    launchContext: {
        launcher: puppeteerExtra,
        launchOptions: {
            executablePath: 'C:\\Users\\HP\\Downloads\\crawler\\chromium\\chromium\\win64-1490225\\chrome-win\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process' 
            ],
            defaultViewport: { width: 1280, height: 800 },
        },
    },
});


const exportAndStop = async () => {
    console.log('Preparing to export data...');
    await Dataset.exportToCSV('manta_results');
    console.log('Data exported to manta_results.csv');
    process.exit(0);
};


rl.on('line', (input) => {
    if (input.trim().toLowerCase() === 'stop') {
        exportAndStop();
    }
});

console.log('Crawler started. Type "stop" and press Enter to export data and stop the crawler.');

try {
    await crawler.run(startUrls);
    await exportAndStop(); 
} catch (error) {
    console.error('Crawler error:', error);
    await exportAndStop();
}