const amqp = require('amqplib');
const { v4 } = require("uuid");
const { terms } = require('../terms');
var fs = require('fs');

const searchItems = async () => {

    // eastablish connection
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    terms.map(async (item, index) => {
        console.log("Requesting search result for : ", item);

        let uid = v4();
        // durable prevents data loss since queues are stored as log file
        // exclusive deletes queue when there is no consumer
        const q1 = await channel.assertQueue('', { durable: true, exclusive: true });

        channel.sendToQueue("terms_queue", Buffer.from(item), {
            replyTo: q1.queue,
            correlationId: uid
        })

        console.log("request sent: ", item);

        channel.consume(q1.queue, msg => {
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
        }, { noAck: true })


    });

}

searchItems();