const axios = require('axios');
const querystring = require('querystring');
const RssParser = require('rss-parser');
const  {terms} = require('./terms');

console.log(terms[0]);

// A URL is taken
let baseUrl = "https://news.google.com/rss/search?";

 let queryObj = {
    q: terms[0],
  hl: 'en-IN',
  gl: 'IN',
  ceid: 'IN:en'
 }
 let parsedQuery = querystring.stringify(queryObj); 

 let serachUrl = baseUrl.concat(parsedQuery);

 console.log(serachUrl)
  
 const parser = new RssParser();

// Fetch and parse the RSS feed
parser.parseURL(serachUrl)

  .then(feed => {
    let searchResults = [];

    let searchKey = feed.title;
    let items = []
    feed.items.forEach(item => {
        let aItem = {
            title : item.title,
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
    fs.writeFile('./test_data.json', json, 'utf8', (callback => {
    console.log("complete")
    }));
  });

 


  