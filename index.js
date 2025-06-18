const { getTikTokTrends } = require('./scrapers/tiktok');
const { getSpotifyTop10 } = require('./scrapers/spotify');
const { downloadAsMp3 } = require('./downloader');

async function run() {
  console.log('🚀 Scraping top songs...');

  const tiktokSongs = await getTikTokTrends();
  const spotifySongs = await getSpotifyTop10();

  const allSongs = [...tiktokSongs, ...spotifySongs].slice(0, 10); // Ambil 10 lagu campur

  for (const song of allSongs) {
    console.log(`🎵 Downloading: ${song}`);
    await downloadAsMp3(song);
  }

  console.log('✅ Selesai!');
}

run();
