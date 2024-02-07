const axios = require('axios');
const https = require('https');

const querystring = require('querystring');
const RssParser = require('rss-parser');
const { terms1 } = require('./terms');


 function searchItems(item) {
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

  console.log(serachUrl)

  const parser = new RssParser();
  parser.parseURL(serachUrl)

    .then(feed => {
      let searchResults = [];

      let searchKey = feed.title;
      let items = []
      feed.items.forEach(item => {
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
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .finally(function () {
      // always executed
    });

}

terms1.map((item) => {
    searchItems(item);
});

  /*

let requests = terms1.map((item) => {
  return new Promise((resolve) => {
    asyncFunction(item, resolve);
  });
})

Promise.all(requests).then(() => console.log('done'));
*/





