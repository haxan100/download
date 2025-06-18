const puppeteer = require('puppeteer');

async function getTikTokTrends() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://tokboard.com/tiktok-top-sounds', { waitUntil: 'networkidle2' });

  const songs = await page.evaluate(() => {
    return [...document.querySelectorAll('.track-card__title')]
      .slice(0, 5)
      .map(el => el.innerText.trim());
  });

  await browser.close();
  return songs;
}

module.exports = { getTikTokTrends };
