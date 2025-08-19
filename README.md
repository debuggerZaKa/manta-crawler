
```
     _____ _____       __          ___      ______ _____   
    / ____|  __ \     /\ \        / / |    |  ____|  __ \            
   | |    | |__) |   /  \ \  /\  / /| |    | |__  | |__) | 
   | |    |  _  /   / /\ \ \/  \/ / | |    |  __| |  _  /  
   | |____| | \ \  / ____ \  /\  /  | |____| |____| | \ \     
    \_____|_|  \_\/_/    \_\/  \/   |______|______|_|  \_\ 
                                                         
                                                         
```

# Manta Email Crawler

This project is a Puppeteer-based crawler using [Crawlee](https://crawlee.dev/) and [puppeteer-extra](https://github.com/berstend/puppeteer-extra) 
with stealth plugin to scrape business listings and extract emails from **Manta.com** and company websites.

---

## 🚀 Features

- Crawls **Manta.com** business listings (e.g., Restaurants in Indianapolis).
- Extracts **company details**:  
  - Title  
  - Phone  
  - Address  
  - Website  
  - Email  
- If no email is found on Manta, it visits the **company website** to look for emails.
- Supports **pagination crawling** with duplicate link filtering.
- **Stealth mode** enabled for anti-bot evasion.
- Exports results into `manta_results.csv`.

---

## 📂 Project Structure

```
├── main.js        # Entry point for crawler
├── routes.js      # Handlers for listing, detail, and website pages
├── manta_results.csv  # Exported results (generated after run)
└── README.md
```

---

## ⚡ Installation

1. Clone this repository:

```bash
git clone https://github.com/debuggerZaKa/manta-crawler.git
cd manta-crawler
```

2. Install dependencies:

```bash
npm install
```

3. Make sure you have a **Chromium/Chrome executable** installed and update the path inside `main.js`:

```js
executablePath: 'C:\path\to\chrome.exe',
```

---

## ▶️ Usage

Start the crawler with:

```bash
npm run start
```

During crawling, type `stop` in the terminal to **export data and stop the crawler**.

---

## 📊 Output

- Data will be exported into a CSV file:  
  **`manta_results.csv`**

Example row:

```
url,title,phone,address,website,email
https://www.manta.com/c/mx12345,Best Restaurant,(317) 555-1234,"123 Main St, Indianapolis, IN",www.bestrestaurant.com,info@bestrestaurant.com
```

---

## 🛠️ Tech Stack

- **Node.js**
- **Crawlee**
- **Puppeteer Extra + Stealth Plugin**

---

## 🕷️ Notes

- Some websites may block scrapers. Adjust `maxConcurrency` or add delays if necessary.
- Make sure your network allows requests to external websites.
- Always use responsibly and follow website Terms of Service.

