//Read line by line from stdin
const readline = require('readline');
const fs = require('fs');
const kinesis = require('kinesis');

const file = process.argv[2];
if(file === undefined) {
    console.log('Must pass in a tab delimited file of itech locations');
    process.exit();
}

const factor = process.argv[3] || 1;
if(factor == 0) {
    console.log('Very funny');
    process.exit();
}

const rl = readline.createInterface({input: fs.createReadStream(file)});

var startTime = 0;

rl.on('line', (line) => {
    var loc = parseline(line);
    if(startTime === 0) {
        startTime = loc.date.getTime();
    }
    var waitMS = (loc.date.getTime() - startTime) / factor;
    setTimeout(function() {
        var rec = {
            id:  loc.id,
            lat: loc.lat,
            lng: loc.lng
        };
        var blob = new Buffer.from(JSON.stringify(rec));
        console.log(JSON.stringify(rec));
        kinesis.request('PutRecord', {
            StreamName: 'pctest',
            PartitionKey: 'itech_locations',
            Data: blob.toString('base64')
        },
                        (res) => {
                            console.log('Record pushed to kinesis.');
                        });
        }, waitMS);
});

function parseline(line) {
    var loc_rec = line.split("\t");
    return {
        id: parseInt(loc_rec[0]),
        lat: parseFloat(loc_rec[1]),
        lng: parseFloat(loc_rec[2]),
        date: new Date(loc_rec[3])
    };
}
