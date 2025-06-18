const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Simulasi ambil teks dari file segmen
const segmenPath = 'input/judul1/segmen/001.txt';
const outputFolder = 'input/judul1/images/';

if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

const text = fs.readFileSync(segmenPath, 'utf-8');
const searchTerm = text.trim().split(' ')[0]; // Ambil kata pertama untuk search (misalnya, 'Spongebob')

// Scraping Pinterest
async function searchAndDownloadImage(query) {
  const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}&rs=typed`;
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const imageUrl = $('img[src^="https://"]')[0]?.attribs.src;

  if (!imageUrl) {
    console.error('❌ Gagal menemukan gambar.');
    return;
  }

  // Simpan gambar ke folder images/
  const imagePath = path.join(outputFolder, `${query}.jpg`);
  const writer = fs.createWriteStream(imagePath);
  const response = await axios.get(imageUrl, { responseType: 'stream' });

  response.data.pipe(writer);
  writer.on('finish', () => {
    console.log(`✅ Gambar disimpan di: ${imagePath}`);
  });
  writer.on('error', (err) => {
    console.error('❌ Error saat menyimpan gambar:', err.message);
  });
}

searchAndDownloadImage(searchTerm);
