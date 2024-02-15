const amqp = require('amqplib');
const querystring = require('querystring');
const axios = require('axios');
const { xml2json } = require('xml-js');
const http = require('node:http');
const hostname = '127.0.0.1';
const port = 3002;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end(`port ${port}`);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

const qName = "terms_queue2";

const processTask = async () => {

  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertQueue(qName, { durable: false });

  // Maintain queue by one after another defines number of consumers
  channel.prefetch(1);

  console.log("Processing rpc request...");

  channel.consume(qName, async (msg) => {
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

    try {
      const response = await axios.get(serachUrl);
      const resData = response.data;
      let searchResults = [];

      let json = xml2json(resData, { spaces: 2, compact: true });

        let searchKey = json.title;
        let result = JSON.parse(json);
          let modifiedItems = []
          
          let totalItems = result.rss.channel.item || [];
          totalItems.forEach(item => {
            let aItem = {
              title: item.title,
              link: item.link,
              publishedDate: item.pubDate,
              source: item.source._text,
              domain: item.source._attributes.url
            }
            modifiedItems.push(aItem)
          })

          searchResults.push({
            key: searchKey,
            items: modifiedItems
          })
    
          var stringifiedJson = JSON.stringify(searchResults);
          channel.sendToQueue(msg.properties.replyTo, Buffer.from(stringifiedJson), {
            correlationId: msg.properties.correlationId
          })
    
          setTimeout(() => {
            console.log("Fetched search results and converted to JSON!!!")
            channel.ack(msg);
          }, 1000);
      
   }
    catch (err) {
      console.log("Error while parsing data!!!!")
    }

  })

}

processTask();