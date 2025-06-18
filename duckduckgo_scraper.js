const axios = require('axios');
const fs = require('fs-extra');
const cheerio = require('cheerio');
const path = require('path');
const HttpsProxyAgent = require('https-proxy-agent');

// Set proxy jika dibutuhkan (contoh proxy gratis, ganti sesuai kebutuhan)
const PROXY = process.env.HTTPS_PROXY || null; // contoh: 'http://123.123.123.123:8080'

async function downloadImage(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function scrapeDuckDuckGo(keyword, limit = 5) {
  const folder = `downloads/${keyword.replace(/\s+/g, '_')}`;
  fs.ensureDirSync(folder);
  const query = encodeURIComponent(keyword);
  const url = `https://duckduckgo.com/?q=${query}&iax=images&ia=images`;

  console.log(`🔍 Mencari gambar DuckDuckGo: ${keyword}`);

  try {
    // Step 1: ambil token (vqd)
    const axiosConfig = PROXY ? { httpsAgent: new HttpsProxyAgent(PROXY) } : {};
    const tokenRes = await axios.get(url, axiosConfig);
    const tokenMatch = tokenRes.data.match(/vqd='([\d-]+)'/);
    if (!tokenMatch) {
      console.error('❌ Tidak bisa ambil token vqd');
      return;
    }

    const vqd = tokenMatch[1];

    // Step 2: fetch hasil image JSON
    const imageURL = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${query}&vqd=${vqd}&f=,,,&p=1`;
    const result = await axios.get(imageURL, {
      headers: {
        'Referer': 'https://duckduckgo.com/',
        'User-Agent': 'Mozilla/5.0'
      },
      ...(PROXY ? { httpsAgent: new HttpsProxyAgent(PROXY) } : {})
    });

    const images = result.data.results.slice(0, limit);
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const ext = path.extname(new URL(img.image).pathname) || '.jpg';
      const outputPath = path.join(folder, `img_${i + 1}${ext}`);
      await downloadImage(img.image, outputPath);
      console.log(`✅ img_${i + 1} tersimpan.`);
    }

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

// Jalankan: node duckduckgo_scraper.js "Monkey D Luffy" 5
const [,, keyword, jumlah] = process.argv;
if (!keyword) {
  console.log('❗ Format: node duckduckgo_scraper.js "keyword" [jumlah]');
  process.exit(1);
}

scrapeDuckDuckGo(keyword, parseInt(jumlah) || 5);
