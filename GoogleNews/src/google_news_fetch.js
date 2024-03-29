const axios = require('axios');
const https = require('https');

const querystring = require('querystring');
const RssParser = require('rss-parser');
const { terms } = require('./terms');
const parseString = require('xml2js').parseString;


async function  searchItems(item) {
  const fileName = item.split(' ')[0];

  // A URL is taken
  let baseUrl = "https://news.google.com/rss/search?";

  let queryObj = {
    q: item,
    hl: 'en-IN',
    gl: 'IN',
    ceid: 'IN:en'
  }
  let parsedQuery = querystring.stringify(queryObj);
  let serachUrl = baseUrl.concat(parsedQuery);

  const response = await axios.get(serachUrl);
  console.log(response.data)

  const resData = response.data;
  
  parseString(resData, (err, feed) => {
      let searchResults = [];

      const result = feed.rss.channel[0];

      console.log(result)
     let searchKey = result.title;
      let items = []
      result.item.forEach(item => {
        let aItem = {
          title: item.title,
          link: item.link,
          publishedDate: item.pubDate,
        }
        items.push(aItem)
      })
      const jsonContent = JSON.stringify(items);
      searchResults.push({
        key: searchKey,
        item: items
      })

      var json = JSON.stringify(searchResults);
      var fs = require('fs');
      fs.writeFile(`./jsonFiles/${fileName}.json`, json, 'utf8', (callback => {
        console.log("complete")
      }));

    })
  }

terms.map((item) => {
    searchItems(item);
});





