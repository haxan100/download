const axios = require('axios');
const cheerio = require('cheerio');

async function getSpotifyTop10() {
  const url = 'https://spotifycharts.com/regional/id/daily/latest';
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const songs = [];

  $('table tbody tr').slice(0, 5).each((i, el) => {
    const title = $(el).find('.chart-table-track strong').text();
    const artist = $(el).find('.chart-table-track span').text().replace('by ', '');
    songs.push(`${title} ${artist}`);
  });

  return songs;
}

module.exports = { getSpotifyTop10 };
