const amqp = require('amqplib');
const querystring = require('querystring');
const axios = require('axios');
const { xml2json } = require('xml-js');
const http = require('node:http');
const config = require('./config/config.js');

console.log(`NODE_ENV=${config.NODE_ENV}`);

console.log(`NODE_ENV=${config.HOST}`);
console.log(`NODE_ENV=${config.PORT}`);

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end(`port ${port}`);
});

server.listen(config.PORT, config.HOST, () => {
  console.log(`Server running at http://${config.HOST}:${config.PORT}/`);
});

const queueName = "terms_queue4";

const processTask = async () => {

  amqp.connect('amqp://localhost')
    .then(connection => {
      connection.on('error', (err) => {
        console.log("[AMQP] connection error", err.message);
      });
      connection.on('close', function () {
        console.error("[AMQP] reconnecting");
        return;
      });
      return connection.createChannel();
    })
    .then(channel => {
      channel.on('error', err => {
        console.error(
          `AMQP-ch[${queueName}] | ${err.message}`,
        );
      });
      channel.on('close', () => {
        console.error(`AMQP-ch[${queueName}] close`);
      });

      channel.assertQueue(queueName, { durable: false });

      // Maintain queue by one after another defines number of consumers
      channel.prefetch(1);

      console.log("Processing rpc request...");

      channel.consume(queueName, async (msg, err) => {
        if(err) {
          console.log("Error while fetching data from server!!!")
      } else {
        const term = msg.content.toString();
        console.log("Requested search  of : ", term);

        // A URL is taken
        let baseUrl = "https://news.google.com/rss/search?";

        let termArray = term.split("NOT");

        let que = []
        termArray.map((t, index) => {
          let s = ""
          if (t[0] == " ") {
            s = s.concat("-").concat(t.slice(1, t.length))
          } else {
            s = t
          }
          console.log(s)

          que.push(s)
        })

        console.log(que)
        let queryTerm = que.join("")
        let queryObj = {
          q: queryTerm,
          hl: 'en-IN',
          gl: 'IN',
          ceid: 'IN:en'
        }

        try {
          const response = await axios.get(baseUrl, { params: queryObj });
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
      }
      })

    })

    .catch((error) => {
      console.error(error);
      console.log(`[AMQP][${queueName}] reconnecting in 1s`);
      return this._delay(1000).then(() =>
        processTask()
      );
    })


}

processTask();