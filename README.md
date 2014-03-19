# links-extractor

Work In Progress :o)
If anyone want  help me to promote/update this repo, it will be with pleasure!!!

## Description

This repository allows people to parse a website to find out all internal links.

## Context

I develop this plugin to build an array of internal url. I uses this array to generate sitemap or static site (for SPA).
Feel free to find new ways to use it.

## Example

`````
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
`````
