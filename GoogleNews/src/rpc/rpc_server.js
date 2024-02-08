const amqp = require('amqplib');
const querystring = require('querystring');
const axios = require('axios');

const parseString = require('xml2js').parseString;
const qName = "rpc_queue";


async function searchItems(item) {
  const fileName = item.toString().split(' ')[0];
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
    let totalItems = result.item || [];
    totalItems.forEach(item => {
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
    fs.writeFile(`../jsonFiles/${fileName}.json`, json, 'utf8', (callback => {
      console.log("complete")
    }));

  })
}

function searchItems1(item) {
  console.log(item)
}

const processTask = async () => {

  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();
  await channel.assertQueue(qName, { durable: false });

  channel.prefetch();
  console.log("Processing rpc request...");

  channel.consume(qName, (msg) => {
    console.log(msg.content)
    const term = msg.content.toString();
    console.log("Requested search  of : ", term);

    const result = searchItems(term);

    channel.sendToQueue(msg.properties.replyTo, Buffer.from(term.toString()), {
      correlationId: msg.properties.correlationId
    })

    channel.ack(msg);

    // manual acknowledgement - false
  }, { noAck: false })

}

processTask();


