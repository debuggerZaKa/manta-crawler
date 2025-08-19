import { createPuppeteerRouter, Dataset } from "crawlee";
import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteerExtra.use(stealthPlugin());

export const router = createPuppeteerRouter();

const seenPaginationLinks = new Set();
const seenDetailLinks = new Set();
let consecutiveNoNewPagination = 0;
const MAX_NO_NEW_PAGINATION = 3;

const processUrls = (urls, seenSet) => {
    return urls.filter(url => 
        url && 
        !seenSet.has(url) && 
        !url.toLowerCase().includes("urlverify?redirect")
    );
};

router.addDefaultHandler(async ({ page, crawler, log }) => {
    log.info(`Default handler: Scraping first page`);

    const itemUrls = await page.$$eval(
        "div.md\\:rounded.bg-white a.cursor-pointer",
        (elements) => elements.map((el) => el.href)
    );

    log.info(`Default handler: Found ${itemUrls.length} detail page links`);

    const validUrls = processUrls(itemUrls, seenDetailLinks);
    if (validUrls.length === 0) {
        log.warning("Default handler: No new detail pages found.");
        return;
    }

    validUrls.forEach(url => seenDetailLinks.add(url));
    const requests = validUrls.map(url => ({
        url,
        userData: { fromListing: true },
        label: "detail",
        uniqueKey: url,
    }));

    log.info(`Default handler: Enqueuing ${requests.length} detail pages`);
    await crawler.addRequests(requests);

    const paginationLinks = await page.$$eval('a[href*="pg="]', (elements) => 
        elements.map((el) => el.href)
    );

    const filteredPaginationLinks = [...new Set(paginationLinks)].filter(link => 
        link.includes("pg=")
    );

    log.info(`Default handler: Found ${filteredPaginationLinks.length} pagination links`);
    if (filteredPaginationLinks.length > 0) {
        const paginationRequests = filteredPaginationLinks.map((url) => ({
            url,
            userData: { fromListing: true },
            label: "listing",
        }));
        log.info(`Default handler: Enqueuing ${paginationRequests.length} pagination pages`);
        await crawler.addRequests(paginationRequests);
    }
});

router.addHandler("detail", async ({ request, page, log, crawler, pushData }) => {
    log.info(`Detail handler: Scraping company page: ${request.url}`);
    await page.waitForNetworkIdle();

    // Primary selector with proper class structure
    const title = await page.$eval(
        'div.flex.max-w-xl.text-black.text-3xl.font-bold.font-serif a.cursor-pointer', 
        el => el.textContent.trim()
    ).catch(async () => {
        // Fallback selectors
        try {
            return await page.$eval(
                'div.font-bold a.cursor-pointer, h1', 
                el => el.textContent.trim()
            );
        } catch {
            // Final fallback to title tag
            const fullTitle = await page.title();
            return fullTitle.split(' - ')[0].trim();
        }
    });

    const phone = await page.$eval('a[href^="tel:"]', (el) => 
        el.textContent.replace(/\s+/g, " ").trim()
    ).catch(() => null);

    const address = await page.$eval('a[href*="maps.google.com"], a[href*="maps"]', (el) => 
        el.textContent.replace(/\s+/g, " ").trim()
    ).catch(() => null);

    const email = await page.$eval('a[href*="mailto:"]', (el) => {
        const mailto = el.getAttribute('href');
        const emailMatch = mailto ? mailto.replace('mailto:', '').split('?')[0] : null;
        return emailMatch ? emailMatch.trim() : null;
    }).catch(() => null);

    let website = await page.$$eval('a[href*="/urlverify?redirect="]', (links) => {
        for (const link of links) {
            const href = link.getAttribute("href");
            if (href && href.includes("/urlverify?redirect=")) {
                const urlParam = new URL("https://manta.com" + href).searchParams.get("redirect");
                if (urlParam) return decodeURIComponent(urlParam);
            }
        }
        return null;
    }).catch(() => null);

    if (email || website) {
        const data = {
            url: request.loadedUrl,
            title,
            phone,
            address,
            website,
            email: email || null,
        };

        if (email) {
            await pushData(data);
            log.info(`Detail handler: Pushed data with email: ${email}`);
        } else if (website) {
            log.info(`Detail handler: No email found, checking website ${website} for emails`);
            await crawler.addRequests([{
                url: website,
                label: "website_scraper",
                userData: data,
            }]);
        }
    } else {
        log.info(`Detail handler: No email or website found, skipping record`);
    }
});

router.addHandler("listing", async ({ page, crawler, log }) => {
    log.info(`Listing handler: Scraping pagination page`);

    const itemUrls = await page.$$eval(
        "div.md\\:rounded.bg-white a.cursor-pointer",
        (elements) => elements.map((el) => el.href)
    );

    const validUrls = processUrls(itemUrls, seenDetailLinks);
    log.info(`Listing handler: Found ${validUrls.length} new detail links`);

    if (validUrls.length > 0) {
        validUrls.forEach(url => seenDetailLinks.add(url));
        const requests = validUrls.map(url => ({
            url,
            userData: { fromListing: true },
            label: "detail",
            uniqueKey: url,
        }));
        log.info(`Listing handler: Enqueuing ${requests.length} detail pages`);
        await crawler.addRequests(requests);
    }

    const paginationLinks = await page.$$eval('a[href*="pg="]', (elements) =>
        elements.map((el) => el.href)
    );

    const newPaginationLinks = paginationLinks.filter(
        (url) => !seenPaginationLinks.has(url)
    );

    if (newPaginationLinks.length > 0) {
        consecutiveNoNewPagination = 0;
        newPaginationLinks.forEach(url => seenPaginationLinks.add(url));
        log.info(`Listing handler: Enqueuing ${newPaginationLinks.length} pagination pages`);
        await crawler.addRequests(
            newPaginationLinks.map((url) => ({
                url,
                userData: { fromListing: true },
                label: "listing",
            }))
        );
    } else {
        consecutiveNoNewPagination++;
        log.info(`Listing handler: No new pagination (${consecutiveNoNewPagination}/${MAX_NO_NEW_PAGINATION})`);
        if (consecutiveNoNewPagination >= MAX_NO_NEW_PAGINATION) {
            log.info(`Listing handler: Stopping pagination after ${MAX_NO_NEW_PAGINATION} empty pages.`);
        }
    }
});

router.addHandler("website_scraper", async ({ page, request, log, pushData }) => {
    log.info(`Website scraper: Loading website ${request.url}`);
    
    try {
        await page.goto(request.url, { waitUntil: 'networkidle2', timeout: 30000 });
        const html = (await page.content()).toLowerCase();
        
        const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
        const emails = [...new Set(html.match(emailRegex) || [])];
        
        if (emails.length > 0) {
            const { title, phone, address, website } = request.userData;
            await pushData({
                url: request.userData.url,
                title,
                phone,
                address,
                website: request.url,
                email: emails.join(', '),
            });
            log.info(`Website scraper: Found emails: ${emails.join(', ')}`);
        } else {
            log.info('Website scraper: No emails found on website');
        }
    } catch (error) {
        log.error(`Website scraper: Failed to process ${request.url}: ${error.message}`);
    }
});