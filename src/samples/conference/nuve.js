/**
 * Wrapper for built-in http.js to emulate the browser XMLHttpRequest object.
 *
 * This can be used with JS designed for browsers to improve reuse of code and
 * allow the use of existing libraries.
 *
 * Usage: include("XMLHttpRequest.js") and use XMLHttpRequest per W3C specs.
 *
 * @todo SSL Support
 * @author Dan DeFelippi <dan@driverdan.com>
 * @contributor David Ellis <d.f.ellis@ieee.org>
 * @license MIT
 */

var Url = require("url"),
  spawn = require("child_process").spawn,
  fs = require('fs');

var XMLHttpRequest = function() {
  /**
   * Private variables
   */
  var self = this;
  var http = require('http');
  var https = require('https');

  // Holds http.js objects
  var client;
  var request;
  var response;

  // Request settings
  var settings = {};
  var rejectUnauthorized;

  if (typeof arguments[0] === 'object' && arguments[0] !== null && typeof arguments[0].rejectUnauthorized === 'boolean') { // Read extra options
    rejectUnauthorized = arguments[0].rejectUnauthorized;
  }

  // Set some default headers
  var defaultHeaders = {
    "User-Agent": "node.js",
    "Accept": "*/*"
  };

  // Send flag
  var sendFlag = false;
  // Error flag, used when errors occur or abort is called
  var errorFlag = false;

  var headers = defaultHeaders;

  /**
   * Constants
   */
  this.UNSENT = 0;
  this.OPENED = 1;
  this.HEADERS_RECEIVED = 2;
  this.LOADING = 3;
  this.DONE = 4;

  /**
   * Public vars
   */
  // Current state
  this.readyState = this.UNSENT;

  // default ready state change handler in case one is not set or is set late
  this.onreadystatechange = null;

  // Result & response
  this.responseText = "";
  this.responseXML = "";
  this.status = null;
  this.statusText = null;

  /**
   * Open the connection. Currently supports local server requests.
   *
   * @param string method Connection method (eg GET, POST)
   * @param string url URL for the connection.
   * @param boolean async Asynchronous connection. Default is true.
   * @param string user Username for basic authentication (optional)
   * @param string password Password for basic authentication (optional)
   */
  this.open = function(method, url, async, user, password) {
    settings = {
      "method": method,
      "url": url.toString(),
      "async": (typeof async !== "boolean" ? true : async),
      "user": user || null,
      "password": password || null
    };

    this.abort();

    setState(this.OPENED);
  };

  /**
   * Sets a header for the request.
   *
   * @param string header Header name
   * @param string value Header value
   */
  this.setRequestHeader = function(header, value) {
    if (this.readyState != this.OPENED) {
      throw "INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN";
    }
    if (sendFlag) {
      throw "INVALID_STATE_ERR: send flag is true";
    }
    headers[header] = value;
  };

  /**
   * Gets a header from the server response.
   *
   * @param string header Name of header to get.
   * @return string Text of the header or null if it doesn't exist.
   */
  this.getResponseHeader = function(header) {
    if (this.readyState > this.OPENED
      && response.headers[header]
      && !errorFlag
    ) {
      return response.headers[header];
    }

    return null;
  };

  /**
   * Gets all the response headers.
   *
   * @return string
   */
  this.getAllResponseHeaders = function() {
    if (this.readyState < this.HEADERS_RECEIVED || errorFlag) {
      return "";
    }
    var result = "";

    for (var i in response.headers) {
      result += i + ": " + response.headers[i] + "\r\n";
    }
    return result.substr(0, result.length - 2);
  };

  /**
   * Sends the request to the server.
   *
   * @param string data Optional data to send as request body.
   */
  this.send = function(data) {
    if (this.readyState != this.OPENED) {
      throw "INVALID_STATE_ERR: connection must be opened before send() is called";
    }

    if (sendFlag) {
      throw "INVALID_STATE_ERR: send has already been called";
    }

    var ssl = false;
    var url = Url.parse(settings.url);

    // Determine the server
    switch (url.protocol) {
      case 'https:':
        ssl = true;
        // SSL & non-SSL both need host, no break here.
      case 'http:':
        var host = url.hostname;
        break;

      case undefined:
      case '':
        var host = "localhost";
        break;

      default:
        throw "Protocol not supported.";
    }

    // Default to port 80. If accessing localhost on another port be sure
    // to use http://localhost:port/path
    var port = url.port || (ssl ? 443 : 80);
    // Add query string if one is used
    var uri = url.pathname + (url.search ? url.search : '');

    // Set the Host header or the server may reject the request
    this.setRequestHeader("Host", host);

    // Set Basic Auth if necessary
    if (settings.user) {
      if (typeof settings.password == "undefined") {
        settings.password = "";
      }
      var authBuf = new Buffer(settings.user + ":" + settings.password);
      headers["Authorization"] = "Basic " + authBuf.toString("base64");
    }

    // Set content length header
    if (settings.method == "GET" || settings.method == "HEAD") {
      data = null;
    } else if (data) {
      this.setRequestHeader("Content-Length", Buffer.byteLength(data));

      if (!headers["Content-Type"]) {
        this.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
      }
    }

    var options = {
      host: host,
      port: port,
      path: uri,
      method: settings.method,
      headers: headers
    };

    if (ssl && rejectUnauthorized !== undefined) {
      options.rejectUnauthorized = rejectUnauthorized;
    }

    // Reset error flag
    errorFlag = false;

    // Handle async requests
    if(!settings.hasOwnProperty("async") || settings.async) {
      // Use the proper protocol
      var doRequest = ssl ? https.request : http.request;

      // Request is being sent, set send flag
      sendFlag = true;

      // As per spec, this is called here for historical reasons.
      if (typeof self.onreadystatechange === "function") {
        self.onreadystatechange();
      }

      // Create the request
      request = doRequest(options, function(resp) {
        response = resp;
        response.setEncoding("utf8");

        setState(self.HEADERS_RECEIVED);
        self.status = response.statusCode;

        response.on('data', function(chunk) {
          // Make sure there's some data
          if (chunk) {
            self.responseText += chunk;
          }
          // Don't emit state changes if the connection has been aborted.
          if (sendFlag) {
            setState(self.LOADING);
          }
        });

        response.on('end', function() {
          if (sendFlag) {
            // Discard the 'end' event if the connection has been aborted
            setState(self.DONE);
            sendFlag = false;
          }
        });

        response.on('error', function(error) {
          self.handleError(error);
        });
      }).on('error', function(error) {
        self.handleError(error);
      });

      // Node 0.4 and later won't accept empty data. Make sure it's needed.
      if (data) {
        request.write(data);
      }

      request.end();
    } else { // Synchronous
      // Create a temporary file for communication with the other Node process
      var syncFile = ".node-xmlhttprequest-sync-" + process.pid;
      fs.writeFileSync(syncFile, "", "utf8");
      // The async request the other Node process executes
      var execString = "var http = require('http'), https = require('https'), fs = require('fs');"
        + "var doRequest = http" + (ssl?"s":"") + ".request;"
        + "var options = " + JSON.stringify(options) + ";"
        + "var responseText = '';"
        + "var req = doRequest(options, function(response) {"
        + "response.setEncoding('utf8');"
        + "response.on('data', function(chunk) {"
        + "responseText += chunk;"
        + "});"
        + "response.on('end', function() {"
        + "fs.writeFileSync('" + syncFile + "', 'NODE-XMLHTTPREQUEST-STATUS:' + response.statusCode + ',' + responseText, 'utf8');"
        + "});"
        + "response.on('error', function(error) {"
        + "fs.writeFileSync('" + syncFile + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');"
        + "});"
        + "}).on('error', function(error) {"
        + "fs.writeFileSync('" + syncFile + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');"
        + "});"
        + (data ? "req.write('" + data.replace(/'/g, "\\'") + "');":"")
        + "req.end();";
      // Start the other Node Process, executing this string
      syncProc = spawn(process.argv[0], ["-e", execString]);
      while((self.responseText = fs.readFileSync(syncFile, 'utf8')) == "") {
        // Wait while the file is empty
      }
      // Kill the child process once the file has data
      syncProc.stdin.end();
      // Remove the temporary file
      fs.unlinkSync(syncFile);
      if(self.responseText.match(/^NODE-XMLHTTPREQUEST-ERROR:/)) {
        // If the file returned an error, handle it
        var errorObj = self.responseText.replace(/^NODE-XMLHTTPREQUEST-ERROR:/, "");
        self.handleError(errorObj);
      } else {
        // If the file returned okay, parse its data and move to the DONE state
        self.status = self.responseText.replace(/^NODE-XMLHTTPREQUEST-STATUS:([0-9]*),.*/, "$1");
        self.responseText = self.responseText.replace(/^NODE-XMLHTTPREQUEST-STATUS:[0-9]*,(.*)/, "$1");
        setState(self.DONE);
      }
    }
  };

  this.handleError = function(error) {
    this.status = 503;
    this.statusText = error;
    this.responseText = error.stack;
    errorFlag = true;
    setState(this.DONE);
  };

  /**
   * Aborts a request.
   */
  this.abort = function() {
    if (request) {
      request.abort();
      request = null;
    }

    headers = defaultHeaders;
    this.responseText = "";
    this.responseXML = "";

    errorFlag = true;

    if (this.readyState !== this.UNSENT
        && (this.readyState !== this.OPENED || sendFlag)
        && this.readyState !== this.DONE) {
      sendFlag = false;
      setState(this.DONE);
    }
    this.readyState = this.UNSENT;
  };

  var listeners = {};
  this.addEventListener = function(event, callback) {
    if (!(event in listeners)) {
      listeners[event] = [];
    }
    listeners[event].push(callback);
  };

  /**
   * Changes readyState and calls onreadystatechange.
   *
   * @param int state New state
   */
  var setState = function(state) {
    self.readyState = state;
    if (typeof self.onreadystatechange === "function") {
      self.onreadystatechange();
    }

    if ("readystatechange" in listeners) {
      var count = listeners["readystatechange"].length, i = 0;
      for(; i < count; i++) {
        listeners["readystatechange"][i].call(self);
      }
    }
  };
};/*
CryptoJS v3.0.2
code.google.com/p/crypto-js
(c) 2009-2012 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(h,i){var e={},f=e.lib={},l=f.Base=function(){function a(){}return{extend:function(j){a.prototype=this;var d=new a;j&&d.mixIn(j);d.$super=this;return d},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var d in a)a.hasOwnProperty(d)&&(this[d]=a[d]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.$super.extend(this)}}}(),k=f.WordArray=l.extend({init:function(a,j){a=
this.words=a||[];this.sigBytes=j!=i?j:4*a.length},toString:function(a){return(a||m).stringify(this)},concat:function(a){var j=this.words,d=a.words,c=this.sigBytes,a=a.sigBytes;this.clamp();if(c%4)for(var b=0;b<a;b++)j[c+b>>>2]|=(d[b>>>2]>>>24-8*(b%4)&255)<<24-8*((c+b)%4);else if(65535<d.length)for(b=0;b<a;b+=4)j[c+b>>>2]=d[b>>>2];else j.push.apply(j,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,b=this.sigBytes;a[b>>>2]&=4294967295<<32-8*(b%4);a.length=h.ceil(b/4)},clone:function(){var a=
l.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var b=[],d=0;d<a;d+=4)b.push(4294967296*h.random()|0);return k.create(b,a)}}),o=e.enc={},m=o.Hex={stringify:function(a){for(var b=a.words,a=a.sigBytes,d=[],c=0;c<a;c++){var e=b[c>>>2]>>>24-8*(c%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var b=a.length,d=[],c=0;c<b;c+=2)d[c>>>3]|=parseInt(a.substr(c,2),16)<<24-4*(c%8);return k.create(d,b/2)}},q=o.Latin1={stringify:function(a){for(var b=
a.words,a=a.sigBytes,d=[],c=0;c<a;c++)d.push(String.fromCharCode(b[c>>>2]>>>24-8*(c%4)&255));return d.join("")},parse:function(a){for(var b=a.length,d=[],c=0;c<b;c++)d[c>>>2]|=(a.charCodeAt(c)&255)<<24-8*(c%4);return k.create(d,b)}},r=o.Utf8={stringify:function(a){try{return decodeURIComponent(escape(q.stringify(a)))}catch(b){throw Error("Malformed UTF-8 data");}},parse:function(a){return q.parse(unescape(encodeURIComponent(a)))}},b=f.BufferedBlockAlgorithm=l.extend({reset:function(){this._data=k.create();
this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=r.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var b=this._data,d=b.words,c=b.sigBytes,e=this.blockSize,g=c/(4*e),g=a?h.ceil(g):h.max((g|0)-this._minBufferSize,0),a=g*e,c=h.min(4*a,c);if(a){for(var f=0;f<a;f+=e)this._doProcessBlock(d,f);f=d.splice(0,a);b.sigBytes-=c}return k.create(f,c)},clone:function(){var a=l.clone.call(this);a._data=this._data.clone();return a},_minBufferSize:0});f.Hasher=b.extend({init:function(){this.reset()},
reset:function(){b.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);this._doFinalize();return this._hash},clone:function(){var a=b.clone.call(this);a._hash=this._hash.clone();return a},blockSize:16,_createHelper:function(a){return function(b,d){return a.create(d).finalize(b)}},_createHmacHelper:function(a){return function(b,d){return g.HMAC.create(a,d).finalize(b)}}});var g=e.algo={};return e}(Math);
(function(h){var i=CryptoJS,e=i.lib,f=e.WordArray,e=e.Hasher,l=i.algo,k=[],o=[];(function(){function e(a){for(var b=h.sqrt(a),d=2;d<=b;d++)if(!(a%d))return!1;return!0}function f(a){return 4294967296*(a-(a|0))|0}for(var b=2,g=0;64>g;)e(b)&&(8>g&&(k[g]=f(h.pow(b,0.5))),o[g]=f(h.pow(b,1/3)),g++),b++})();var m=[],l=l.SHA256=e.extend({_doReset:function(){this._hash=f.create(k.slice(0))},_doProcessBlock:function(e,f){for(var b=this._hash.words,g=b[0],a=b[1],j=b[2],d=b[3],c=b[4],h=b[5],l=b[6],k=b[7],n=0;64>
n;n++){if(16>n)m[n]=e[f+n]|0;else{var i=m[n-15],p=m[n-2];m[n]=((i<<25|i>>>7)^(i<<14|i>>>18)^i>>>3)+m[n-7]+((p<<15|p>>>17)^(p<<13|p>>>19)^p>>>10)+m[n-16]}i=k+((c<<26|c>>>6)^(c<<21|c>>>11)^(c<<7|c>>>25))+(c&h^~c&l)+o[n]+m[n];p=((g<<30|g>>>2)^(g<<19|g>>>13)^(g<<10|g>>>22))+(g&a^g&j^a&j);k=l;l=h;h=c;c=d+i|0;d=j;j=a;a=g;g=i+p|0}b[0]=b[0]+g|0;b[1]=b[1]+a|0;b[2]=b[2]+j|0;b[3]=b[3]+d|0;b[4]=b[4]+c|0;b[5]=b[5]+h|0;b[6]=b[6]+l|0;b[7]=b[7]+k|0},_doFinalize:function(){var e=this._data,f=e.words,b=8*this._nDataBytes,
g=8*e.sigBytes;f[g>>>5]|=128<<24-g%32;f[(g+64>>>9<<4)+15]=b;e.sigBytes=4*f.length;this._process()}});i.SHA256=e._createHelper(l);i.HmacSHA256=e._createHmacHelper(l)})(Math);
(function(){var h=CryptoJS,i=h.enc.Utf8;h.algo.HMAC=h.lib.Base.extend({init:function(e,f){e=this._hasher=e.create();"string"==typeof f&&(f=i.parse(f));var h=e.blockSize,k=4*h;f.sigBytes>k&&(f=e.finalize(f));for(var o=this._oKey=f.clone(),m=this._iKey=f.clone(),q=o.words,r=m.words,b=0;b<h;b++)q[b]^=1549556828,r[b]^=909522486;o.sigBytes=m.sigBytes=k;this.reset()},reset:function(){var e=this._hasher;e.reset();e.update(this._iKey)},update:function(e){this._hasher.update(e);return this},finalize:function(e){var f=
this._hasher,e=f.finalize(e);f.reset();return f.finalize(this._oKey.clone().concat(e))}})})();
var N = N || {};

N.authors = ['aalonsog@dit.upm.es', 'prodriguez@dit.upm.es', 'jcervino@dit.upm.es'];

N.version = 0.1;/*global unescape*/
var N = N || {};
N.Base64 = (function (N) {
    "use strict";
    var END_OF_INPUT, base64Chars, reverseBase64Chars, base64Str, base64Count, i, setBase64Str, readBase64, encodeBase64, readReverseBase64, ntos, decodeBase64;

    END_OF_INPUT = -1;

    base64Chars = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
        'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
        'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
        'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
        'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
        'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
        'w', 'x', 'y', 'z', '0', '1', '2', '3',
        '4', '5', '6', '7', '8', '9', '+', '/'
    ];

    reverseBase64Chars = [];

    for (i = 0; i < base64Chars.length; i = i + 1) {
        reverseBase64Chars[base64Chars[i]] = i;
    }

    setBase64Str = function (str) {
        base64Str = str;
        base64Count = 0;
    };

    readBase64 = function () {
        var c;
        if (!base64Str) {
            return END_OF_INPUT;
        }
        if (base64Count >= base64Str.length) {
            return END_OF_INPUT;
        }
        c = base64Str.charCodeAt(base64Count) & 0xff;
        base64Count = base64Count + 1;
        return c;
    };

    encodeBase64 = function (str) {
        var result, inBuffer, done;
        setBase64Str(str);
        result = '';
        inBuffer = new Array(3);
        done = false;
        while (!done && (inBuffer[0] = readBase64()) !== END_OF_INPUT) {
            inBuffer[1] = readBase64();
            inBuffer[2] = readBase64();
            result = result + (base64Chars[inBuffer[0] >> 2]);
            if (inBuffer[1] !== END_OF_INPUT) {
                result = result + (base64Chars[((inBuffer[0] << 4) & 0x30) | (inBuffer[1] >> 4)]);
                if (inBuffer[2] !== END_OF_INPUT) {
                    result = result + (base64Chars[((inBuffer[1] << 2) & 0x3c) | (inBuffer[2] >> 6)]);
                    result = result + (base64Chars[inBuffer[2] & 0x3F]);
                } else {
                    result = result + (base64Chars[((inBuffer[1] << 2) & 0x3c)]);
                    result = result + ('=');
                    done = true;
                }
            } else {
                result = result + (base64Chars[((inBuffer[0] << 4) & 0x30)]);
                result = result + ('=');
                result = result + ('=');
                done = true;
            }
        }
        return result;
    };

    readReverseBase64 = function () {
        if (!base64Str) {
            return END_OF_INPUT;
        }
        while (true) {
            if (base64Count >= base64Str.length) {
                return END_OF_INPUT;
            }
            var nextCharacter = base64Str.charAt(base64Count);
            base64Count = base64Count + 1;
            if (reverseBase64Chars[nextCharacter]) {
                return reverseBase64Chars[nextCharacter];
            }
            if (nextCharacter === 'A') {
                return 0;
            }
        }
    };

    ntos = function (n) {
        n = n.toString(16);
        if (n.length === 1) {
            n = "0" + n;
        }
        n = "%" + n;
        return unescape(n);
    };

    decodeBase64 = function (str) {
        var result, inBuffer, done;
        setBase64Str(str);
        result = "";
        inBuffer = new Array(4);
        done = false;
        while (!done && (inBuffer[0] = readReverseBase64()) !== END_OF_INPUT && (inBuffer[1] = readReverseBase64()) !== END_OF_INPUT) {
            inBuffer[2] = readReverseBase64();
            inBuffer[3] = readReverseBase64();
            result = result + ntos((((inBuffer[0] << 2) & 0xff) | inBuffer[1] >> 4));
            if (inBuffer[2] !== END_OF_INPUT) {
                result +=  ntos((((inBuffer[1] << 4) & 0xff) | inBuffer[2] >> 2));
                if (inBuffer[3] !== END_OF_INPUT) {
                    result = result +  ntos((((inBuffer[2] << 6)  & 0xff) | inBuffer[3]));
                } else {
                    done = true;
                }
            } else {
                done = true;
            }
        }
        return result;
    };

    return {
        encodeBase64: encodeBase64,
        decodeBase64: decodeBase64
    };
}(N));/*global require, CryptoJS, XMLHttpRequest, Buffer*/
var N = N || {};

/**@namespace N
 * @classDesc
 */
/**
 * @class N.API
 * @classDesc Server-side APIs are RESTful, provided as a Node.js module. All APIs, except N.API.init(), should not be called too frequently. These API calls carry local timestamps and are grouped by serviceID. Once the server is handling an API call from a certain serviceID, all other API calls from the same serviceID, whose timestamps are behind, would be expired or treated as invalid.<br>
We recommend that API calls against serviceID should have interval of at least 100ms. Also, it is better to retry the logic if it fails with an unexpected timestamp error.
 */
N.API = (function (N) {
    'use strict';
    var createRoom, getRooms, getRoom, deleteRoom, updateRoom, createToken, createService, getServices, getService, deleteService, getUsers, getUser, deleteUser, params, send, calculateSignature, init;

    params = {
        service: undefined,
        key: undefined,
        url: undefined,
        rejectUnauthorizedCert: undefined
    };
/**
   * @function rejectUnauthorizedCert
   * @desc This function sets rejectUnauthorized option for https requests.
<br><b>Remarks:</b><br>
This function is only needed when server is configured with untrusted certificates and you want to ignore server certificate verification against trusted CAs. Read https://nodejs.org/api/tls.html for details.
   * @memberOf N.API
   * @param {boolean} bool true or false. Default value is true.
   * @return {boolean} stored value.
   * @example
N.API.rejectUnauthorizedCert(false);
   */
    function rejectUnauthorizedCert (bool) {
        if (typeof bool === 'boolean')
            N.API.params.rejectUnauthorizedCert = bool;
        return N.API.params.rejectUnauthorizedCert;
    }
/**
   * @function init
   * @desc This function completes the essential configuration.
   * @memberOf N.API
   * @param {string} service The ID of your service.
   * @param {string} key The key of your service
   * @param {string} url The address of the machine on which the nuve runs.
   * @example
N.API.init('5188b9af6e53c84ffd600413', '21989', 'http://61.129.90.140:3000/')
   */
    init = function (service, key, url) {
        N.API.params.service = service;
        N.API.params.key = key;
        N.API.params.url = url;
    };

/**
   * @function createRoom
   * @desc This function creates a room.
   <br><b>Remarks:</b><br>
<b>options:</b>
<br>
<ul>
    <li><b>mode:</b>"hybrid" for room with mixing and forward streams; "p2p" for p2p room.</li>
    <li><b>publishLimit:</b>limiting number of publishers in the room. Value should be equal to or greater than -1. -1 for unlimited.</li>
    <li><b>userLimit:</b>limiting number of users in the room. Value should be equal to or greater than -1. -1 for unlimited.</li>
    <li><b>mediaMixing:</b>media setting for mix stream in the room. Value should be a JSON object contains two entries: "video" and "audio". Audio entry is currently not used and should be null.</li>
    <ul>
        <li>audio: null</li>
        <li>video: avCoordinated, maxInput, resolution, bitrate , bkColor, layout</li>
        <ul>
            <li>avCoordinated (0 or 1) is for disabling/enabling VAD</li>
            <li>maxInput is for maximum number of slots in the mix stream</li>
            <li>resolution denotes the resolution of the video size of mix stream.Valid resolution list:</li>
                <ul>
                    <li>'sif'</li>
                    <li>'vga'</li>
                    <li>'svga'</li>
                    <li>'xga'</li>
                    <li>'hd720p'</li>
                    <li>'hd1080p'</li>
                </ul>
            <li>bitrate indicates video bitrate of the mix stream, in Kbit unit. Default value 0, meaning that MCU could use its own calculated default value.</li>
            <li>bkColor sets the background color, supporting RGB color format: {"r":red-value, "g":green-value, "b":blue-value}.</li>
            <li>layout describes video layout in mix stream</li>
                <ul>
                    <li>"base" is the base template (choose from "void", "fluid", "lecture")</li>
                    <li>"custom" is user-defined customized video layout (Read section 3.5 in Conference Server Guide for details)</li>
                    <li>MCU would try to combine the two entries for mixing video if user sets both.</li>
                </ul>
        </ul>
    </ul>
</ul>
Omitted entries are set with default values.
   * @memberOf N.API
   * @param {string} name Room name.
   * @param {function} callback(room) Callback function on success.
   * @param {function} callbackError(err) Callback function on error.
   * @param {json} options Room configuration.
   * @example
N.API.createRoom('myRoom',
, function (res) {
  console.log ('Room', res.name, 'created with id:', res._id);
}, function (err) {
  console.log ('Error:', err);
}, {
  mode: 'hybrid',
  publishLimit: -1,
  userLimit: 30,
  mediaMixing: {
    video: {
      avCoordinated: 1,
      maxInput: 15,
      resolution: 'hd720p',
      bitrate: 0,
      bkColor: {"r":1, "g":2, "b":255},
      layout: {
        base: 'fluid',
      }
    },
    audio: null
  },
});
   */
    createRoom = function (name, callback, callbackError, options, params) {

        if (!options) {
            options = {};
        }

        send(function (roomRtn) {
            var room = JSON.parse(roomRtn);
            callback(room);
        }, callbackError, 'POST', {name: name, options: options}, 'rooms', params);
    };

/**
   * @function getRooms
   * @desc This function lists the rooms in your service.
   * @memberOf N.API
   * @param {function} callback(rooms) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
N.API.getRooms(function(rooms) {
  for(var i in rooms) {
    console.log('Room', i, ':', rooms[i].name);
  }
}, errorCallback);
   */
    getRooms = function (callback, callbackError, params) {
        send(callback, callbackError, 'GET', undefined, 'rooms', params);
    };

/**
   * @function getRoom
   * @desc This function returns information on the specified room.
   * @memberOf N.API
   * @param {string} room Room ID
   * @param {function} callback(room) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
var roomID = '51c10d86909ad1f939000001';
N.API.getRoom(roomID, function(room) {
  console.log('Room name:', room.name);
}, errorCallback);
   */
    getRoom = function (room, callback, callbackError, params) {
        send(callback, callbackError, 'GET', undefined, 'rooms/' + room, params);
    };

/**
   * @function deleteRoom
   * @desc This function deletes the specified room.
   * @memberOf N.API
   * @param {string} room Room ID to be deleted
   * @param {function} callback(result) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
var room = '51c10d86909ad1f939000001';
N.API.deleteRoom(room, function(result) {
  console.log ('Result:' result);
}, errorCallback);
   */
    deleteRoom = function (room, callback, callbackError, params) {
        send(callback, callbackError, 'DELETE', undefined, 'rooms/' + room, params);
    };

/**
   * @function updateRoom
   * @desc This function updates a room.
   * @memberOf N.API
   * @param {string} roomId DESCRIPTION
   * @param {json} options Room configuration. See details about options in {@link N.API.createRoom|createRoom(name, callback, callbackError, options)}.
   * @param {function} callback(room) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
N.API.updateRoom(XXXXXXXXXX, {
  publishLimit: -1,
  userLimit: -1,
  mediaMixing: {
    video: {
      avCoordinated: 1,
      maxInput: 15,
      resolution: 'hd720p',
      bitrate: 0,
      bkColor: 'white',
      layout: {
        base: 'lecture',
      }
    },
    audio: null
  },
}, function (res) {
  console.log ('Room', res._id, 'updated');
}, function (err) {
  console.log ('Error:', err);
});
   */
    updateRoom = function (roomId, options, callback, callbackError, params) {
        send(callback, callbackError, 'PUT', (options || {}), 'rooms/' + roomId, params);
    };

/**
   * @function createToken
   * @desc This function creates a new token when a new participant to a room needs to be added.
   * @memberOf N.API
   * @param {string} room Room ID
   * @param {string} username Participant's name
   * @param {string} role Participant's role
   * @param {function} callback(token) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
var roomID = '51c10d86909ad1f939000001';
var name = 'john';
var role = 'guest';
N.API.createToken(roomID, name, role, function(token) {
  console.log ('Token created:' token);
}, errorCallback);
   */
    createToken = function (room, username, role, callback, callbackError, params) {
        send(callback, callbackError, 'POST', undefined, 'rooms/' + room + '/tokens', params, username, role);
    };

/**
   * @function createService
   * @desc This function creates a new service.
   * @memberOf N.API
   * @param {string} name Service name
   * @param {string} key Service key
   * @param {function} callback(service) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
var name = 'service1';
var key = '66510cd6989cd1f9565371';
N.API.createService(name, key, function(service) {
  console.log ('Service created:', service);
}, errorCallback);
   */
    createService = function (name, key, callback, callbackError, params) {
        send(callback, callbackError, 'POST', {name: name, key: key}, 'services/', params);
    };

/**
   * @function getServices
   * @desc This function lists the services in your server.
   * @memberOf N.API
   * @param {function} callback(services) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
N.API.getServices(function(services) {
  for(var i in services) {
    console.log('Service ', i, ':', services[i].name);
  }
}, errorCallback);
   */
    getServices = function (callback, callbackError, params) {
        send(callback, callbackError, 'GET', undefined, 'services/', params);
    };

/**
   * @function getService
   * @desc This function returns information on the specified service.
   * @memberOf N.API
   * @param {string} service service ID, service information
   * @param {function} callback(service) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
var service = '43243cda543efd5436789dd651';
N.API.getService(service, function(service) {
  console.log('Service name: ', service.name);
}, errorCallback);
   */
    getService = function (service, callback, callbackError, params) {
        send(callback, callbackError, 'GET', undefined, 'services/' + service, params);
    };

/**
   * @function deleteService
   * @desc This function deletes the specified service.
   * @memberOf N.API
   * @param {string} service service to be deleted
   * @param {function} callback(result) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
var service = '51c10d86909ad1f939000001';
N.API.deleteService(service, function(result) {
  console.log ('Result:' result);
}, errorCallback);
   */
    deleteService = function (service, callback, callbackError, params) {
        send(callback, callbackError, 'DELETE', undefined, 'services/' + service, params);
    };

/**
   * @function getUsers
   * @desc This function lists the users in a specified room.
   * @memberOf N.API
   * @param {string} room Room ID
   * @param {function} callback(users) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
var roomID = '51c10d86909ad1f939000001';
N.API.getUsers(roomID, function(users) {
  var userlist = JSON.parse(users);
  console.log ('This room has ', userslist.length, 'users');
  for (var i in userlist) {
    console.log('User ', i, ':', userlist[i].name, userlist[i].role);
  }
}, errorCallback);
   */
    getUsers = function (room, callback, callbackError, params) {
        send(callback, callbackError, 'GET', undefined, 'rooms/' + room + '/users/', params);
    };

/**
   * @function getUser
   * @desc This function gets a user's information from a specified room.
   * @memberOf N.API
   * @param {string} room Room ID
   * @param {string} user User's name
   * @param {function} callback(user) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
var roomID = '51c10d86909ad1f939000001';
var name = 'john';
N.API.getUser(roomID, name, function(user) {
  console.log('User:', name, 'Role:', user.role);
}, errorCallback);
   */
    getUser = function (room, user, callback, callbackError, params) {
        send(callback, callbackError, 'GET', undefined, 'rooms/' + room + '/users/' + user, params);
    };

/**
   * @function deleteUser
   * @desc This function deletes a user from a room.
   * @memberOf N.API
   * @param {string} room Room ID
   * @param {string} user User's name
   * @param {function} callback(result) Callback function on success
   * @param {function} callbackError(err) Callback function on error
   * @example
var roomID = '51c10d86909ad1f939000001';
var name = 'john';
N.API.deleteUser(roomID, name, function(res) {
  console.log('User', name, 'in room', roomID, 'deleted');
}, errorCallback);
   */
    deleteUser = function (room, user, callback, callbackError, params) {
        send(callback, callbackError, 'DELETE', undefined, 'rooms/' + room + '/users/' + user, params);
    };

    send = function (callback, callbackError, method, body, url, params, username, role) {
        var service, key, timestamp, cnounce, toSign, header, signed, req;

        if (params === undefined) {
            service = N.API.params.service;
            key = N.API.params.key;
            url = N.API.params.url + url;
        } else {
            service = params.service;
            key = params.key;
            url = params.url + url;
        }

        if (service === '' || key === '') {
            if (typeof callbackError === 'function')
                callbackError(401, 'ServiceID and Key are required!!');
            return;
        }

        timestamp = new Date().getTime();
        cnounce = require('crypto').randomBytes(8).toString('hex');

        toSign = timestamp + ',' + cnounce;

        header = 'MAuth realm=http://marte3.dit.upm.es,mauth_signature_method=HMAC_SHA256';

        if (username && role) {

            username = formatString(username);

            header += ',mauth_username=';
            header +=  username;
            header += ',mauth_role=';
            header +=  role;

            toSign += ',' + username + ',' + role;
        }

        signed = calculateSignature(toSign, key);

        header += ',mauth_serviceid=';
        header +=  service;
        header += ',mauth_cnonce=';
        header += cnounce;
        header += ',mauth_timestamp=';
        header +=  timestamp;
        header += ',mauth_signature=';
        header +=  signed;

        req = new XMLHttpRequest({rejectUnauthorized: N.API.params.rejectUnauthorizedCert});

        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                switch (req.status) {
                case 100:
                case 200:
                case 201:
                case 202:
                case 203:
                case 204:
                case 205:
                    if (typeof callback === 'function') callback(req.responseText);
                    break;
                default:
                    if (typeof callbackError === 'function') callbackError(req.status, req.responseText);
                }
            }
        };

        req.open(method, url, true);

        req.setRequestHeader('Authorization', header);

        if (body !== undefined) {
            req.setRequestHeader('Content-Type', 'application/json');
            req.send(JSON.stringify(body));
        } else {
            req.send();
        }
    };

    calculateSignature = function (toSign, key) {
        var hash, hex, signed;
        hash = CryptoJS.HmacSHA256(toSign, key);
        hex = hash.toString(CryptoJS.enc.Hex);
        signed = N.Base64.encodeBase64(hex);
        return signed;
    };

    function formatString (s) {
        return (new Buffer(s, 'utf8')).toString('base64');
    }

    return {
        params: params,
        rejectUnauthorizedCert: rejectUnauthorizedCert,
        init: init,
        createRoom: createRoom,
        getRooms: getRooms,
        getRoom: getRoom,
        deleteRoom: deleteRoom,
        updateRoom: updateRoom,
        createToken: createToken,
        createService: createService,
        getServices: getServices,
        getService: getService,
        deleteService: deleteService,
        getUsers: getUsers,
        getUser: getUser,
        deleteUser: deleteUser
    };
}(N));
module.exports = N;
