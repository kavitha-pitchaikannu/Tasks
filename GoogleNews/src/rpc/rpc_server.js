const amqp = require('amqplib');
const querystring = require('querystring');
const axios = require('axios');
const parseString = require('xml2js').parseString;

const qName = "terms_queue";

const processTask = async () => {

  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertQueue(qName, { durable: false });

  // Maintain queue by one after another defines number of consumers
  channel.prefetch(1);

  console.log("Processing rpc request...");

  channel.consume(qName, async(msg) => {
    const term = msg.content.toString();
    console.log("Requested search  of : ", term);

  // A URL is taken
  let baseUrl = "https://news.google.com/rss/search?";

  let queryObj = {
    q: term,
    hl: 'en-IN',
    gl: 'IN',
    ceid: 'IN:en'
  }
  let parsedQuery = querystring.stringify(queryObj);
  let serachUrl = baseUrl.concat(parsedQuery);

  const response = await axios.get(serachUrl);
  const resData = response.data;
  let searchResults = [];

  parseString(resData, (err, feed) => {

    const result = feed.rss.channel[0];

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

    console.log(items.length)
    var json = JSON.stringify(items);
    channel.sendToQueue(msg.properties.replyTo, Buffer.from(json), {
      correlationId: msg.properties.correlationId
    })

    setTimeout(() => {
      channel.ack(msg);
    }, 1000);

  })
})

}

processTask();


