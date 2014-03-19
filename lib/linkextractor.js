var phantom = require('phantom');
var jsdom = require("jsdom");
var _ = require("lodash");
var Q = require("q");

/**
 * Sanitize html
 */
var sanitizeHtml = function(html){
    html = html.replace(/\\n|\\t/g,""); //remove weird pseudo new lines and tabs
    html = html.replace(/\\"/g,'"'); //replace werid escaped quotes with real quotes
    html = html.substr(1); //remove first quote character
    html = html.substr(0, html.length - 1); //remove last quote character
    return html;
};

/**
 * Export module as a node module
 * @example
 * var linkExtractor = require('PATH/TO/linkextractor');
 * var myLinkExtractor = new linkExtractor({
 *   siteRoot: 'http://my-domain.com',
 *   debug: true 
 * })
 */
module.exports = function () {
    return LinkExtractor;
};

/**
 * Initialize LinkExtractor
 * @constructor
 */
var LinkExtractor = function (options) {
    if(_.isBoolean(options.debug)) {
        this.debug_level = options.debug;
    }
    this.siteRoot = options.siteRoot || false;
    this.level = _.isNumber(options.level) ? options.level : 3;
    this.avoidUrl = _.isArray(options.avoidUrl) ? avoidUrl : [];
    return this;
};

/** @type {String} The site root url */
LinkExtractor.prototype.siteRoot = "";
/** @type {boolean} define current state of debug displayed */
LinkExtractor.prototype.debug_level = false;
/** @type {Array} Links array */
LinkExtractor.prototype.links = [];
/** @type {Array} url to avoid */
LinkExtractor.prototype.avoidUrl = [];
/** @type {Promise} links promise to know when links array was builded */
LinkExtractor.prototype.linksPromise = Q.defer();
/** @type {Phantom} phantom instance */
LinkExtractor.prototype._ph = null;

/**
 * Wrapper to enable/disable debuf
 */
LinkExtractor.prototype.debug = function () {
    if (this.debug_level) {
        console.log.apply(console, arguments);
    }
};

/**
 * Wrapper to manage phantom instance
 */
LinkExtractor.prototype.createPhantomInstance = function () {
    if (!_.isNull(this._ph)) {
        return Q.when(this._ph);
    }

    var deferred = Q.defer();
    var self = this;
    phantom.create(function(ph) {
        self._ph = ph;
        deferred.resolve(self);
    });
    return deferred.promise;
};

/**
 * Start point to extract urls
 */
LinkExtractor.prototype.getLinks = function () {
    this.linksPromise = Q.defer();
    var self = this;
    this
        .createPhantomInstance()
        .then(function (ph) {
            self.parseHtmlPage(self.siteRoot);
        });
    return this.linksPromise.promise;
};

/**
 * Open the url and retrieve HTML through phantomjs
 */
LinkExtractor.prototype.parseHtmlPage = function (url) {
    var deferred = Q.defer();
    var self = this;
    this
        .createPhantomInstance()
        .then(function (ph) {
            ph.createPage(function(page) { //does things in parallel?
              page.open(url, function(status) {
                page.evaluate(function () {
                    return  JSON.stringify(document.all[0].outerHTML);
                }, function (html) {
                    self.buildLinksFromHTML(sanitizeHtml(html), url);
                    page.close();
                });
                
            });
          });
        });
    return deferred.promise;
};

/**
 * Parse all internal links from given HTML and check if links are new to push them into links array
 */
LinkExtractor.prototype.buildLinksFromHTML = function (html, url) {
    var self = this;
    var new_links = false;
    jsdom.env(
        html,
        ["http://code.jquery.com/jquery.js"],
        function (errors, window) {
            var links = window.$("a[href^='"+self.siteRoot+"'], a[href^='/'], a[href^='./'], a[href^='../'], a[href^='#']");
        
            _.forEach(links, function (v) {
                var stringLink = window.$(v).attr('href');
                if (_.isString(stringLink) && stringLink !== "" && // Valid URL
                    _.indexOf(self.avoidUrl, stringLink) === -1 && // Check if not in avoid url
                    _.isUndefined(_.find(self.links, {url: stringLink})) // Check if already exist in links array
                ) {
                    self.links.push({
                        url: stringLink,
                        visited: false
                    });
                    new_links = true;
                }
            });

            self.debug('VISIT link: ' + url + ' - ' + new_links);
            self.parseArray();

        }
    );

};

/**
 * Parse current links array and stop parse when discover a unvisited link.
 */
LinkExtractor.prototype.parseArray = function () {
    this.debug('external_links size (' + this.links.length + ')');
    var self = this;
    var parsedLink = 0;
    _.forEach(this.links, function (link) {
        parsedLink++;
        if (!link.visited) {
            link.visited = true;

            var curUrl = self.siteRoot + link.url;
            self.debug('Start open ' + curUrl);
            self.parseHtmlPage(curUrl);

            return false;
        }
    });
        
    // If we reach this part, we discover all links
    if (parsedLink === this.links.length) {
        this.debug('Finish!');
        this.linksPromise.resolve(this.links);
        this.destroy();
    }
};

/**
 * Destroy LinkExtractor instances
 */
LinkExtractor.prototype.destroy = function () {
    this._ph.exit();
    this._ph = null;
};