const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const promptText = `anime boy with black spiky hair, red sleeveless vest, straw hat on back, blue shorts, standing heroically on a pirate ship, smiling confidently, dramatic lighting, ocean background, anime style, inspired by one piece, cinematic look, detailed, 4k`;

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log("🔄 Membuka Mage.space...");
  await page.goto("https://www.mage.space", { waitUntil: "networkidle2" });

  // Tunggu sampai UI muncul
  await page.waitForSelector('textarea[placeholder="Enter a prompt"]', { timeout: 15000 });

  console.log("📝 Memasukkan prompt...");
  await page.type('textarea[placeholder="Enter a prompt"]', promptText, { delay: 20 });

  // Pilih model "dreamlike-diffusion" dari dropdown
  await page.waitForSelector('button:has-text("Model")');
  await page.click('button:has-text("Model")');
  await page.waitForTimeout(500);
  await page.keyboard.type("dreamlike");
  await page.waitForTimeout(1000);
  await page.keyboard.press("Enter");

  console.log("⚙️ Model dipilih. Mulai generate...");
  await page.waitForSelector("button:has-text('Generate')", { visible: true });
  await page.click("button:has-text('Generate')");

  console.log("⏳ Menunggu hasil...");
  await page.waitForTimeout(15000); // Waktu tunggu render

  // Ambil gambar pertama
  const imgUrl = await page.evaluate(() => {
    const img = document.querySelector("img[src^='https://cdn.mage.space']");
    return img?.src;
  });

  if (!imgUrl) {
    console.log("❌ Gagal mengambil gambar.");
    await browser.close();
    return;
  }

  console.log("📥 Gambar ditemukan. Mendownload...");

  const outputDir = path.resolve(__dirname, "output");
  await fs.ensureDir(outputDir);
  const filePath = path.join(outputDir, "mage_output.jpg");

  const res = await axios.get(imgUrl, { responseType: "stream" });
  res.data.pipe(fs.createWriteStream(filePath));

  console.log("✅ Gambar disimpan di:", filePath);
  await browser.close();
})();
