const amqp = require('amqplib');
const { v4 } = require("uuid");
const { terms } = require('../terms');
var fs = require('fs');
const http = require('node:http');
const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`port ${port}`);
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

const searchItems = async () => {

    var queueName = "terms_queue4";
    var connection;
    amqp.connect('amqp://localhost')
        .then(conn => {
            conn.on('error', (err) => {
                console.log("[AMQP] connection error", err.message);
            });
            conn.on('close', function() {
                console.error("[AMQP] reconnecting");
                return;
            });
            connection = conn;
            return conn.createChannel();
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
            
            terms.map(async (item, index) => {
                console.log("Requesting search result for : ", item);
        
                let uid = v4();
                // durable prevents data loss since queues are stored as log file
                // exclusive deletes queue when there is no consumer
                const q1 = await channel.assertQueue('', { durable: true, exclusive: true });
        
                channel.sendToQueue(queueName, Buffer.from(item), {
                    replyTo: q1.queue,
                    correlationId: uid
                })
        
                console.log("request sent: ", item);
        
                channel.consume(q1.queue, (msg, err) => {
                    if(err) {
                        console.log("Error while fetching data from server!!!")
                    } else {
                        if (msg.properties.correlationId == uid) {
                            console.log("Fetched data as json ", msg.content);
                            // Parsing data
                            let json = JSON.parse(msg.content)
            
                            const fileName = item.toString().split(' ')[0];
                            fs.writeFile(`../jsonFiles/${fileName}.json`, JSON.stringify(json), 'utf8', (callback => {
                                console.log("File Created!!!")
                            }));
            
                            // Close connection
                            if (index == terms.length - 1) {
                                setTimeout(() => {
                                    connection.close();
                                    process.exit();
                                }, 500)
                            }
                        }
                    }
                   
                }, { noAck: true })
        
        
            });
        })
        .catch((error) => {
            console.error(error);
            console.log(`[AMQP][${queueName}] reconnecting in 1s`);
            return this._delay(1000).then(() =>
                searchItems()
            );
        })

}

searchItems();