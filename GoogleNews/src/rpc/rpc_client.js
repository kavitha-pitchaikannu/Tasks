const amqp = require('amqplib');
const {v4}  = require("uuid");
const { terms } = require('../terms');

const searchItems = async() => {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    terms.map(async(item, index) => {
        console.log("Requesting search result for : ", item);

        let uid = v4();
        const q1 = await channel.assertQueue('', {exclusive: true});

        channel.sendToQueue("rpc_queue", Buffer.from(item), {
            replyTo: q1.queue,
            correlationId: uid
        })
        console.log("request sent: ", item);
    
        channel.consume(q1.queue, msg => {
            if(msg.properties.correlationId == uid) {
                console.log("Done with json ", msg.content.toString());
                setTimeout(()=> {
                    connection.close();
                    process.exit();
                }, 500)
            }
        }, {noAck: true})
        
    });
   
}

searchItems();