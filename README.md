# ip2asn
nodejs module for getting asn for a given ip

utilizes theMaxMind GeoLite Legacy Downloadable Databases csv format

This product includes GeoLite data created by MaxMind, available from 
[http://www.maxmind.com](http://www.maxmind.com)

## example
```javascript
var ip2asn = require('./index.js')();

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
```
optionally you can load the data from another csv file instead of the default one by `var ip2asn = require('./index.js')('path-to-my-file.csv');`

another option is to give a different url for updating the default file in the options. this url must point to a zip file containing a GeoIPASNum2.csv file
```javascript
var opts = {};
opts.update = true;
opts.url = 'http://wherever.you.want.zip'
```