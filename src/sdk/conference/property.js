/* exported L,Woogeen,Erizo*/
var Woogeen = (function() { /*jshint ignore:line*/ //Woogeen is defined.
  'use strict';

  var Woogeen = {};

  Object.defineProperties(Woogeen, {
    version: {
      get: function() { return '<%= pkg.version %>'; }
    },
    name: {
      get: function() { return '<%= pkg.title %>'; }
    }
  });

  return Woogeen;
})();

var L = {};   /*jshint ignore:line*/ //L is defined.
var Erizo = {};
