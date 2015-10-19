;function trace(txt) {
	console.log(txt);
};

var Utils = (function (){
	
	var privateGetQueryStrings = function () {
		  var assoc  = {};
		  var decode = function (s) { return decodeURIComponent(s.replace(/\+/g, " ")); };
		  var queryString = location.search.substring(1);
		  var keyValues = queryString.split('&');

		  for(var i in keyValues) {
		    var key = keyValues[i].split('=');
		    if (key.length > 1) {
		      assoc[decode(key[0])] = decode(key[1]);
		    }
		  }

		  return assoc;
	};
	
	/**
	 * return the relative path from the web app URL. example
	 *  http://www.example.com/path/test.html -> http://www.example.com/path/
	 **/
	var privateGetServerPath = function() {
	    var location = window.location;
	    serverCodeAddr = "";
	    pathArray = location.href.split( '/' ); 
	    for (var i = 0; i < pathArray.length -1; i++ ) {
	        serverCodeAddr += pathArray[i];
	        serverCodeAddr += "/";     
	    }
	    return serverCodeAddr;
	};

	var privateSetCookie = function(c_name, value) {
		document.cookie = c_name + "=" + escape(value);	
	};
	
	var privateGetCookie = function(c_name) {
		if (document.cookie.length > 0) {
			c_start = document.cookie.indexOf(c_name + "=");
			if (c_start != -1) {
				c_start = c_start + c_name.length + 1;
				c_end = document.cookie.indexOf(";", c_start);
				if (c_end == -1)
					c_end = document.cookie.length;
				return unescape(document.cookie.substring(c_start, c_end));
			}
		}
		return "";
		
	};
	
	return {
		getQueryStrings :  privateGetQueryStrings,
		getServerPath: privateGetServerPath,
		setCookie: privateSetCookie,
		getCookie: privateGetCookie
	};
	
}());