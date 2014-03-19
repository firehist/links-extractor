var _ = require('lodash');
var linkextractor = require('./lib/linkextractor')();

var _linkextractor = new linkextractor({
    siteRoot: 'http://portfolio.firehist.org',
    debug: true
});
_linkextractor
    .getLinks()
    .then(function(data) {
        _.forEach(data, function (v) {
            console.log('data url:' + v.url);
        });
    });