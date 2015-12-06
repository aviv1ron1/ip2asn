var ip2asn = require('./index.js')(); //('geoipasnum2.csv');
var moment = require('moment');

var now = moment();

var opts = {};

ip2asn.lastUpdated(function(err, t) {
    if (err) {
        console.error(err);
    } else {
        if (t > 29) {
            //updated more than 29 days ago, lets update from the net
            opts.update = true;
        }
        ip2asn.load(opts);
    }
});

var arr = ['50.21.180.100',
    '50.22.180.100',
    '1.38.1.1',
    2733834241
]

ip2asn.on('ready', function() {
    arr.forEach(function(ip) {
        console.log(ip2asn.lookup(ip));
    })
});
