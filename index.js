var Csvly = require("csvly");
var util = require("util");
var EventEmitter = require("events").EventEmitter;
var ip = require('ip');
var bs = require("binary-search");
var request = require('request');
var unzip = require('unzip');
var stream = require('stream')
var Transform = stream.Transform;
var fs = require('fs');
var moment = require('moment');
var path = require('path');

module.exports = function(dbPath) {

    function ptawtd(out) {
        Transform.call(this);
        this.out = out;
    }

    util.inherits(ptawtd, Transform);

    ptawtd.prototype._transform = function(chunk, end, cb) {
        this.out.write(chunk);
        this.push(chunk);
        cb();
    };

    ptawtd.prototype._flush = function(cb) {
        this.out.end();
        cb();
    };

    var when = function(who, when, what) {
        if (who[when]) {
            what();
        } else {
            who.on(when, what);
        }
    }

    var compare = function(a, b) {
        return a.start - b.start;
    }

    var DBPATH = "GeoIPASNum2";

    function getPath(ext) {
        return path.join(__dirname, DBPATH + ext);
    }

    function Lookup(dbPath) {
        EventEmitter.call(this);
        if (dbPath) {
            this.dbPath = dbPath;
        } else {
            this.dbPath = getPath(".csv");
        }
    }

    util.inherits(Lookup, EventEmitter);

    Lookup.prototype.lastUpdated = function(callback) {
        fs.stat(getPath(".csv"), function(err, stats) {
            if (err) {
                callback(err);
            } else {
                callback(null, moment().diff(stats.mtime, 'days'));
            }
        })
    };

    Lookup.prototype.load = function(opts) {
        var self = this;
        self.canload = false;
        if (opts && opts.update) {
            self.url = 'http://download.maxmind.com/download/geoip/database/asnum/GeoIPASNum2.zip';
            if (opts.url) {
                self.url = opts.url;
            }
            request(self.url)
                .pipe(unzip.Parse()).on('entry', function(entry) {
                    if (entry.path === DBPATH + ".csv") {
                        var transform = new ptawtd(fs.createWriteStream(getPath(".tmp")));
                        entry.pipe(transform);
                        self.dbPath = transform;
                        self.canload = true;
                        self.emit('canload');
                    }
                });
        } else {
            self.canload = true;
        }
        when(self, 'canload', function() {
            reader = new Csvly(self.dbPath, {
                headers: ["start", "end", "name"]
            });
            self.db = [];
            var ready = false;
            reader.on('line', function(line) {
                var obj = {
                    start: line.start,
                    end: line.end,
                    name: line.name
                };
                self.db.push(obj);
            });
            reader.on('end', function() {
                self.validateSorted();
                if (opts && opts.update) {
                    fs.rename(getPath(".tmp"), getPath(".csv"));
                }
                self.ready = true;
                self.emit("ready");

            });
            reader.read();
        })
    };

    Lookup.prototype.validateSorted = function() {
        if (this.db.length < 2) return;
        var sorted = true;
        for (var i = 1; sorted && i < this.db.length; i++) {
            if (this.db[i].start <= this.db[i - 1].end) {
                sorted = false;
            }
        }
        if (!sorted) {
            this.db.sort(compare);
        }
    };

    Lookup.prototype.lookup = function(address) {
        var ipl;
        if (typeof address === "string") {
            if (address.indexOf(".") > -1) {
                ipl = ip.toLong(address);
            } else {
                ipl = Number(address);
            }
        } else {
            ipl = address;
        }
        if (util.isNullOrUndefined(ipl) || isNaN(ipl)) {
            throw new Error("ip is invalid " + address);
        }
        var searchRes = bs(this.db, ipl, function(a, b) {
            if (a.start <= b && a.end >= b) return 0;
            return a.start - b;
        });
        if (searchRes > -1) {
            var asn = this.db[searchRes];
            var m = /AS(\d+)(\s(.+))?/g.exec(asn.name);
            if (m.length == 4) {
                return {
                    asn: m[1],
                    name: m[3]
                }
            }
            if (m.length == 2) {
                return {
                    asn: m[1]
                }
            }
            return {
                name: asn.name
            }
        }
        return null;
    };

    return new Lookup(dbPath);
}
