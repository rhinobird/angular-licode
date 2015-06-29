(function(exports, global) {
  var io = exports;
  io.version = "0.9.6";
  io.protocol = 1;
  io.transports = [];
  io.j = [];
  io.sockets = {};
  io.connect = function(host, details) {
    var uri = io.util.parseUri(host), uuri, socket;
    if(global && global.location) {
      uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
      uri.host = uri.host || (global.document ? global.document.domain : global.location.hostname);
      uri.port = uri.port || global.location.port
    }
    uuri = io.util.uniqueUri(uri);
    var options = {host:uri.host, secure:"https" == uri.protocol, port:uri.port || ("https" == uri.protocol ? 443 : 80), query:uri.query || ""};
    io.util.merge(options, details);
    if(options["force new connection"] || !io.sockets[uuri]) {
      socket = new io.Socket(options)
    }
    if(!options["force new connection"] && socket) {
      io.sockets[uuri] = socket
    }
    socket = socket || io.sockets[uuri];
    return socket.of(uri.path.length > 1 ? uri.path : "")
  }
})("object" === typeof module ? module.exports : this.io = {}, this);
(function(exports, global) {
  var util = exports.util = {};
  var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
  var parts = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
  util.parseUri = function(str) {
    var m = re.exec(str || ""), uri = {}, i = 14;
    while(i--) {
      uri[parts[i]] = m[i] || ""
    }
    return uri
  };
  util.uniqueUri = function(uri) {
    var protocol = uri.protocol, host = uri.host, port = uri.port;
    if("document" in global) {
      host = host || document.domain;
      port = port || (protocol == "https" && document.location.protocol !== "https:" ? 443 : document.location.port)
    }else {
      host = host || "localhost";
      if(!port && protocol == "https") {
        port = 443
      }
    }
    return(protocol || "http") + "://" + host + ":" + (port || 80)
  };
  util.query = function(base, addition) {
    var query = util.chunkQuery(base || ""), components = [];
    util.merge(query, util.chunkQuery(addition || ""));
    for(var part in query) {
      if(query.hasOwnProperty(part)) {
        components.push(part + "=" + query[part])
      }
    }
    return components.length ? "?" + components.join("&") : ""
  };
  util.chunkQuery = function(qs) {
    var query = {}, params = qs.split("&"), i = 0, l = params.length, kv;
    for(;i < l;++i) {
      kv = params[i].split("=");
      if(kv[0]) {
        query[kv[0]] = kv[1]
      }
    }
    return query
  };
  var pageLoaded = false;
  util.load = function(fn) {
    if("document" in global && document.readyState === "complete" || pageLoaded) {
      return fn()
    }
    util.on(global, "load", fn, false)
  };
  util.on = function(element, event, fn, capture) {
    if(element.attachEvent) {
      element.attachEvent("on" + event, fn)
    }else {
      if(element.addEventListener) {
        element.addEventListener(event, fn, capture)
      }
    }
  };
  util.request = function(xdomain) {
    if(xdomain && "undefined" != typeof XDomainRequest) {
      return new XDomainRequest
    }
    if("undefined" != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS)) {
      return new XMLHttpRequest
    }
    if(!xdomain) {
      try {
        return new (window[["Active"].concat("Object").join("X")])("Microsoft.XMLHTTP")
      }catch(e) {
      }
    }
    return null
  };
  if("undefined" != typeof window) {
    util.load(function() {
      pageLoaded = true
    })
  }
  util.defer = function(fn) {
    if(!util.ua.webkit || "undefined" != typeof importScripts) {
      return fn()
    }
    util.load(function() {
      setTimeout(fn, 100)
    })
  };
  util.merge = function merge(target, additional, deep, lastseen) {
    var seen = lastseen || [], depth = typeof deep == "undefined" ? 2 : deep, prop;
    for(prop in additional) {
      if(additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0) {
        if(typeof target[prop] !== "object" || !depth) {
          target[prop] = additional[prop];
          seen.push(additional[prop])
        }else {
          util.merge(target[prop], additional[prop], depth - 1, seen)
        }
      }
    }
    return target
  };
  util.mixin = function(ctor, ctor2) {
    util.merge(ctor.prototype, ctor2.prototype)
  };
  util.inherit = function(ctor, ctor2) {
    function f() {
    }
    f.prototype = ctor2.prototype;
    ctor.prototype = new f
  };
  util.isArray = Array.isArray || function(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]"
  };
  util.intersect = function(arr, arr2) {
    var ret = [], longest = arr.length > arr2.length ? arr : arr2, shortest = arr.length > arr2.length ? arr2 : arr;
    for(var i = 0, l = shortest.length;i < l;i++) {
      if(~util.indexOf(longest, shortest[i])) {
        ret.push(shortest[i])
      }
    }
    return ret
  };
  util.indexOf = function(arr, o, i) {
    for(var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0;i < j && arr[i] !== o;i++) {
    }
    return j <= i ? -1 : i
  };
  util.toArray = function(enu) {
    var arr = [];
    for(var i = 0, l = enu.length;i < l;i++) {
      arr.push(enu[i])
    }
    return arr
  };
  util.ua = {};
  util.ua.hasCORS = "undefined" != typeof XMLHttpRequest && function() {
    try {
      var a = new XMLHttpRequest
    }catch(e) {
      return false
    }
    return a.withCredentials != undefined
  }();
  util.ua.webkit = "undefined" != typeof navigator && /webkit/i.test(navigator.userAgent)
})("undefined" != typeof io ? io : module.exports, this);
(function(exports, io) {
  exports.EventEmitter = EventEmitter;
  function EventEmitter() {
  }
  EventEmitter.prototype.on = function(name, fn) {
    if(!this.$events) {
      this.$events = {}
    }
    if(!this.$events[name]) {
      this.$events[name] = fn
    }else {
      if(io.util.isArray(this.$events[name])) {
        this.$events[name].push(fn)
      }else {
        this.$events[name] = [this.$events[name], fn]
      }
    }
    return this
  };
  EventEmitter.prototype.addListener = EventEmitter.prototype.on;
  EventEmitter.prototype.once = function(name, fn) {
    var self = this;
    function on() {
      self.removeListener(name, on);
      fn.apply(this, arguments)
    }
    on.listener = fn;
    this.on(name, on);
    return this
  };
  EventEmitter.prototype.removeListener = function(name, fn) {
    if(this.$events && this.$events[name]) {
      var list = this.$events[name];
      if(io.util.isArray(list)) {
        var pos = -1;
        for(var i = 0, l = list.length;i < l;i++) {
          if(list[i] === fn || list[i].listener && list[i].listener === fn) {
            pos = i;
            break
          }
        }
        if(pos < 0) {
          return this
        }
        list.splice(pos, 1);
        if(!list.length) {
          delete this.$events[name]
        }
      }else {
        if(list === fn || list.listener && list.listener === fn) {
          delete this.$events[name]
        }
      }
    }
    return this
  };
  EventEmitter.prototype.removeAllListeners = function(name) {
    if(this.$events && this.$events[name]) {
      this.$events[name] = null
    }
    return this
  };
  EventEmitter.prototype.listeners = function(name) {
    if(!this.$events) {
      this.$events = {}
    }
    if(!this.$events[name]) {
      this.$events[name] = []
    }
    if(!io.util.isArray(this.$events[name])) {
      this.$events[name] = [this.$events[name]]
    }
    return this.$events[name]
  };
  EventEmitter.prototype.emit = function(name) {
    if(!this.$events) {
      return false
    }
    var handler = this.$events[name];
    if(!handler) {
      return false
    }
    var args = Array.prototype.slice.call(arguments, 1);
    if("function" == typeof handler) {
      handler.apply(this, args)
    }else {
      if(io.util.isArray(handler)) {
        var listeners = handler.slice();
        for(var i = 0, l = listeners.length;i < l;i++) {
          listeners[i].apply(this, args)
        }
      }else {
        return false
      }
    }
    return true
  }
})("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports);
(function(exports, nativeJSON) {
  if(nativeJSON && nativeJSON.parse) {
    return exports.JSON = {parse:nativeJSON.parse, stringify:nativeJSON.stringify}
  }
  var JSON = exports.JSON = {};
  function f(n) {
    return n < 10 ? "0" + n : n
  }
  function date(d, key) {
    return isFinite(d.valueOf()) ? d.getUTCFullYear() + "-" + f(d.getUTCMonth() + 1) + "-" + f(d.getUTCDate()) + "T" + f(d.getUTCHours()) + ":" + f(d.getUTCMinutes()) + ":" + f(d.getUTCSeconds()) + "Z" : null
  }
  var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, gap, indent, meta = {"\u0008":"\\b", "\t":"\\t", "\n":"\\n", "\u000c":"\\f", "\r":"\\r", '"':'\\"', "\\":"\\\\"}, rep;
  function quote(string) {
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function(a) {
      var c = meta[a];
      return typeof c === "string" ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
    }) + '"' : '"' + string + '"'
  }
  function str(key, holder) {
    var i, k, v, length, mind = gap, partial, value = holder[key];
    if(value instanceof Date) {
      value = date(key)
    }
    if(typeof rep === "function") {
      value = rep.call(holder, key, value)
    }
    switch(typeof value) {
      case "string":
        return quote(value);
      case "number":
        return isFinite(value) ? String(value) : "null";
      case "boolean":
      ;
      case "null":
        return String(value);
      case "object":
        if(!value) {
          return"null"
        }
        gap += indent;
        partial = [];
        if(Object.prototype.toString.apply(value) === "[object Array]") {
          length = value.length;
          for(i = 0;i < length;i += 1) {
            partial[i] = str(i, value) || "null"
          }
          v = partial.length === 0 ? "[]" : gap ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]" : "[" + partial.join(",") + "]";
          gap = mind;
          return v
        }
        if(rep && typeof rep === "object") {
          length = rep.length;
          for(i = 0;i < length;i += 1) {
            if(typeof rep[i] === "string") {
              k = rep[i];
              v = str(k, value);
              if(v) {
                partial.push(quote(k) + (gap ? ": " : ":") + v)
              }
            }
          }
        }else {
          for(k in value) {
            if(Object.prototype.hasOwnProperty.call(value, k)) {
              v = str(k, value);
              if(v) {
                partial.push(quote(k) + (gap ? ": " : ":") + v)
              }
            }
          }
        }
        v = partial.length === 0 ? "{}" : gap ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}" : "{" + partial.join(",") + "}";
        gap = mind;
        return v
    }
  }
  JSON.stringify = function(value, replacer, space) {
    var i;
    gap = "";
    indent = "";
    if(typeof space === "number") {
      for(i = 0;i < space;i += 1) {
        indent += " "
      }
    }else {
      if(typeof space === "string") {
        indent = space
      }
    }
    rep = replacer;
    if(replacer && typeof replacer !== "function" && (typeof replacer !== "object" || typeof replacer.length !== "number")) {
      throw new Error("JSON.stringify");
    }
    return str("", {"":value})
  };
  JSON.parse = function(text, reviver) {
    var j;
    function walk(holder, key) {
      var k, v, value = holder[key];
      if(value && typeof value === "object") {
        for(k in value) {
          if(Object.prototype.hasOwnProperty.call(value, k)) {
            v = walk(value, k);
            if(v !== undefined) {
              value[k] = v
            }else {
              delete value[k]
            }
          }
        }
      }
      return reviver.call(holder, key, value)
    }
    text = String(text);
    cx.lastIndex = 0;
    if(cx.test(text)) {
      text = text.replace(cx, function(a) {
        return"\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
      })
    }
    if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
      j = eval("(" + text + ")");
      return typeof reviver === "function" ? walk({"":j}, "") : j
    }
    throw new SyntaxError("JSON.parse");
  }
})("undefined" != typeof io ? io : module.exports, typeof JSON !== "undefined" ? JSON : undefined);
(function(exports, io) {
  var parser = exports.parser = {};
  var packets = parser.packets = ["disconnect", "connect", "heartbeat", "message", "json", "event", "ack", "error", "noop"];
  var reasons = parser.reasons = ["transport not supported", "client not handshaken", "unauthorized"];
  var advice = parser.advice = ["reconnect"];
  var JSON = io.JSON, indexOf = io.util.indexOf;
  parser.encodePacket = function(packet) {
    var type = indexOf(packets, packet.type), id = packet.id || "", endpoint = packet.endpoint || "", ack = packet.ack, data = null;
    switch(packet.type) {
      case "error":
        var reason = packet.reason ? indexOf(reasons, packet.reason) : "", adv = packet.advice ? indexOf(advice, packet.advice) : "";
        if(reason !== "" || adv !== "") {
          data = reason + (adv !== "" ? "+" + adv : "")
        }
        break;
      case "message":
        if(packet.data !== "") {
          data = packet.data
        }
        break;
      case "event":
        var ev = {name:packet.name};
        if(packet.args && packet.args.length) {
          ev.args = packet.args
        }
        data = JSON.stringify(ev);
        break;
      case "json":
        data = JSON.stringify(packet.data);
        break;
      case "connect":
        if(packet.qs) {
          data = packet.qs
        }
        break;
      case "ack":
        data = packet.ackId + (packet.args && packet.args.length ? "+" + JSON.stringify(packet.args) : "");
        break
    }
    var encoded = [type, id + (ack == "data" ? "+" : ""), endpoint];
    if(data !== null && data !== undefined) {
      encoded.push(data)
    }
    return encoded.join(":")
  };
  parser.encodePayload = function(packets) {
    var decoded = "";
    if(packets.length == 1) {
      return packets[0]
    }
    for(var i = 0, l = packets.length;i < l;i++) {
      var packet = packets[i];
      decoded += "\ufffd" + packet.length + "\ufffd" + packets[i]
    }
    return decoded
  };
  var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;
  parser.decodePacket = function(data) {
    var pieces = data.match(regexp);
    if(!pieces) {
      return{}
    }
    var id = pieces[2] || "", data = pieces[5] || "", packet = {type:packets[pieces[1]], endpoint:pieces[4] || ""};
    if(id) {
      packet.id = id;
      if(pieces[3]) {
        packet.ack = "data"
      }else {
        packet.ack = true
      }
    }
    switch(packet.type) {
      case "error":
        var pieces = data.split("+");
        packet.reason = reasons[pieces[0]] || "";
        packet.advice = advice[pieces[1]] || "";
        break;
      case "message":
        packet.data = data || "";
        break;
      case "event":
        try {
          var opts = JSON.parse(data);
          packet.name = opts.name;
          packet.args = opts.args
        }catch(e) {
        }
        packet.args = packet.args || [];
        break;
      case "json":
        try {
          packet.data = JSON.parse(data)
        }catch(e) {
        }
        break;
      case "connect":
        packet.qs = data || "";
        break;
      case "ack":
        var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
        if(pieces) {
          packet.ackId = pieces[1];
          packet.args = [];
          if(pieces[3]) {
            try {
              packet.args = pieces[3] ? JSON.parse(pieces[3]) : []
            }catch(e) {
            }
          }
        }
        break;
      case "disconnect":
      ;
      case "heartbeat":
        break
    }
    return packet
  };
  parser.decodePayload = function(data) {
    if(data.charAt(0) == "\ufffd") {
      var ret = [];
      for(var i = 1, length = "";i < data.length;i++) {
        if(data.charAt(i) == "\ufffd") {
          ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length)));
          i += Number(length) + 1;
          length = ""
        }else {
          length += data.charAt(i)
        }
      }
      return ret
    }else {
      return[parser.decodePacket(data)]
    }
  }
})("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports);
(function(exports, io) {
  exports.Transport = Transport;
  function Transport(socket, sessid) {
    this.socket = socket;
    this.sessid = sessid
  }
  io.util.mixin(Transport, io.EventEmitter);
  Transport.prototype.onData = function(data) {
    this.clearCloseTimeout();
    if(this.socket.connected || this.socket.connecting || this.socket.reconnecting) {
      this.setCloseTimeout()
    }
    if(data !== "") {
      var msgs = io.parser.decodePayload(data);
      if(msgs && msgs.length) {
        for(var i = 0, l = msgs.length;i < l;i++) {
          this.onPacket(msgs[i])
        }
      }
    }
    return this
  };
  Transport.prototype.onPacket = function(packet) {
    this.socket.setHeartbeatTimeout();
    if(packet.type == "heartbeat") {
      return this.onHeartbeat()
    }
    if(packet.type == "connect" && packet.endpoint == "") {
      this.onConnect()
    }
    if(packet.type == "error" && packet.advice == "reconnect") {
      this.open = false
    }
    this.socket.onPacket(packet);
    return this
  };
  Transport.prototype.setCloseTimeout = function() {
    if(!this.closeTimeout) {
      var self = this;
      this.closeTimeout = setTimeout(function() {
        self.onDisconnect()
      }, this.socket.closeTimeout)
    }
  };
  Transport.prototype.onDisconnect = function() {
    if(this.close && this.open) {
      this.close()
    }
    this.clearTimeouts();
    this.socket.onDisconnect();
    return this
  };
  Transport.prototype.onConnect = function() {
    this.socket.onConnect();
    return this
  };
  Transport.prototype.clearCloseTimeout = function() {
    if(this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null
    }
  };
  Transport.prototype.clearTimeouts = function() {
    this.clearCloseTimeout();
    if(this.reopenTimeout) {
      clearTimeout(this.reopenTimeout)
    }
  };
  Transport.prototype.packet = function(packet) {
    this.send(io.parser.encodePacket(packet))
  };
  Transport.prototype.onHeartbeat = function(heartbeat) {
    this.packet({type:"heartbeat"})
  };
  Transport.prototype.onOpen = function() {
    this.open = true;
    this.clearCloseTimeout();
    this.socket.onOpen()
  };
  Transport.prototype.onClose = function() {
    var self = this;
    this.open = false;
    this.socket.onClose();
    this.onDisconnect()
  };
  Transport.prototype.prepareUrl = function() {
    var options = this.socket.options;
    return this.scheme() + "://" + options.host + ":" + options.port + "/" + options.resource + "/" + io.protocol + "/" + this.name + "/" + this.sessid
  };
  Transport.prototype.ready = function(socket, fn) {
    fn.call(this)
  }
})("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports);
(function(exports, io, global) {
  exports.Socket = Socket;
  function Socket(options) {
    this.options = {port:80, secure:false, document:"document" in global ? document : false, resource:"socket.io", transports:io.transports, "connect timeout":1E4, "try multiple transports":true, "reconnect":true, "reconnection delay":500, "reconnection limit":Infinity, "reopen delay":3E3, "max reconnection attempts":10, "sync disconnect on unload":true, "auto connect":true, "flash policy port":10843};
    io.util.merge(this.options, options);
    this.connected = false;
    this.open = false;
    this.connecting = false;
    this.reconnecting = false;
    this.namespaces = {};
    this.buffer = [];
    this.doBuffer = false;
    if(this.options["sync disconnect on unload"] && (!this.isXDomain() || io.util.ua.hasCORS)) {
      var self = this;
      io.util.on(global, "unload", function() {
        self.disconnectSync()
      }, false)
    }
    if(this.options["auto connect"]) {
      this.connect()
    }
  }
  io.util.mixin(Socket, io.EventEmitter);
  Socket.prototype.of = function(name) {
    if(!this.namespaces[name]) {
      this.namespaces[name] = new io.SocketNamespace(this, name);
      if(name !== "") {
        this.namespaces[name].packet({type:"connect"})
      }
    }
    return this.namespaces[name]
  };
  Socket.prototype.publish = function() {
    this.emit.apply(this, arguments);
    var nsp;
    for(var i in this.namespaces) {
      if(this.namespaces.hasOwnProperty(i)) {
        nsp = this.of(i);
        nsp.$emit.apply(nsp, arguments)
      }
    }
  };
  function empty() {
  }
  Socket.prototype.handshake = function(fn) {
    var self = this, options = this.options;
    function complete(data) {
      if(data instanceof Error) {
        self.onError(data.message)
      }else {
        fn.apply(null, data.split(":"))
      }
    }
    var url = ["http" + (options.secure ? "s" : "") + ":/", options.host + ":" + options.port, options.resource, io.protocol, io.util.query(this.options.query, "t=" + +new Date)].join("/");
    if(this.isXDomain() && !io.util.ua.hasCORS) {
      var insertAt = document.getElementsByTagName("script")[0], script = document.createElement("script");
      script.src = url + "&jsonp=" + io.j.length;
      insertAt.parentNode.insertBefore(script, insertAt);
      io.j.push(function(data) {
        complete(data);
        script.parentNode.removeChild(script)
      })
    }else {
      var xhr = io.util.request();
      xhr.open("GET", url, true);
      xhr.withCredentials = true;
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4) {
          xhr.onreadystatechange = empty;
          if(xhr.status == 200) {
            complete(xhr.responseText)
          }else {
            !self.reconnecting && self.onError(xhr.responseText)
          }
        }
      };
      xhr.send(null)
    }
  };
  Socket.prototype.getTransport = function(override) {
    var transports = override || this.transports, match;
    for(var i = 0, transport;transport = transports[i];i++) {
      if(io.Transport[transport] && io.Transport[transport].check(this) && (!this.isXDomain() || io.Transport[transport].xdomainCheck())) {
        return new io.Transport[transport](this, this.sessionid)
      }
    }
    return null
  };
  Socket.prototype.connect = function(fn) {
    if(this.connecting) {
      return this
    }
    var self = this;
    this.handshake(function(sid, heartbeat, close, transports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1E3;
      self.heartbeatTimeout = heartbeat * 1E3;
      self.transports = transports ? io.util.intersect(transports.split(","), self.options.transports) : self.options.transports;
      self.setHeartbeatTimeout();
      function connect(transports) {
        if(self.transport) {
          self.transport.clearTimeouts()
        }
        self.transport = self.getTransport(transports);
        if(!self.transport) {
          return self.publish("connect_failed")
        }
        self.transport.ready(self, function() {
          self.connecting = true;
          self.publish("connecting", self.transport.name);
          self.transport.open();
          if(self.options["connect timeout"]) {
            self.connectTimeoutTimer = setTimeout(function() {
              if(!self.connected) {
                self.connecting = false;
                if(self.options["try multiple transports"]) {
                  if(!self.remainingTransports) {
                    self.remainingTransports = self.transports.slice(0)
                  }
                  var remaining = self.remainingTransports;
                  while(remaining.length > 0 && remaining.splice(0, 1)[0] != self.transport.name) {
                  }
                  if(remaining.length) {
                    connect(remaining)
                  }else {
                    self.publish("connect_failed")
                  }
                }
              }
            }, self.options["connect timeout"])
          }
        })
      }
      connect(self.transports);
      self.once("connect", function() {
        clearTimeout(self.connectTimeoutTimer);
        fn && typeof fn == "function" && fn()
      })
    });
    return this
  };
  Socket.prototype.setHeartbeatTimeout = function() {
    clearTimeout(this.heartbeatTimeoutTimer);
    var self = this;
    this.heartbeatTimeoutTimer = setTimeout(function() {
      self.transport.onClose()
    }, this.heartbeatTimeout)
  };
  Socket.prototype.packet = function(data) {
    if(this.connected && !this.doBuffer) {
      this.transport.packet(data)
    }else {
      this.buffer.push(data)
    }
    return this
  };
  Socket.prototype.setBuffer = function(v) {
    this.doBuffer = v;
    if(!v && this.connected && this.buffer.length) {
      this.transport.payload(this.buffer);
      this.buffer = []
    }
  };
  Socket.prototype.disconnect = function() {
    if(this.connected || this.connecting) {
      if(this.open) {
        this.of("").packet({type:"disconnect"})
      }
      this.onDisconnect("booted")
    }
    return this
  };
  Socket.prototype.disconnectSync = function() {
    var xhr = io.util.request(), uri = this.resource + "/" + io.protocol + "/" + this.sessionid;
    xhr.open("GET", uri, true);
    this.onDisconnect("booted")
  };
  Socket.prototype.isXDomain = function() {
    var port = global.location.port || ("https:" == global.location.protocol ? 443 : 80);
    return this.options.host !== global.location.hostname || this.options.port != port
  };
  Socket.prototype.onConnect = function() {
    if(!this.connected) {
      this.connected = true;
      this.connecting = false;
      if(!this.doBuffer) {
        this.setBuffer(false)
      }
      this.emit("connect")
    }
  };
  Socket.prototype.onOpen = function() {
    this.open = true
  };
  Socket.prototype.onClose = function() {
    this.open = false;
    clearTimeout(this.heartbeatTimeoutTimer)
  };
  Socket.prototype.onPacket = function(packet) {
    this.of(packet.endpoint).onPacket(packet)
  };
  Socket.prototype.onError = function(err) {
    if(err && err.advice) {
      if(err.advice === "reconnect" && (this.connected || this.connecting)) {
        this.disconnect();
        if(this.options.reconnect) {
          this.reconnect()
        }
      }
    }
    this.publish("error", err && err.reason ? err.reason : err)
  };
  Socket.prototype.onDisconnect = function(reason) {
    var wasConnected = this.connected, wasConnecting = this.connecting;
    this.connected = false;
    this.connecting = false;
    this.open = false;
    if(wasConnected || wasConnecting) {
      this.transport.close();
      this.transport.clearTimeouts();
      if(wasConnected) {
        this.publish("disconnect", reason);
        if("booted" != reason && this.options.reconnect && !this.reconnecting) {
          this.reconnect()
        }
      }
    }
  };
  Socket.prototype.reconnect = function() {
    this.reconnecting = true;
    this.reconnectionAttempts = 0;
    this.reconnectionDelay = this.options["reconnection delay"];
    var self = this, maxAttempts = this.options["max reconnection attempts"], tryMultiple = this.options["try multiple transports"], limit = this.options["reconnection limit"];
    function reset() {
      if(self.connected) {
        for(var i in self.namespaces) {
          if(self.namespaces.hasOwnProperty(i) && "" !== i) {
            self.namespaces[i].packet({type:"connect"})
          }
        }
        self.publish("reconnect", self.transport.name, self.reconnectionAttempts)
      }
      clearTimeout(self.reconnectionTimer);
      self.removeListener("connect_failed", maybeReconnect);
      self.removeListener("connect", maybeReconnect);
      self.reconnecting = false;
      delete self.reconnectionAttempts;
      delete self.reconnectionDelay;
      delete self.reconnectionTimer;
      delete self.redoTransports;
      self.options["try multiple transports"] = tryMultiple
    }
    function maybeReconnect() {
      if(!self.reconnecting) {
        return
      }
      if(self.connected) {
        return reset()
      }
      if(self.connecting && self.reconnecting) {
        return self.reconnectionTimer = setTimeout(maybeReconnect, 1E3)
      }
      if(self.reconnectionAttempts++ >= maxAttempts) {
        if(!self.redoTransports) {
          self.on("connect_failed", maybeReconnect);
          self.options["try multiple transports"] = true;
          self.transport = self.getTransport();
          self.redoTransports = true;
          self.connect()
        }else {
          self.publish("reconnect_failed");
          reset()
        }
      }else {
        if(self.reconnectionDelay < limit) {
          self.reconnectionDelay *= 2
        }
        self.connect();
        self.publish("reconnecting", self.reconnectionDelay, self.reconnectionAttempts);
        self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay)
      }
    }
    this.options["try multiple transports"] = false;
    this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);
    this.on("connect", maybeReconnect)
  }
})("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports, this);
(function(exports, io) {
  exports.SocketNamespace = SocketNamespace;
  function SocketNamespace(socket, name) {
    this.socket = socket;
    this.name = name || "";
    this.flags = {};
    this.json = new Flag(this, "json");
    this.ackPackets = 0;
    this.acks = {}
  }
  io.util.mixin(SocketNamespace, io.EventEmitter);
  SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit;
  SocketNamespace.prototype.of = function() {
    return this.socket.of.apply(this.socket, arguments)
  };
  SocketNamespace.prototype.packet = function(packet) {
    packet.endpoint = this.name;
    this.socket.packet(packet);
    this.flags = {};
    return this
  };
  SocketNamespace.prototype.send = function(data, fn) {
    var packet = {type:this.flags.json ? "json" : "message", data:data};
    if("function" == typeof fn) {
      packet.id = ++this.ackPackets;
      packet.ack = true;
      this.acks[packet.id] = fn
    }
    return this.packet(packet)
  };
  SocketNamespace.prototype.emit = function(name) {
    var args = Array.prototype.slice.call(arguments, 1), lastArg = args[args.length - 1], packet = {type:"event", name:name};
    if("function" == typeof lastArg) {
      packet.id = ++this.ackPackets;
      packet.ack = "data";
      this.acks[packet.id] = lastArg;
      args = args.slice(0, args.length - 1)
    }
    packet.args = args;
    return this.packet(packet)
  };
  SocketNamespace.prototype.disconnect = function() {
    if(this.name === "") {
      this.socket.disconnect()
    }else {
      this.packet({type:"disconnect"});
      this.$emit("disconnect")
    }
    return this
  };
  SocketNamespace.prototype.onPacket = function(packet) {
    var self = this;
    function ack() {
      self.packet({type:"ack", args:io.util.toArray(arguments), ackId:packet.id})
    }
    switch(packet.type) {
      case "connect":
        this.$emit("connect");
        break;
      case "disconnect":
        if(this.name === "") {
          this.socket.onDisconnect(packet.reason || "booted")
        }else {
          this.$emit("disconnect", packet.reason)
        }
        break;
      case "message":
      ;
      case "json":
        var params = ["message", packet.data];
        if(packet.ack == "data") {
          params.push(ack)
        }else {
          if(packet.ack) {
            this.packet({type:"ack", ackId:packet.id})
          }
        }
        this.$emit.apply(this, params);
        break;
      case "event":
        var params = [packet.name].concat(packet.args);
        if(packet.ack == "data") {
          params.push(ack)
        }
        this.$emit.apply(this, params);
        break;
      case "ack":
        if(this.acks[packet.ackId]) {
          this.acks[packet.ackId].apply(this, packet.args);
          delete this.acks[packet.ackId]
        }
        break;
      case "error":
        if(packet.advice) {
          this.socket.onError(packet)
        }else {
          if(packet.reason == "unauthorized") {
            this.$emit("connect_failed", packet.reason)
          }else {
            this.$emit("error", packet.reason)
          }
        }
        break
    }
  };
  function Flag(nsp, name) {
    this.namespace = nsp;
    this.name = name
  }
  Flag.prototype.send = function() {
    this.namespace.flags[this.name] = true;
    this.namespace.send.apply(this.namespace, arguments)
  };
  Flag.prototype.emit = function() {
    this.namespace.flags[this.name] = true;
    this.namespace.emit.apply(this.namespace, arguments)
  }
})("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports);
(function(exports, io, global) {
  exports.websocket = WS;
  function WS(socket) {
    io.Transport.apply(this, arguments)
  }
  io.util.inherit(WS, io.Transport);
  WS.prototype.name = "websocket";
  WS.prototype.open = function() {
    var query = io.util.query(this.socket.options.query), self = this, Socket;
    if(!Socket) {
      Socket = global.MozWebSocket || global.WebSocket
    }
    this.websocket = new Socket(this.prepareUrl() + query);
    this.websocket.onopen = function() {
      self.onOpen();
      self.socket.setBuffer(false)
    };
    this.websocket.onmessage = function(ev) {
      self.onData(ev.data)
    };
    this.websocket.onclose = function() {
      self.onClose();
      self.socket.setBuffer(true)
    };
    this.websocket.onerror = function(e) {
      self.onError(e)
    };
    return this
  };
  WS.prototype.send = function(data) {
    this.websocket.send(data);
    return this
  };
  WS.prototype.payload = function(arr) {
    for(var i = 0, l = arr.length;i < l;i++) {
      this.packet(arr[i])
    }
    return this
  };
  WS.prototype.close = function() {
    this.websocket.close();
    return this
  };
  WS.prototype.onError = function(e) {
    this.socket.onError(e)
  };
  WS.prototype.scheme = function() {
    return this.socket.options.secure ? "wss" : "ws"
  };
  WS.check = function() {
    return"WebSocket" in global && !("__addTask" in WebSocket) || "MozWebSocket" in global
  };
  WS.xdomainCheck = function() {
    return true
  };
  io.transports.push("websocket")
})("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this);
(function(exports, io) {
  exports.flashsocket = Flashsocket;
  function Flashsocket() {
    io.Transport.websocket.apply(this, arguments)
  }
  io.util.inherit(Flashsocket, io.Transport.websocket);
  Flashsocket.prototype.name = "flashsocket";
  Flashsocket.prototype.open = function() {
    var self = this, args = arguments;
    WebSocket.__addTask(function() {
      io.Transport.websocket.prototype.open.apply(self, args)
    });
    return this
  };
  Flashsocket.prototype.send = function() {
    var self = this, args = arguments;
    WebSocket.__addTask(function() {
      io.Transport.websocket.prototype.send.apply(self, args)
    });
    return this
  };
  Flashsocket.prototype.close = function() {
    WebSocket.__tasks.length = 0;
    io.Transport.websocket.prototype.close.call(this);
    return this
  };
  Flashsocket.prototype.ready = function(socket, fn) {
    function init() {
      var options = socket.options, port = options["flash policy port"], path = ["http" + (options.secure ? "s" : "") + ":/", options.host + ":" + options.port, options.resource, "static/flashsocket", "WebSocketMain" + (socket.isXDomain() ? "Insecure" : "") + ".swf"];
      if(!Flashsocket.loaded) {
        if(typeof WEB_SOCKET_SWF_LOCATION === "undefined") {
          WEB_SOCKET_SWF_LOCATION = path.join("/")
        }
        if(port !== 843) {
          WebSocket.loadFlashPolicyFile("xmlsocket://" + options.host + ":" + port)
        }
        WebSocket.__initialize();
        Flashsocket.loaded = true
      }
      fn.call(self)
    }
    var self = this;
    if(document.body) {
      return init()
    }
    io.util.load(init)
  };
  Flashsocket.check = function() {
    if(typeof WebSocket == "undefined" || !("__initialize" in WebSocket) || !swfobject) {
      return false
    }
    return swfobject.getFlashPlayerVersion().major >= 10
  };
  Flashsocket.xdomainCheck = function() {
    return true
  };
  if(typeof window != "undefined") {
    WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true
  }
  io.transports.push("flashsocket")
})("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports);
if("undefined" != typeof window) {
  var swfobject = function() {
    var D = "undefined", r = "object", S = "Shockwave Flash", W = "ShockwaveFlash.ShockwaveFlash", q = "application/x-shockwave-flash", R = "SWFObjectExprInst", x = "onreadystatechange", O = window, j = document, t = navigator, T = false, U = [h], o = [], N = [], I = [], l, Q, E, B, J = false, a = false, n, G, m = true, M = function() {
      var aa = typeof j.getElementById != D && typeof j.getElementsByTagName != D && typeof j.createElement != D, ah = t.userAgent.toLowerCase(), Y = t.platform.toLowerCase(), ae = Y ? /win/.test(Y) : /win/.test(ah), ac = Y ? /mac/.test(Y) : /mac/.test(ah), af = /webkit/.test(ah) ? parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/, "$1")) : false, X = !+"\v1", ag = [0, 0, 0], ab = null;
      if(typeof t.plugins != D && typeof t.plugins[S] == r) {
        ab = t.plugins[S].description;
        if(ab && !(typeof t.mimeTypes != D && t.mimeTypes[q] && !t.mimeTypes[q].enabledPlugin)) {
          T = true;
          X = false;
          ab = ab.replace(/^.*\s+(\S+\s+\S+$)/, "$1");
          ag[0] = parseInt(ab.replace(/^(.*)\..*$/, "$1"), 10);
          ag[1] = parseInt(ab.replace(/^.*\.(.*)\s.*$/, "$1"), 10);
          ag[2] = /[a-zA-Z]/.test(ab) ? parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/, "$1"), 10) : 0
        }
      }else {
        if(typeof O[["Active"].concat("Object").join("X")] != D) {
          try {
            var ad = new (window[["Active"].concat("Object").join("X")])(W);
            if(ad) {
              ab = ad.GetVariable("$version");
              if(ab) {
                X = true;
                ab = ab.split(" ")[1].split(",");
                ag = [parseInt(ab[0], 10), parseInt(ab[1], 10), parseInt(ab[2], 10)]
              }
            }
          }catch(Z) {
          }
        }
      }
      return{w3:aa, pv:ag, wk:af, ie:X, win:ae, mac:ac}
    }(), k = function() {
      if(!M.w3) {
        return
      }
      if(typeof j.readyState != D && j.readyState == "complete" || typeof j.readyState == D && (j.getElementsByTagName("body")[0] || j.body)) {
        f()
      }
      if(!J) {
        if(typeof j.addEventListener != D) {
          j.addEventListener("DOMContentLoaded", f, false)
        }
        if(M.ie && M.win) {
          j.attachEvent(x, function() {
            if(j.readyState == "complete") {
              j.detachEvent(x, arguments.callee);
              f()
            }
          });
          if(O == top) {
            (function() {
              if(J) {
                return
              }
              try {
                j.documentElement.doScroll("left")
              }catch(X) {
                setTimeout(arguments.callee, 0);
                return
              }
              f()
            })()
          }
        }
        if(M.wk) {
          (function() {
            if(J) {
              return
            }
            if(!/loaded|complete/.test(j.readyState)) {
              setTimeout(arguments.callee, 0);
              return
            }
            f()
          })()
        }
        s(f)
      }
    }();
    function f() {
      if(J) {
        return
      }
      try {
        var Z = j.getElementsByTagName("body")[0].appendChild(C("span"));
        Z.parentNode.removeChild(Z)
      }catch(aa) {
        return
      }
      J = true;
      var X = U.length;
      for(var Y = 0;Y < X;Y++) {
        U[Y]()
      }
    }
    function K(X) {
      if(J) {
        X()
      }else {
        U[U.length] = X
      }
    }
    function s(Y) {
      if(typeof O.addEventListener != D) {
        O.addEventListener("load", Y, false)
      }else {
        if(typeof j.addEventListener != D) {
          j.addEventListener("load", Y, false)
        }else {
          if(typeof O.attachEvent != D) {
            i(O, "onload", Y)
          }else {
            if(typeof O.onload == "function") {
              var X = O.onload;
              O.onload = function() {
                X();
                Y()
              }
            }else {
              O.onload = Y
            }
          }
        }
      }
    }
    function h() {
      if(T) {
        V()
      }else {
        H()
      }
    }
    function V() {
      var X = j.getElementsByTagName("body")[0];
      var aa = C(r);
      aa.setAttribute("type", q);
      var Z = X.appendChild(aa);
      if(Z) {
        var Y = 0;
        (function() {
          if(typeof Z.GetVariable != D) {
            var ab = Z.GetVariable("$version");
            if(ab) {
              ab = ab.split(" ")[1].split(",");
              M.pv = [parseInt(ab[0], 10), parseInt(ab[1], 10), parseInt(ab[2], 10)]
            }
          }else {
            if(Y < 10) {
              Y++;
              setTimeout(arguments.callee, 10);
              return
            }
          }
          X.removeChild(aa);
          Z = null;
          H()
        })()
      }else {
        H()
      }
    }
    function H() {
      var ag = o.length;
      if(ag > 0) {
        for(var af = 0;af < ag;af++) {
          var Y = o[af].id;
          var ab = o[af].callbackFn;
          var aa = {success:false, id:Y};
          if(M.pv[0] > 0) {
            var ae = c(Y);
            if(ae) {
              if(F(o[af].swfVersion) && !(M.wk && M.wk < 312)) {
                w(Y, true);
                if(ab) {
                  aa.success = true;
                  aa.ref = z(Y);
                  ab(aa)
                }
              }else {
                if(o[af].expressInstall && A()) {
                  var ai = {};
                  ai.data = o[af].expressInstall;
                  ai.width = ae.getAttribute("width") || "0";
                  ai.height = ae.getAttribute("height") || "0";
                  if(ae.getAttribute("class")) {
                    ai.styleclass = ae.getAttribute("class")
                  }
                  if(ae.getAttribute("align")) {
                    ai.align = ae.getAttribute("align")
                  }
                  var ah = {};
                  var X = ae.getElementsByTagName("param");
                  var ac = X.length;
                  for(var ad = 0;ad < ac;ad++) {
                    if(X[ad].getAttribute("name").toLowerCase() != "movie") {
                      ah[X[ad].getAttribute("name")] = X[ad].getAttribute("value")
                    }
                  }
                  P(ai, ah, Y, ab)
                }else {
                  p(ae);
                  if(ab) {
                    ab(aa)
                  }
                }
              }
            }
          }else {
            w(Y, true);
            if(ab) {
              var Z = z(Y);
              if(Z && typeof Z.SetVariable != D) {
                aa.success = true;
                aa.ref = Z
              }
              ab(aa)
            }
          }
        }
      }
    }
    function z(aa) {
      var X = null;
      var Y = c(aa);
      if(Y && Y.nodeName == "OBJECT") {
        if(typeof Y.SetVariable != D) {
          X = Y
        }else {
          var Z = Y.getElementsByTagName(r)[0];
          if(Z) {
            X = Z
          }
        }
      }
      return X
    }
    function A() {
      return!a && F("6.0.65") && (M.win || M.mac) && !(M.wk && M.wk < 312)
    }
    function P(aa, ab, X, Z) {
      a = true;
      E = Z || null;
      B = {success:false, id:X};
      var ae = c(X);
      if(ae) {
        if(ae.nodeName == "OBJECT") {
          l = g(ae);
          Q = null
        }else {
          l = ae;
          Q = X
        }
        aa.id = R;
        if(typeof aa.width == D || !/%$/.test(aa.width) && parseInt(aa.width, 10) < 310) {
          aa.width = "310"
        }
        if(typeof aa.height == D || !/%$/.test(aa.height) && parseInt(aa.height, 10) < 137) {
          aa.height = "137"
        }
        j.title = j.title.slice(0, 47) + " - Flash Player Installation";
        var ad = M.ie && M.win ? ["Active"].concat("").join("X") : "PlugIn", ac = "MMredirectURL=" + O.location.toString().replace(/&/g, "%26") + "&MMplayerType=" + ad + "&MMdoctitle=" + j.title;
        if(typeof ab.flashvars != D) {
          ab.flashvars += "&" + ac
        }else {
          ab.flashvars = ac
        }
        if(M.ie && M.win && ae.readyState != 4) {
          var Y = C("div");
          X += "SWFObjectNew";
          Y.setAttribute("id", X);
          ae.parentNode.insertBefore(Y, ae);
          ae.style.display = "none";
          (function() {
            if(ae.readyState == 4) {
              ae.parentNode.removeChild(ae)
            }else {
              setTimeout(arguments.callee, 10)
            }
          })()
        }
        u(aa, ab, X)
      }
    }
    function p(Y) {
      if(M.ie && M.win && Y.readyState != 4) {
        var X = C("div");
        Y.parentNode.insertBefore(X, Y);
        X.parentNode.replaceChild(g(Y), X);
        Y.style.display = "none";
        (function() {
          if(Y.readyState == 4) {
            Y.parentNode.removeChild(Y)
          }else {
            setTimeout(arguments.callee, 10)
          }
        })()
      }else {
        Y.parentNode.replaceChild(g(Y), Y)
      }
    }
    function g(ab) {
      var aa = C("div");
      if(M.win && M.ie) {
        aa.innerHTML = ab.innerHTML
      }else {
        var Y = ab.getElementsByTagName(r)[0];
        if(Y) {
          var ad = Y.childNodes;
          if(ad) {
            var X = ad.length;
            for(var Z = 0;Z < X;Z++) {
              if(!(ad[Z].nodeType == 1 && ad[Z].nodeName == "PARAM") && !(ad[Z].nodeType == 8)) {
                aa.appendChild(ad[Z].cloneNode(true))
              }
            }
          }
        }
      }
      return aa
    }
    function u(ai, ag, Y) {
      var X, aa = c(Y);
      if(M.wk && M.wk < 312) {
        return X
      }
      if(aa) {
        if(typeof ai.id == D) {
          ai.id = Y
        }
        if(M.ie && M.win) {
          var ah = "";
          for(var ae in ai) {
            if(ai[ae] != Object.prototype[ae]) {
              if(ae.toLowerCase() == "data") {
                ag.movie = ai[ae]
              }else {
                if(ae.toLowerCase() == "styleclass") {
                  ah += ' class="' + ai[ae] + '"'
                }else {
                  if(ae.toLowerCase() != "classid") {
                    ah += " " + ae + '="' + ai[ae] + '"'
                  }
                }
              }
            }
          }
          var af = "";
          for(var ad in ag) {
            if(ag[ad] != Object.prototype[ad]) {
              af += '<param name="' + ad + '" value="' + ag[ad] + '" />'
            }
          }
          aa.outerHTML = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"' + ah + ">" + af + "</object>";
          N[N.length] = ai.id;
          X = c(ai.id)
        }else {
          var Z = C(r);
          Z.setAttribute("type", q);
          for(var ac in ai) {
            if(ai[ac] != Object.prototype[ac]) {
              if(ac.toLowerCase() == "styleclass") {
                Z.setAttribute("class", ai[ac])
              }else {
                if(ac.toLowerCase() != "classid") {
                  Z.setAttribute(ac, ai[ac])
                }
              }
            }
          }
          for(var ab in ag) {
            if(ag[ab] != Object.prototype[ab] && ab.toLowerCase() != "movie") {
              e(Z, ab, ag[ab])
            }
          }
          aa.parentNode.replaceChild(Z, aa);
          X = Z
        }
      }
      return X
    }
    function e(Z, X, Y) {
      var aa = C("param");
      aa.setAttribute("name", X);
      aa.setAttribute("value", Y);
      Z.appendChild(aa)
    }
    function y(Y) {
      var X = c(Y);
      if(X && X.nodeName == "OBJECT") {
        if(M.ie && M.win) {
          X.style.display = "none";
          (function() {
            if(X.readyState == 4) {
              b(Y)
            }else {
              setTimeout(arguments.callee, 10)
            }
          })()
        }else {
          X.parentNode.removeChild(X)
        }
      }
    }
    function b(Z) {
      var Y = c(Z);
      if(Y) {
        for(var X in Y) {
          if(typeof Y[X] == "function") {
            Y[X] = null
          }
        }
        Y.parentNode.removeChild(Y)
      }
    }
    function c(Z) {
      var X = null;
      try {
        X = j.getElementById(Z)
      }catch(Y) {
      }
      return X
    }
    function C(X) {
      return j.createElement(X)
    }
    function i(Z, X, Y) {
      Z.attachEvent(X, Y);
      I[I.length] = [Z, X, Y]
    }
    function F(Z) {
      var Y = M.pv, X = Z.split(".");
      X[0] = parseInt(X[0], 10);
      X[1] = parseInt(X[1], 10) || 0;
      X[2] = parseInt(X[2], 10) || 0;
      return Y[0] > X[0] || Y[0] == X[0] && Y[1] > X[1] || Y[0] == X[0] && Y[1] == X[1] && Y[2] >= X[2] ? true : false
    }
    function v(ac, Y, ad, ab) {
      if(M.ie && M.mac) {
        return
      }
      var aa = j.getElementsByTagName("head")[0];
      if(!aa) {
        return
      }
      var X = ad && typeof ad == "string" ? ad : "screen";
      if(ab) {
        n = null;
        G = null
      }
      if(!n || G != X) {
        var Z = C("style");
        Z.setAttribute("type", "text/css");
        Z.setAttribute("media", X);
        n = aa.appendChild(Z);
        if(M.ie && M.win && typeof j.styleSheets != D && j.styleSheets.length > 0) {
          n = j.styleSheets[j.styleSheets.length - 1]
        }
        G = X
      }
      if(M.ie && M.win) {
        if(n && typeof n.addRule == r) {
          n.addRule(ac, Y)
        }
      }else {
        if(n && typeof j.createTextNode != D) {
          n.appendChild(j.createTextNode(ac + " {" + Y + "}"))
        }
      }
    }
    function w(Z, X) {
      if(!m) {
        return
      }
      var Y = X ? "visible" : "hidden";
      if(J && c(Z)) {
        c(Z).style.visibility = Y
      }else {
        v("#" + Z, "visibility:" + Y)
      }
    }
    function L(Y) {
      var Z = /[\\\"<>\.;]/;
      var X = Z.exec(Y) != null;
      return X && typeof encodeURIComponent != D ? encodeURIComponent(Y) : Y
    }
    var d = function() {
      if(M.ie && M.win) {
        window.attachEvent("onunload", function() {
          var ac = I.length;
          for(var ab = 0;ab < ac;ab++) {
            I[ab][0].detachEvent(I[ab][1], I[ab][2])
          }
          var Z = N.length;
          for(var aa = 0;aa < Z;aa++) {
            y(N[aa])
          }
          for(var Y in M) {
            M[Y] = null
          }
          M = null;
          for(var X in swfobject) {
            swfobject[X] = null
          }
          swfobject = null
        })
      }
    }();
    return{registerObject:function(ab, X, aa, Z) {
      if(M.w3 && ab && X) {
        var Y = {};
        Y.id = ab;
        Y.swfVersion = X;
        Y.expressInstall = aa;
        Y.callbackFn = Z;
        o[o.length] = Y;
        w(ab, false)
      }else {
        if(Z) {
          Z({success:false, id:ab})
        }
      }
    }, getObjectById:function(X) {
      if(M.w3) {
        return z(X)
      }
    }, embedSWF:function(ab, ah, ae, ag, Y, aa, Z, ad, af, ac) {
      var X = {success:false, id:ah};
      if(M.w3 && !(M.wk && M.wk < 312) && ab && ah && ae && ag && Y) {
        w(ah, false);
        K(function() {
          ae += "";
          ag += "";
          var aj = {};
          if(af && typeof af === r) {
            for(var al in af) {
              aj[al] = af[al]
            }
          }
          aj.data = ab;
          aj.width = ae;
          aj.height = ag;
          var am = {};
          if(ad && typeof ad === r) {
            for(var ak in ad) {
              am[ak] = ad[ak]
            }
          }
          if(Z && typeof Z === r) {
            for(var ai in Z) {
              if(typeof am.flashvars != D) {
                am.flashvars += "&" + ai + "=" + Z[ai]
              }else {
                am.flashvars = ai + "=" + Z[ai]
              }
            }
          }
          if(F(Y)) {
            var an = u(aj, am, ah);
            if(aj.id == ah) {
              w(ah, true)
            }
            X.success = true;
            X.ref = an
          }else {
            if(aa && A()) {
              aj.data = aa;
              P(aj, am, ah, ac);
              return
            }else {
              w(ah, true)
            }
          }
          if(ac) {
            ac(X)
          }
        })
      }else {
        if(ac) {
          ac(X)
        }
      }
    }, switchOffAutoHideShow:function() {
      m = false
    }, ua:M, getFlashPlayerVersion:function() {
      return{major:M.pv[0], minor:M.pv[1], release:M.pv[2]}
    }, hasFlashPlayerVersion:F, createSWF:function(Z, Y, X) {
      if(M.w3) {
        return u(Z, Y, X)
      }else {
        return undefined
      }
    }, showExpressInstall:function(Z, aa, X, Y) {
      if(M.w3 && A()) {
        P(Z, aa, X, Y)
      }
    }, removeSWF:function(X) {
      if(M.w3) {
        y(X)
      }
    }, createCSS:function(aa, Z, Y, X) {
      if(M.w3) {
        v(aa, Z, Y, X)
      }
    }, addDomLoadEvent:K, addLoadEvent:s, getQueryParamValue:function(aa) {
      var Z = j.location.search || j.location.hash;
      if(Z) {
        if(/\?/.test(Z)) {
          Z = Z.split("?")[1]
        }
        if(aa == null) {
          return L(Z)
        }
        var Y = Z.split("&");
        for(var X = 0;X < Y.length;X++) {
          if(Y[X].substring(0, Y[X].indexOf("=")) == aa) {
            return L(Y[X].substring(Y[X].indexOf("=") + 1))
          }
        }
      }
      return""
    }, expressInstallCallback:function() {
      if(a) {
        var X = c(R);
        if(X && l) {
          X.parentNode.replaceChild(l, X);
          if(Q) {
            w(Q, true);
            if(M.ie && M.win) {
              l.style.display = "block"
            }
          }
          if(E) {
            E(B)
          }
        }
        a = false
      }
    }}
  }()
}
(function() {
  if("undefined" == typeof window || window.WebSocket) {
    return
  }
  var console = window.console;
  if(!console || !console.log || !console.error) {
    console = {log:function() {
    }, error:function() {
    }}
  }
  if(!swfobject.hasFlashPlayerVersion("10.0.0")) {
    console.error("Flash Player >= 10.0.0 is required.");
    return
  }
  if(location.protocol == "file:") {
    console.error("WARNING: web-socket-js doesn't work in file:///... URL " + "unless you set Flash Security Settings properly. " + "Open the page via Web server i.e. http://...")
  }
  WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if(!protocols) {
      protocols = []
    }else {
      if(typeof protocols == "string") {
        protocols = [protocols]
      }
    }
    setTimeout(function() {
      WebSocket.__addTask(function() {
        WebSocket.__flash.create(self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null)
      })
    }, 0)
  };
  WebSocket.prototype.send = function(data) {
    if(this.readyState == WebSocket.CONNECTING) {
      throw"INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if(result < 0) {
      return true
    }else {
      this.bufferedAmount += result;
      return false
    }
  };
  WebSocket.prototype.close = function() {
    if(this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id)
  };
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if(!(type in this.__events)) {
      this.__events[type] = []
    }
    this.__events[type].push(listener)
  };
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if(!(type in this.__events)) {
      return
    }
    var events = this.__events[type];
    for(var i = events.length - 1;i >= 0;--i) {
      if(events[i] === listener) {
        events.splice(i, 1);
        break
      }
    }
  };
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for(var i = 0;i < events.length;++i) {
      events[i](event)
    }
    var handler = this["on" + event.type];
    if(handler) {
      handler(event)
    }
  };
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    if("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState
    }
    if("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol
    }
    var jsEvent;
    if(flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type)
    }else {
      if(flashEvent.type == "close") {
        jsEvent = this.__createSimpleEvent("close")
      }else {
        if(flashEvent.type == "message") {
          var data = decodeURIComponent(flashEvent.message);
          jsEvent = this.__createMessageEvent("message", data)
        }else {
          throw"unknown event type: " + flashEvent.type;
        }
      }
    }
    this.dispatchEvent(jsEvent)
  };
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if(document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event
    }else {
      return{type:type, bubbles:false, cancelable:false}
    }
  };
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if(document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event
    }else {
      return{type:type, data:data, bubbles:false, cancelable:false}
    }
  };
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;
  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  WebSocket.loadFlashPolicyFile = function(url) {
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url)
    })
  };
  WebSocket.__initialize = function() {
    if(WebSocket.__flash) {
      return
    }
    if(WebSocket.__swfLocation) {
      window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation
    }
    if(!window.WEB_SOCKET_SWF_LOCATION) {
      console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
      return
    }
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    container.style.position = "absolute";
    if(WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px"
    }else {
      container.style.left = "-100px";
      container.style.top = "-100px"
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    swfobject.embedSWF(WEB_SOCKET_SWF_LOCATION, "webSocketFlash", "1", "1", "10.0.0", null, null, {hasPriority:true, swliveconnect:true, allowScriptAccess:"always"}, null, function(e) {
      if(!e.success) {
        console.error("[WebSocket] swfobject.embedSWF failed")
      }
    })
  };
  WebSocket.__onFlashInitialized = function() {
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for(var i = 0;i < WebSocket.__tasks.length;++i) {
        WebSocket.__tasks[i]()
      }
      WebSocket.__tasks = []
    }, 0)
  };
  WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        var events = WebSocket.__flash.receiveEvents();
        for(var i = 0;i < events.length;++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i])
        }
      }catch(e) {
        console.error(e)
      }
    }, 0);
    return true
  };
  WebSocket.__log = function(message) {
    console.log(decodeURIComponent(message))
  };
  WebSocket.__error = function(message) {
    console.error(decodeURIComponent(message))
  };
  WebSocket.__addTask = function(task) {
    if(WebSocket.__flash) {
      task()
    }else {
      WebSocket.__tasks.push(task)
    }
  };
  WebSocket.__isFlashLite = function() {
    if(!window.navigator || !window.navigator.mimeTypes) {
      return false
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if(!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false
  };
  if(!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
    if(window.addEventListener) {
      window.addEventListener("load", function() {
        WebSocket.__initialize()
      }, false)
    }else {
      window.attachEvent("onload", function() {
        WebSocket.__initialize()
      })
    }
  }
})();
(function(exports, io, global) {
  exports.XHR = XHR;
  function XHR(socket) {
    if(!socket) {
      return
    }
    io.Transport.apply(this, arguments);
    this.sendBuffer = []
  }
  io.util.inherit(XHR, io.Transport);
  XHR.prototype.open = function() {
    this.socket.setBuffer(false);
    this.onOpen();
    this.get();
    this.setCloseTimeout();
    return this
  };
  XHR.prototype.payload = function(payload) {
    var msgs = [];
    for(var i = 0, l = payload.length;i < l;i++) {
      msgs.push(io.parser.encodePacket(payload[i]))
    }
    this.send(io.parser.encodePayload(msgs))
  };
  XHR.prototype.send = function(data) {
    this.post(data);
    return this
  };
  function empty() {
  }
  XHR.prototype.post = function(data) {
    var self = this;
    this.socket.setBuffer(true);
    function stateChange() {
      if(this.readyState == 4) {
        this.onreadystatechange = empty;
        self.posting = false;
        if(this.status == 200) {
          self.socket.setBuffer(false)
        }else {
          self.onClose()
        }
      }
    }
    function onload() {
      this.onload = empty;
      self.socket.setBuffer(false)
    }
    this.sendXHR = this.request("POST");
    if(global.XDomainRequest && this.sendXHR instanceof XDomainRequest) {
      this.sendXHR.onload = this.sendXHR.onerror = onload
    }else {
      this.sendXHR.onreadystatechange = stateChange
    }
    this.sendXHR.send(data)
  };
  XHR.prototype.close = function() {
    this.onClose();
    return this
  };
  XHR.prototype.request = function(method) {
    var req = io.util.request(this.socket.isXDomain()), query = io.util.query(this.socket.options.query, "t=" + +new Date);
    req.open(method || "GET", this.prepareUrl() + query, true);
    if(method == "POST") {
      try {
        if(req.setRequestHeader) {
          req.setRequestHeader("Content-type", "text/plain;charset=UTF-8")
        }else {
          req.contentType = "text/plain"
        }
      }catch(e) {
      }
    }
    return req
  };
  XHR.prototype.scheme = function() {
    return this.socket.options.secure ? "https" : "http"
  };
  XHR.check = function(socket, xdomain) {
    try {
      var request = io.util.request(xdomain), usesXDomReq = global.XDomainRequest && request instanceof XDomainRequest, socketProtocol = socket && socket.options && socket.options.secure ? "https:" : "http:", isXProtocol = socketProtocol != global.location.protocol;
      if(request && !(usesXDomReq && isXProtocol)) {
        return true
      }
    }catch(e) {
    }
    return false
  };
  XHR.xdomainCheck = function() {
    return XHR.check(null, true)
  }
})("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this);
(function(exports, io) {
  exports.htmlfile = HTMLFile;
  function HTMLFile(socket) {
    io.Transport.XHR.apply(this, arguments)
  }
  io.util.inherit(HTMLFile, io.Transport.XHR);
  HTMLFile.prototype.name = "htmlfile";
  HTMLFile.prototype.get = function() {
    this.doc = new (window[["Active"].concat("Object").join("X")])("htmlfile");
    this.doc.open();
    this.doc.write("<html></html>");
    this.doc.close();
    this.doc.parentWindow.s = this;
    var iframeC = this.doc.createElement("div");
    iframeC.className = "socketio";
    this.doc.body.appendChild(iframeC);
    this.iframe = this.doc.createElement("iframe");
    iframeC.appendChild(this.iframe);
    var self = this, query = io.util.query(this.socket.options.query, "t=" + +new Date);
    this.iframe.src = this.prepareUrl() + query;
    io.util.on(window, "unload", function() {
      self.destroy()
    })
  };
  HTMLFile.prototype._ = function(data, doc) {
    this.onData(data);
    try {
      var script = doc.getElementsByTagName("script")[0];
      script.parentNode.removeChild(script)
    }catch(e) {
    }
  };
  HTMLFile.prototype.destroy = function() {
    if(this.iframe) {
      try {
        this.iframe.src = "about:blank"
      }catch(e) {
      }
      this.doc = null;
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;
      CollectGarbage()
    }
  };
  HTMLFile.prototype.close = function() {
    this.destroy();
    return io.Transport.XHR.prototype.close.call(this)
  };
  HTMLFile.check = function() {
    if(typeof window != "undefined" && ["Active"].concat("Object").join("X") in window) {
      try {
        var a = new (window[["Active"].concat("Object").join("X")])("htmlfile");
        return a && io.Transport.XHR.check()
      }catch(e) {
      }
    }
    return false
  };
  HTMLFile.xdomainCheck = function() {
    return false
  };
  io.transports.push("htmlfile")
})("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports);
(function(exports, io, global) {
  exports["xhr-polling"] = XHRPolling;
  function XHRPolling() {
    io.Transport.XHR.apply(this, arguments)
  }
  io.util.inherit(XHRPolling, io.Transport.XHR);
  io.util.merge(XHRPolling, io.Transport.XHR);
  XHRPolling.prototype.name = "xhr-polling";
  XHRPolling.prototype.open = function() {
    var self = this;
    io.Transport.XHR.prototype.open.call(self);
    return false
  };
  function empty() {
  }
  XHRPolling.prototype.get = function() {
    if(!this.open) {
      return
    }
    var self = this;
    function stateChange() {
      if(this.readyState == 4) {
        this.onreadystatechange = empty;
        if(this.status == 200) {
          self.onData(this.responseText);
          self.get()
        }else {
          self.onClose()
        }
      }
    }
    function onload() {
      this.onload = empty;
      this.onerror = empty;
      self.onData(this.responseText);
      self.get()
    }
    function onerror() {
      self.onClose()
    }
    this.xhr = this.request();
    if(global.XDomainRequest && this.xhr instanceof XDomainRequest) {
      this.xhr.onload = onload;
      this.xhr.onerror = onerror
    }else {
      this.xhr.onreadystatechange = stateChange
    }
    this.xhr.send(null)
  };
  XHRPolling.prototype.onClose = function() {
    io.Transport.XHR.prototype.onClose.call(this);
    if(this.xhr) {
      this.xhr.onreadystatechange = this.xhr.onload = this.xhr.onerror = empty;
      try {
        this.xhr.abort()
      }catch(e) {
      }
      this.xhr = null
    }
  };
  XHRPolling.prototype.ready = function(socket, fn) {
    var self = this;
    io.util.defer(function() {
      fn.call(self)
    })
  };
  io.transports.push("xhr-polling")
})("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this);
(function(exports, io, global) {
  var indicator = global.document && "MozAppearance" in global.document.documentElement.style;
  exports["jsonp-polling"] = JSONPPolling;
  function JSONPPolling(socket) {
    io.Transport["xhr-polling"].apply(this, arguments);
    this.index = io.j.length;
    var self = this;
    io.j.push(function(msg) {
      self._(msg)
    })
  }
  io.util.inherit(JSONPPolling, io.Transport["xhr-polling"]);
  JSONPPolling.prototype.name = "jsonp-polling";
  JSONPPolling.prototype.post = function(data) {
    var self = this, query = io.util.query(this.socket.options.query, "t=" + +new Date + "&i=" + this.index);
    if(!this.form) {
      var form = document.createElement("form"), area = document.createElement("textarea"), id = this.iframeId = "socketio_iframe_" + this.index, iframe;
      form.className = "socketio";
      form.style.position = "absolute";
      form.style.top = "0px";
      form.style.left = "0px";
      form.style.display = "none";
      form.target = id;
      form.method = "POST";
      form.setAttribute("accept-charset", "utf-8");
      area.name = "d";
      form.appendChild(area);
      document.body.appendChild(form);
      this.form = form;
      this.area = area
    }
    this.form.action = this.prepareUrl() + query;
    function complete() {
      initIframe();
      self.socket.setBuffer(false)
    }
    function initIframe() {
      if(self.iframe) {
        self.form.removeChild(self.iframe)
      }
      try {
        iframe = document.createElement('<iframe name="' + self.iframeId + '">')
      }catch(e) {
        iframe = document.createElement("iframe");
        iframe.name = self.iframeId
      }
      iframe.id = self.iframeId;
      self.form.appendChild(iframe);
      self.iframe = iframe
    }
    initIframe();
    this.area.value = io.JSON.stringify(data);
    try {
      this.form.submit()
    }catch(e) {
    }
    if(this.iframe.attachEvent) {
      iframe.onreadystatechange = function() {
        if(self.iframe.readyState == "complete") {
          complete()
        }
      }
    }else {
      this.iframe.onload = complete
    }
    this.socket.setBuffer(true)
  };
  JSONPPolling.prototype.get = function() {
    var self = this, script = document.createElement("script"), query = io.util.query(this.socket.options.query, "t=" + +new Date + "&i=" + this.index);
    if(this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null
    }
    script.async = true;
    script.src = this.prepareUrl() + query;
    script.onerror = function() {
      self.onClose()
    };
    var insertAt = document.getElementsByTagName("script")[0];
    insertAt.parentNode.insertBefore(script, insertAt);
    this.script = script;
    if(indicator) {
      setTimeout(function() {
        var iframe = document.createElement("iframe");
        document.body.appendChild(iframe);
        document.body.removeChild(iframe)
      }, 100)
    }
  };
  JSONPPolling.prototype._ = function(msg) {
    this.onData(msg);
    if(this.open) {
      this.get()
    }
    return this
  };
  JSONPPolling.prototype.ready = function(socket, fn) {
    var self = this;
    if(!indicator) {
      return fn.call(this)
    }
    io.util.load(function() {
      fn.call(self)
    })
  };
  JSONPPolling.check = function() {
    return"document" in global
  };
  JSONPPolling.xdomainCheck = function() {
    return true
  };
  io.transports.push("jsonp-polling")
})("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this);
var Erizo = Erizo || {};
Erizo.EventDispatcher = function(spec) {
  var that = {};
  spec.dispatcher = {};
  spec.dispatcher.eventListeners = {};
  that.addEventListener = function(eventType, listener) {
    if(spec.dispatcher.eventListeners[eventType] === undefined) {
      spec.dispatcher.eventListeners[eventType] = []
    }
    spec.dispatcher.eventListeners[eventType].push(listener)
  };
  that.removeEventListener = function(eventType, listener) {
    var index;
    index = spec.dispatcher.eventListeners[eventType].indexOf(listener);
    if(index !== -1) {
      spec.dispatcher.eventListeners[eventType].splice(index, 1)
    }
  };
  that.dispatchEvent = function(event) {
    var listener;
    L.Logger.debug("Event: " + event.type);
    for(listener in spec.dispatcher.eventListeners[event.type]) {
      if(spec.dispatcher.eventListeners[event.type].hasOwnProperty(listener)) {
        spec.dispatcher.eventListeners[event.type][listener](event)
      }
    }
  };
  return that
};
Erizo.LicodeEvent = function(spec) {
  var that = {};
  that.type = spec.type;
  return that
};
Erizo.RoomEvent = function(spec) {
  var that = Erizo.LicodeEvent(spec);
  that.streams = spec.streams;
  return that
};
Erizo.StreamEvent = function(spec) {
  var that = Erizo.LicodeEvent(spec);
  that.stream = spec.stream;
  that.msg = spec.msg;
  return that
};
Erizo.PublisherEvent = function(spec) {
  var that = Erizo.LicodeEvent(spec);
  return that
};
var Erizo = Erizo || {};
Erizo.FcStack = function(spec) {
  var that = {};
  that.addStream = function(stream) {
  };
  return that
};
var Erizo = Erizo || {};
Erizo.BowserStack = function(spec) {
  var that = {}, WebkitRTCPeerConnection = webkitRTCPeerConnection;
  that.pc_config = {"iceServers":[]};
  that.con = {"optional":[{"DtlsSrtpKeyAgreement":true}]};
  if(spec.stunServerUrl !== undefined) {
    that.pc_config.iceServers.push({"url":spec.stunServerUrl})
  }
  if((spec.turnServer || {}).url) {
    that.pc_config.iceServers.push({"username":spec.turnServer.username, "credential":spec.turnServer.password, "url":spec.turnServer.url})
  }
  if(spec.audio === undefined) {
    spec.audio = true
  }
  if(spec.video === undefined) {
    spec.video = true
  }
  that.mediaConstraints = {"offerToReceiveVideo":spec.video, "offerToReceiveAudio":spec.audio};
  that.peerConnection = new WebkitRTCPeerConnection(that.pc_config, that.con);
  spec.remoteDescriptionSet = false;
  var setMaxBW = function(sdp) {
    if(spec.maxVideoBW) {
      var a = sdp.match(/m=video.*\r\n/);
      if(a == null) {
        a = sdp.match(/m=video.*\n/)
      }
      if(a && a.length > 0) {
        var r = a[0] + "b=AS:" + spec.maxVideoBW + "\r\n";
        sdp = sdp.replace(a[0], r)
      }
    }
    if(spec.maxAudioBW) {
      var a = sdp.match(/m=audio.*\r\n/);
      if(a == null) {
        a = sdp.match(/m=audio.*\n/)
      }
      if(a && a.length > 0) {
        var r = a[0] + "b=AS:" + spec.maxAudioBW + "\r\n";
        sdp = sdp.replace(a[0], r)
      }
    }
    return sdp
  };
  that.close = function() {
    that.state = "closed";
    that.peerConnection.close()
  };
  spec.localCandidates = [];
  that.peerConnection.onicecandidate = function(event) {
    if(event.candidate) {
      if(!event.candidate.candidate.match(/a=/)) {
        event.candidate.candidate = "a=" + event.candidate.candidate
      }
      if(spec.remoteDescriptionSet) {
        spec.callback({type:"candidate", candidate:event.candidate})
      }else {
        spec.localCandidates.push(event.candidate)
      }
    }else {
      console.log("End of candidates.", that.peerConnection.localDescription)
    }
  };
  that.peerConnection.onaddstream = function(stream) {
    if(that.onaddstream) {
      that.onaddstream(stream)
    }
  };
  that.peerConnection.onremovestream = function(stream) {
    if(that.onremovestream) {
      that.onremovestream(stream)
    }
  };
  var errorCallback = function(message) {
    console.log("Error in Stack ", message)
  };
  var localDesc;
  var setLocalDesc = function(sessionDescription) {
    sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
    console.log("Set local description", sessionDescription.sdp);
    localDesc = sessionDescription;
    that.peerConnection.setLocalDescription(localDesc, function() {
      console.log("The final LocalDesc", that.peerConnection.localDescription);
      spec.callback(that.peerConnection.localDescription)
    }, errorCallback)
  };
  var setLocalDescp2p = function(sessionDescription) {
    sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
    spec.callback(sessionDescription);
    localDesc = sessionDescription;
    that.peerConnection.setLocalDescription(sessionDescription)
  };
  that.createOffer = function(isSubscribe) {
    if(isSubscribe === true) {
      that.peerConnection.createOffer(setLocalDesc, errorCallback, that.mediaConstraints)
    }else {
      that.peerConnection.createOffer(setLocalDesc, errorCallback)
    }
  };
  that.addStream = function(stream) {
    that.peerConnection.addStream(stream)
  };
  spec.remoteCandidates = [];
  that.processSignalingMessage = function(msg) {
    console.log("Process Signaling Message", msg);
    if(msg.type === "offer") {
      msg.sdp = setMaxBW(msg.sdp);
      that.peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
      that.peerConnection.createAnswer(setLocalDescp2p, null, that.mediaConstraints);
      spec.remoteDescriptionSet = true
    }else {
      if(msg.type === "answer") {
        console.log("Set remote description", msg.sdp);
        msg.sdp = setMaxBW(msg.sdp);
        that.peerConnection.setRemoteDescription(new RTCSessionDescription(msg), function() {
          spec.remoteDescriptionSet = true;
          console.log("Candidates to be added: ", spec.remoteCandidates.length);
          while(spec.remoteCandidates.length > 0) {
            console.log("Candidate :", spec.remoteCandidates[spec.remoteCandidates.length - 1]);
            that.peerConnection.addIceCandidate(spec.remoteCandidates.shift(), function() {
            }, errorCallback)
          }
          while(spec.localCandidates.length > 0) {
            spec.callback({type:"candidate", candidate:spec.localCandidates.shift()})
          }
        }, function() {
          console.log("Error Setting Remote Description")
        })
      }else {
        if(msg.type === "candidate") {
          console.log("Message with candidate");
          try {
            var obj;
            if(typeof msg.candidate === "object") {
              obj = msg.candidate
            }else {
              obj = JSON.parse(msg.candidate)
            }
            obj.candidate = obj.candidate.replace(/a=/g, "");
            obj.sdpMLineIndex = parseInt(obj.sdpMLineIndex);
            obj.sdpMLineIndex = obj.sdpMid == "audio" ? 0 : 1;
            var candidate = new RTCIceCandidate(obj);
            console.log("Remote Candidate", candidate);
            if(spec.remoteDescriptionSet) {
              that.peerConnection.addIceCandidate(candidate, function() {
              }, errorCallback)
            }else {
              spec.remoteCandidates.push(candidate)
            }
          }catch(e) {
            L.Logger.error("Error parsing candidate", msg.candidate)
          }
        }
      }
    }
  };
  return that
};
var Erizo = Erizo || {};
Erizo.FirefoxStack = function(spec) {
  var that = {}, WebkitRTCPeerConnection = mozRTCPeerConnection, RTCSessionDescription = mozRTCSessionDescription, RTCIceCandidate = mozRTCIceCandidate;
  var hasStream = false;
  that.pc_config = {"iceServers":[]};
  if(spec.stunServerUrl !== undefined) {
    that.pc_config.iceServers.push({"url":spec.stunServerUrl})
  }
  if((spec.turnServer || {}).url) {
    that.pc_config.iceServers.push({"username":spec.turnServer.username, "credential":spec.turnServer.password, "url":spec.turnServer.url})
  }
  if(spec.audio === undefined) {
    spec.audio = true
  }
  if(spec.video === undefined) {
    spec.video = true
  }
  that.mediaConstraints = {offerToReceiveAudio:spec.audio, offerToReceiveVideo:spec.video, mozDontOfferDataChannel:true};
  that.roapSessionId = 103;
  that.peerConnection = new WebkitRTCPeerConnection(that.pc_config, that.con);
  spec.localCandidates = [];
  that.peerConnection.onicecandidate = function(event) {
    if(event.candidate) {
      if(!event.candidate.candidate.match(/a=/)) {
        event.candidate.candidate = "a=" + event.candidate.candidate
      }
      if(spec.remoteDescriptionSet) {
        spec.callback({type:"candidate", candidate:event.candidate})
      }else {
        spec.localCandidates.push(event.candidate);
        console.log("Local Candidates stored: ", spec.localCandidates.length, spec.localCandidates)
      }
    }else {
      console.log("End of candidates.")
    }
  };
  that.peerConnection.onaddstream = function(stream) {
    if(that.onaddstream) {
      that.onaddstream(stream)
    }
  };
  that.peerConnection.onremovestream = function(stream) {
    if(that.onremovestream) {
      that.onremovestream(stream)
    }
  };
  var setMaxBW = function(sdp) {
    if(spec.video && spec.maxVideoBW) {
      var a = sdp.match(/m=video.*\r\n/);
      if(a == null) {
        a = sdp.match(/m=video.*\n/)
      }
      if(a && a.length > 0) {
        var r = a[0] + "b=AS:" + spec.maxVideoBW + "\r\n";
        sdp = sdp.replace(a[0], r)
      }
    }
    if(spec.audio && spec.maxAudioBW) {
      var a = sdp.match(/m=audio.*\r\n/);
      if(a == null) {
        a = sdp.match(/m=audio.*\n/)
      }
      if(a && a.length > 0) {
        var r = a[0] + "b=AS:" + spec.maxAudioBW + "\r\n";
        sdp = sdp.replace(a[0], r)
      }
    }
    return sdp
  };
  var localDesc;
  var setLocalDesc = function(sessionDescription) {
    sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
    sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, "");
    sessionDescription = changeOrder(sessionDescription);
    spec.callback(sessionDescription);
    localDesc = sessionDescription
  };
  var changeOrder = function(sessionDescription) {
    var matches = sessionDescription.sdp.match(/^.*(rtcp-fb).*$/gm);
    var lines = "";
    for(var i in matches) {
      if(i == 0) {
        lines += matches[i]
      }else {
        lines += "\n\r" + matches[i]
      }
    }
    sessionDescription.sdp = sessionDescription.sdp.replace(/^.*(rtcp-fb).*$\r\n/gm, "");
    sessionDescription.sdp += lines;
    return sessionDescription
  };
  var setLocalDescp2p = function(sessionDescription) {
    sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
    sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, "");
    spec.callback(sessionDescription);
    localDesc = sessionDescription;
    that.peerConnection.setLocalDescription(localDesc)
  };
  that.createOffer = function() {
    that.peerConnection.createOffer(setLocalDesc, function(error) {
      L.Logger.error("Error", error)
    }, that.mediaConstraints)
  };
  that.addStream = function(stream) {
    that.peerConnection.addStream(stream)
  };
  spec.remoteCandidates = [];
  spec.remoteDescriptionSet = false;
  that.close = function() {
    that.state = "closed";
    that.peerConnection.close()
  };
  that.processSignalingMessage = function(msg) {
    if(msg.type === "offer") {
      msg.sdp = setMaxBW(msg.sdp);
      that.peerConnection.setRemoteDescription(new RTCSessionDescription(msg), function() {
        that.peerConnection.createAnswer(setLocalDescp2p, function(error) {
          L.Logger.error("Error", error)
        }, that.mediaConstraints);
        spec.remoteDescriptionSet = true
      }, function(error) {
        L.Logger.error("Error setting Remote Description", error)
      })
    }else {
      if(msg.type === "answer") {
        console.log("Set remote and local description", msg.sdp);
        msg.sdp = setMaxBW(msg.sdp);
        that.peerConnection.setLocalDescription(localDesc, function() {
          that.peerConnection.setRemoteDescription(new RTCSessionDescription(msg), function() {
            spec.remoteDescriptionSet = true;
            while(spec.remoteCandidates.length > 0) {
              that.peerConnection.addIceCandidate(spec.remoteCandidates.shift())
            }
            while(spec.localCandidates.length > 0) {
              L.Logger.info("Sending Candidate");
              spec.callback({type:"candidate", candidate:spec.localCandidates.shift()})
            }
          }, function(error) {
            L.Logger.error("Error Setting Remote Description", error)
          })
        }, function(error) {
          L.Logger.error("Failure setting Local Description", error)
        })
      }else {
        if(msg.type === "candidate") {
          try {
            var obj;
            if(typeof msg.candidate === "object") {
              obj = msg.candidate
            }else {
              obj = JSON.parse(msg.candidate)
            }
            obj.candidate = obj.candidate.replace(/ generation 0/g, "");
            obj.candidate = obj.candidate.replace(/ udp /g, " UDP ");
            obj.sdpMLineIndex = parseInt(obj.sdpMLineIndex);
            var candidate = new RTCIceCandidate(obj);
            if(spec.remoteDescriptionSet) {
              that.peerConnection.addIceCandidate(candidate)
            }else {
              spec.remoteCandidates.push(candidate)
            }
          }catch(e) {
            L.Logger.error("Error parsing candidate", msg.candidate, e)
          }
        }
      }
    }
  };
  return that
};
var Erizo = Erizo || {};
Erizo.ChromeStableStack = function(spec) {
  var that = {}, WebkitRTCPeerConnection = webkitRTCPeerConnection;
  that.pc_config = {"iceServers":[]};
  that.con = {"optional":[{"DtlsSrtpKeyAgreement":true}]};
  if(spec.stunServerUrl !== undefined) {
    that.pc_config.iceServers.push({"url":spec.stunServerUrl})
  }
  if((spec.turnServer || {}).url) {
    that.pc_config.iceServers.push({"username":spec.turnServer.username, "credential":spec.turnServer.password, "url":spec.turnServer.url})
  }
  if(spec.audio === undefined) {
    spec.audio = true
  }
  if(spec.video === undefined) {
    spec.video = true
  }
  that.mediaConstraints = {mandatory:{"OfferToReceiveVideo":spec.video, "OfferToReceiveAudio":spec.audio}};
  var errorCallback = function(message) {
    console.log("Error in Stack ", message)
  };
  that.peerConnection = new WebkitRTCPeerConnection(that.pc_config, that.con);
  var setMaxBW = function(sdp) {

    /* remb */
    console.log("Removing REMB!");
    var a = sdp.match(/a=rtcp-fb:100 goog-remb\r\n/);
    if(a === null) {
      a = sdp.match(/a=rtcp-fb:100 goog-remb\n/)
    }
    if(a) {
      sdp = sdp.replace(a[0], "")
    }
    /* remb */

    if(spec.video && spec.maxVideoBW) {
      sdp = sdp.replace(/b=AS:.*\r\n/g, "");
      var a = sdp.match(/m=video.*\r\n/);
      if(a == null) {
        a = sdp.match(/m=video.*\n/)
      }
      if(a && a.length > 0) {
        var r = a[0] + "b=AS:" + spec.maxVideoBW + "\r\n";
        sdp = sdp.replace(a[0], r)
      }
    }
    if(spec.audio && spec.maxAudioBW) {
      var a = sdp.match(/m=audio.*\r\n/);
      if(a == null) {
        a = sdp.match(/m=audio.*\n/)
      }
      if(a && a.length > 0) {
        var r = a[0] + "b=AS:" + spec.maxAudioBW + "\r\n";
        sdp = sdp.replace(a[0], r)
      }
    }
    return sdp
  };
  that.close = function() {
    that.state = "closed";
    that.peerConnection.close()
  };
  spec.localCandidates = [];
  that.peerConnection.onicecandidate = function(event) {
    if(event.candidate) {
      if(!event.candidate.candidate.match(/a=/)) {
        event.candidate.candidate = "a=" + event.candidate.candidate
      }
      var candidateObject = {sdpMLineIndex:event.candidate.sdpMLineIndex, sdpMid:event.candidate.sdpMid, candidate:event.candidate.candidate};
      if(spec.remoteDescriptionSet) {
        spec.callback({type:"candidate", candidate:candidateObject})
      }else {
        spec.localCandidates.push(candidateObject);
        console.log("Local Candidates stored: ", spec.localCandidates.length, spec.localCandidates)
      }
    }else {
      console.log("End of candidates.")
    }
  };
  that.peerConnection.onaddstream = function(stream) {
    if(that.onaddstream) {
      that.onaddstream(stream)
    }
  };
  that.peerConnection.onremovestream = function(stream) {
    if(that.onremovestream) {
      that.onremovestream(stream)
    }
  };
  var localDesc;
  var remoteDesc;
  var setLocalDesc = function(sessionDescription) {
    sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
    sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, "");
    spec.callback({type:sessionDescription.type, sdp:sessionDescription.sdp});
    localDesc = sessionDescription
  };
  var setLocalDescp2p = function(sessionDescription) {
    sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
    sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, "");
    spec.callback({type:sessionDescription.type, sdp:sessionDescription.sdp});
    localDesc = sessionDescription;
    that.peerConnection.setLocalDescription(sessionDescription)
  };
  that.updateSpec = function(config, callback) {
    if(config.maxVideoBW || config.maxAudioBW) {
      if(config.maxVideoBW) {
        console.log("Maxvideo Requested", config.maxVideoBW, "limit", spec.limitMaxVideoBW);
        if(config.maxVideoBW > spec.limitMaxVideoBW) {
          config.maxVideoBW = spec.limitMaxVideoBW
        }
        spec.maxVideoBW = config.maxVideoBW;
        console.log("Result", spec.maxVideoBW)
      }
      if(config.maxAudioBW) {
        if(config.maxAudioBW > spec.limitMaxAudioBW) {
          config.maxAudioBW = spec.limitMaxAudioBW
        }
        spec.maxAudioBW = config.maxAudioBW
      }
      localDesc.sdp = setMaxBW(localDesc.sdp);
      that.peerConnection.setLocalDescription(localDesc, function() {
        remoteDesc.sdp = setMaxBW(remoteDesc.sdp);
        that.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc), function() {
          spec.remoteDescriptionSet = true;
          if(callback) {
            callback("success")
          }
        })
      })
    }
  };
  that.createOffer = function(isSubscribe) {
    if(isSubscribe === true) {
      that.peerConnection.createOffer(setLocalDesc, errorCallback, that.mediaConstraints)
    }else {
      that.peerConnection.createOffer(setLocalDesc, errorCallback)
    }
  };
  that.addStream = function(stream) {
    that.peerConnection.addStream(stream)
  };
  spec.remoteCandidates = [];
  spec.remoteDescriptionSet = false;
  that.processSignalingMessage = function(msg) {
    if(msg.type === "offer") {
      msg.sdp = setMaxBW(msg.sdp);
      that.peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
      that.peerConnection.createAnswer(setLocalDescp2p, null, that.mediaConstraints);
      spec.remoteDescriptionSet = true
    }else {
      if(msg.type === "answer") {
        console.log("Set remote and local description", msg.sdp);
        msg.sdp = setMaxBW(msg.sdp);
        remoteDesc = msg;
        that.peerConnection.setLocalDescription(localDesc, function() {
          that.peerConnection.setRemoteDescription(new RTCSessionDescription(msg), function() {
            spec.remoteDescriptionSet = true;
            console.log("Candidates to be added: ", spec.remoteCandidates.length, spec.remoteCandidates);
            while(spec.remoteCandidates.length > 0) {
              that.peerConnection.addIceCandidate(spec.remoteCandidates.shift())
            }
            console.log("Local candidates to send:", spec.localCandidates.length);
            while(spec.localCandidates.length > 0) {
              spec.callback({type:"candidate", candidate:spec.localCandidates.shift()})
            }
          })
        })
      }else {
        if(msg.type === "candidate") {
          try {
            var obj;
            if(typeof msg.candidate === "object") {
              obj = msg.candidate
            }else {
              obj = JSON.parse(msg.candidate)
            }
            obj.candidate = obj.candidate.replace(/a=/g, "");
            obj.sdpMLineIndex = parseInt(obj.sdpMLineIndex);
            var candidate = new RTCIceCandidate(obj);
            if(spec.remoteDescriptionSet) {
              that.peerConnection.addIceCandidate(candidate)
            }else {
              spec.remoteCandidates.push(candidate)
            }
          }catch(e) {
            L.Logger.error("Error parsing candidate", msg.candidate)
          }
        }
      }
    }
  };
  return that
};
var Erizo = Erizo || {};
Erizo.ChromeCanaryStack = function(spec) {
  var that = {}, WebkitRTCPeerConnection = webkitRTCPeerConnection;
  that.pc_config = {"iceServers":[]};
  that.con = {"optional":[{"DtlsSrtpKeyAgreement":true}]};
  if(spec.stunServerUrl !== undefined) {
    that.pc_config.iceServers.push({"url":spec.stunServerUrl})
  }
  if((spec.turnServer || {}).url) {
    that.pc_config.iceServers.push({"username":spec.turnServer.username, "credential":spec.turnServer.password, "url":spec.turnServer.url})
  }
  if(spec.audio === undefined || spec.nop2p) {
    spec.audio = true
  }
  if(spec.video === undefined || spec.nop2p) {
    spec.video = true
  }
  that.mediaConstraints = {"mandatory":{"OfferToReceiveVideo":spec.video, "OfferToReceiveAudio":spec.audio}};
  that.roapSessionId = 103;
  that.peerConnection = new WebkitRTCPeerConnection(that.pc_config, that.con);
  that.peerConnection.onicecandidate = function(event) {
    L.Logger.debug("PeerConnection: ", spec.session_id);
    if(!event.candidate) {
      L.Logger.debug("State: " + that.peerConnection.iceGatheringState);
      if(that.ices === undefined) {
        that.ices = 0
      }
      that.ices = that.ices + 1;
      if(that.ices >= 1 && that.moreIceComing) {
        that.moreIceComing = false;
        that.markActionNeeded()
      }
    }else {
      that.iceCandidateCount += 1
    }
  };
  var setMaxBW = function(sdp) {
    console.log("Removing REMB!");
    var a = sdp.match(/a=rtcp-fb:100 goog-remb\r\n/);
    if(a === null) {
      a = sdp.match(/a=rtcp-fb:100 goog-remb\n/)
    }
    if(a) {
      sdp = sdp.replace(a[0], "")
    }
    if(spec.maxVideoBW) {
      var a = sdp.match(/m=video.*\r\n/);
      if(a && a.length > 0) {
        var r = a[0] + "b=AS:" + spec.maxVideoBW + "\r\n";
        sdp = sdp.replace(a[0], r)
      }
    }
    if(spec.maxAudioBW) {
      var a = sdp.match(/m=audio.*\r\n/);
      if(a && a.length > 0) {
        var r = a[0] + "b=AS:" + spec.maxAudioBW + "\r\n";
        sdp = sdp.replace(a[0], r)
      }
    }
    return sdp
  };
  that.processSignalingMessage = function(msgstring) {
    L.Logger.debug("Activity on conn " + that.sessionId);
    var msg = JSON.parse(msgstring), sd, regExp, exp;
    that.incomingMessage = msg;
    if(that.state === "new") {
      if(msg.messageType === "OFFER") {
        sd = {sdp:msg.sdp, type:"offer"};
        that.peerConnection.setRemoteDescription(new RTCSessionDescription(sd));
        that.state = "offer-received";
        that.markActionNeeded()
      }else {
        that.error("Illegal message for this state: " + msg.messageType + " in state " + that.state)
      }
    }else {
      if(that.state === "offer-sent") {
        if(msg.messageType === "ANSWER") {
          sd = {sdp:msg.sdp, type:"answer"};
          L.Logger.debug("Received ANSWER: ", sd.sdp);
          sd.sdp = setMaxBW(sd.sdp);
          that.peerConnection.setRemoteDescription(new RTCSessionDescription(sd));
          that.sendOK();
          that.state = "established"
        }else {
          if(msg.messageType === "pr-answer") {
            sd = {sdp:msg.sdp, type:"pr-answer"};
            that.peerConnection.setRemoteDescription(new RTCSessionDescription(sd))
          }else {
            if(msg.messageType === "offer") {
              that.error("Not written yet")
            }else {
              that.error("Illegal message for this state: " + msg.messageType + " in state " + that.state)
            }
          }
        }
      }else {
        if(that.state === "established") {
          if(msg.messageType === "OFFER") {
            sd = {sdp:msg.sdp, type:"offer"};
            that.peerConnection.setRemoteDescription(new RTCSessionDescription(sd));
            that.state = "offer-received";
            that.markActionNeeded()
          }else {
            that.error("Illegal message for this state: " + msg.messageType + " in state " + that.state)
          }
        }
      }
    }
  };
  that.addStream = function(stream) {
    that.peerConnection.addStream(stream);
    that.markActionNeeded()
  };
  that.removeStream = function(stream) {
    that.markActionNeeded()
  };
  that.close = function() {
    that.state = "closed";
    that.peerConnection.close()
  };
  that.markActionNeeded = function() {
    that.actionNeeded = true;
    that.doLater(function() {
      that.onstablestate()
    })
  };
  that.doLater = function(what) {
    window.setTimeout(what, 1)
  };
  that.onstablestate = function() {
    var mySDP, roapMessage = {};
    if(that.actionNeeded) {
      if(that.state === "new" || that.state === "established") {
        that.peerConnection.createOffer(function(sessionDescription) {
          sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
          L.Logger.debug("Changed", sessionDescription.sdp);
          var newOffer = sessionDescription.sdp;
          if(newOffer !== that.prevOffer) {
            that.peerConnection.setLocalDescription(sessionDescription);
            that.state = "preparing-offer";
            that.markActionNeeded();
            return
          }else {
            L.Logger.debug("Not sending a new offer")
          }
        }, null, that.mediaConstraints)
      }else {
        if(that.state === "preparing-offer") {
          if(that.moreIceComing) {
            return
          }
          that.prevOffer = that.peerConnection.localDescription.sdp;
          L.Logger.debug("Sending OFFER: " + that.prevOffer);
          that.sendMessage("OFFER", that.prevOffer);
          that.state = "offer-sent"
        }else {
          if(that.state === "offer-received") {
            that.peerConnection.createAnswer(function(sessionDescription) {
              that.peerConnection.setLocalDescription(sessionDescription);
              that.state = "offer-received-preparing-answer";
              if(!that.iceStarted) {
                var now = new Date;
                L.Logger.debug(now.getTime() + ": Starting ICE in responder");
                that.iceStarted = true
              }else {
                that.markActionNeeded();
                return
              }
            }, null, that.mediaConstraints)
          }else {
            if(that.state === "offer-received-preparing-answer") {
              if(that.moreIceComing) {
                return
              }
              mySDP = that.peerConnection.localDescription.sdp;
              that.sendMessage("ANSWER", mySDP);
              that.state = "established"
            }else {
              that.error("Dazed and confused in state " + that.state + ", stopping here")
            }
          }
        }
      }
      that.actionNeeded = false
    }
  };
  that.sendOK = function() {
    that.sendMessage("OK")
  };
  that.sendMessage = function(operation, sdp) {
    var roapMessage = {};
    roapMessage.messageType = operation;
    roapMessage.sdp = sdp;
    if(operation === "OFFER") {
      roapMessage.offererSessionId = that.sessionId;
      roapMessage.answererSessionId = that.otherSessionId;
      roapMessage.seq = that.sequenceNumber += 1;
      roapMessage.tiebreaker = Math.floor(Math.random() * 429496723 + 1)
    }else {
      roapMessage.offererSessionId = that.incomingMessage.offererSessionId;
      roapMessage.answererSessionId = that.sessionId;
      roapMessage.seq = that.incomingMessage.seq
    }
    that.onsignalingmessage(JSON.stringify(roapMessage))
  };
  that.error = function(text) {
    throw"Error in RoapOnJsep: " + text;
  };
  that.sessionId = that.roapSessionId += 1;
  that.sequenceNumber = 0;
  that.actionNeeded = false;
  that.iceStarted = false;
  that.moreIceComing = true;
  that.iceCandidateCount = 0;
  that.onsignalingmessage = spec.callback;
  that.peerConnection.onopen = function() {
    if(that.onopen) {
      that.onopen()
    }
  };
  that.peerConnection.onaddstream = function(stream) {
    if(that.onaddstream) {
      that.onaddstream(stream)
    }
  };
  that.peerConnection.onremovestream = function(stream) {
    if(that.onremovestream) {
      that.onremovestream(stream)
    }
  };
  that.peerConnection.oniceconnectionstatechange = function(e) {
    if(that.oniceconnectionstatechange) {
      that.oniceconnectionstatechange(e.currentTarget.iceConnectionState)
    }
  };
  that.onaddstream = null;
  that.onremovestream = null;
  that.state = "new";
  that.markActionNeeded();
  return that
};
var Erizo = Erizo || {};
Erizo.sessionId = 103;
Erizo.Connection = function(spec) {
  var that = {};
  spec.session_id = Erizo.sessionId += 1;
  that.browser = Erizo.getBrowser();
  if(typeof module !== "undefined" && module.exports) {
    L.Logger.error("Publish/subscribe video/audio streams not supported in erizofc yet");
    that = Erizo.FcStack(spec)
  }else {
    if(that.browser === "mozilla") {
      L.Logger.debug("Firefox Stack");
      that = Erizo.FirefoxStack(spec)
    }else {
      if(that.browser === "bowser") {
        L.Logger.debug("Bowser Stack");
        that = Erizo.BowserStack(spec)
      }else {
        if(that.browser === "chrome-stable") {
          L.Logger.debug("Stable!");
          that = Erizo.ChromeStableStack(spec)
        }else {
          L.Logger.debug("None!");
          throw"WebRTC stack not available";
        }
      }
    }
  }
  if(!that.updateSpec) {
    that.updateSpec = function(newSpec, callback) {
      L.Logger.error("Update Configuration not implemented in this browser");
      if(callback) {
        callback("unimplemented")
      }
    }
  }
  return that
};
Erizo.getBrowser = function() {
  var browser = "none";
  if(window.navigator.userAgent.match("Firefox") !== null) {
    browser = "mozilla"
  }else {
    if(window.navigator.userAgent.match("Bowser") !== null) {
      browser = "bowser"
    }else {
      if(window.navigator.userAgent.match("Chrome") !== null) {
        if(window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] >= 26) {
          browser = "chrome-stable"
        }
      }else {
        if(window.navigator.userAgent.match("Safari") !== null) {
          browser = "bowser"
        }else {
          if(window.navigator.userAgent.match("AppleWebKit") !== null) {
            browser = "bowser"
          }
        }
      }
    }
  }
  return browser
};
Erizo.GetUserMedia = function(config, callback, error) {
  navigator.getMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
  if(config.screen) {
    L.Logger.debug("Screen access requested");
    switch(Erizo.getBrowser()) {
      case "mozilla":
        L.Logger.debug("Screen sharing in Firefox");
        var theConfig = {};
        if(config.video != undefined) {
          theConfig.video = config.video;
          theConfig.video.mediaSource = "window" || "screen"
        }else {
          theConfig = {video:{mediaSource:"window" || "screen"}}
        }
        navigator.getMedia(theConfig, callback, error);
        break;
      case "chrome-stable":
        L.Logger.debug("Screen sharing in Chrome");
        var extensionId = "okeephmleflklcdebijnponpabbmmgeo";
        if(config.extensionId) {
          L.Logger.debug("extensionId supplied, using " + config.extensionId);
          extensionId = config.extensionId
        }
        L.Logger.debug("Screen access on chrome stable, looking for extension");
        try {
          chrome.runtime.sendMessage(extensionId, {getStream:true}, function(response) {
            var theConfig = {};
            if(response == undefined) {
              L.Logger.debug("Access to screen denied");
              var theError = {code:"Access to screen denied"};
              error(theError);
              return
            }
            var theId = response.streamId;
            if(config.video.mandatory != undefined) {
              theConfig.video = config.video;
              theConfig.video.mandatory.chromeMediaSource = "desktop";
              theConfig.video.mandatory.chromeMediaSourceId = theId
            }else {
              theConfig = {video:{mandatory:{chromeMediaSource:"desktop", chromeMediaSourceId:theId}}}
            }
            navigator.getMedia(theConfig, callback, error)
          })
        }catch(e) {
          L.Logger.debug("Lynckia screensharing plugin is not accessible ");
          var theError = {code:"no_plugin_present"};
          error(theError);
          return
        }
        break;
      default:
        L.Logger.debug("This browser does not support screenSharing")
    }
  }else {
    if(typeof module !== "undefined" && module.exports) {
      L.Logger.error("Video/audio streams not supported in erizofc yet")
    }else {
      navigator.getMedia(config, callback, error)
    }
  }
};
var Erizo = Erizo || {};
Erizo.Stream = function(spec) {
  var that = Erizo.EventDispatcher(spec), getFrame;
  that.stream = spec.stream;
  that.url = spec.url;
  that.recording = spec.recording;
  that.room = undefined;
  that.showing = false;
  that.local = false;
  that.video = spec.video;
  that.audio = spec.audio;
  that.screen = spec.screen;
  that.videoSize = spec.videoSize;
  that.videoOptions = spec.videoOptions || {mandatory:{}, optional:[]};
  that.extensionId = spec.extensionId;
  if(that.videoSize !== undefined && (!(that.videoSize instanceof Array) || that.videoSize.length != 4)) {
    throw Error("Invalid Video Size");
  }
  if(spec.local === undefined || spec.local === true) {
    that.local = true
  }
  that.getID = function() {
    return spec.streamID
  };
  that.getAttributes = function() {
    return spec.attributes
  };
  that.setAttributes = function(attrs) {
    L.Logger.error("Failed to set attributes data. This Stream object has not been published.")
  };
  that.updateLocalAttributes = function(attrs) {
    spec.attributes = attrs
  };
  that.hasAudio = function() {
    return spec.audio
  };
  that.hasVideo = function() {
    return spec.video
  };
  that.hasData = function() {
    return spec.data
  };
  that.hasScreen = function() {
    return spec.screen
  };
  that.sendData = function(msg) {
    L.Logger.error("Failed to send data. This Stream object has not that channel enabled.")
  };
  that.init = function() {
    try {
      if((spec.audio || spec.video || spec.screen) && spec.url === undefined) {
        L.Logger.debug("Requested access to local media");
        if(spec.video == true) {
          if(that.videoSize !== undefined) {
            that.videoOptions.mandatory.minWidth = that.videoSize[0];
            that.videoOptions.mandatory.minHeight = that.videoSize[1];
            that.videoOptions.mandatory.maxWidth = that.videoSize[2];
            that.videoOptions.mandatory.maxHeight = that.videoSize[3]
          }
        }
        var opt = {video:that.videoOptions, audio:spec.audio, fake:spec.fake, screen:spec.screen, extensionId:that.extensionId};
        L.Logger.debug(opt);
        Erizo.GetUserMedia(opt, function(stream) {
          L.Logger.info("User has granted access to local media.");
          that.stream = stream;
          var streamEvent = Erizo.StreamEvent({type:"access-accepted"});
          that.dispatchEvent(streamEvent)
        }, function(error) {
          L.Logger.error("Failed to get access to local media. Error code was " + error.code + ".");
          var streamEvent = Erizo.StreamEvent({type:"access-denied"});
          that.dispatchEvent(streamEvent)
        })
      }else {
        var streamEvent = Erizo.StreamEvent({type:"access-accepted"});
        that.dispatchEvent(streamEvent)
      }
    }catch(e) {
      L.Logger.error("Error accessing to local media", e)
    }
  };
  that.close = function() {
    if(that.local) {
      if(that.room !== undefined) {
        that.room.unpublish(that)
      }
      that.hide();
      if(that.stream !== undefined) {
        that.stream.stop()
      }
      that.stream = undefined
    }
  };
  that.play = function(elementID, options) {
    options = options || {};
    that.elementID = elementID;
    if(that.hasVideo() || this.hasScreen()) {
      if(elementID !== undefined) {
        var player = new Erizo.VideoPlayer({id:that.getID(), stream:that, elementID:elementID, options:options});
        that.player = player;
        that.showing = true
      }
    }else {
      if(that.hasAudio) {
        var player = new Erizo.AudioPlayer({id:that.getID(), stream:that, elementID:elementID, options:options});
        that.player = player;
        that.showing = true
      }
    }
  };
  that.stop = function() {
    if(that.showing) {
      if(that.player !== undefined) {
        that.player.destroy();
        that.showing = false
      }
    }
  };
  that.show = that.play;
  that.hide = that.stop;
  getFrame = function() {
    if(that.player !== undefined && that.stream !== undefined) {
      var video = that.player.video, style = document.defaultView.getComputedStyle(video), width = parseInt(style.getPropertyValue("width"), 10), height = parseInt(style.getPropertyValue("height"), 10), left = parseInt(style.getPropertyValue("left"), 10), top = parseInt(style.getPropertyValue("top"), 10), div = document.getElementById(that.elementID), divStyle = document.defaultView.getComputedStyle(div), divWidth = parseInt(divStyle.getPropertyValue("width"), 10), divHeight = parseInt(divStyle.getPropertyValue("height"), 
      10), canvas = document.createElement("canvas"), context;
      canvas.id = "testing";
      canvas.width = divWidth;
      canvas.height = divHeight;
      canvas.setAttribute("style", "display: none");
      context = canvas.getContext("2d");
      context.drawImage(video, left, top, width, height);
      return canvas
    }else {
      return null
    }
  };
  that.getVideoFrameURL = function(format) {
    var canvas = getFrame();
    if(canvas !== null) {
      if(format) {
        return canvas.toDataURL(format)
      }else {
        return canvas.toDataURL()
      }
    }else {
      return null
    }
  };
  that.getVideoFrame = function() {
    var canvas = getFrame();
    if(canvas !== null) {
      return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
    }else {
      return null
    }
  };
  that.updateConfiguration = function(config, callback) {
    if(config === undefined) {
      return
    }
    if(that.pc) {
      that.pc.updateSpec(config, callback)
    }else {
      return"This stream has not been published, ignoring"
    }
  };
  return that
};
var Erizo = Erizo || {};
Erizo.Room = function(spec) {
  var that = Erizo.EventDispatcher(spec), connectSocket, sendMessageSocket, sendSDPSocket, sendDataSocket, updateAttributes, removeStream, DISCONNECTED = 0, CONNECTING = 1, CONNECTED = 2;
  that.remoteStreams = {};
  that.localStreams = {};
  that.roomID = "";
  that.socket = {};
  that.state = DISCONNECTED;
  that.p2p = false;
  that.addEventListener("room-disconnected", function(evt) {
    var index, stream, evt2;
    that.state = DISCONNECTED;
    for(index in that.remoteStreams) {
      if(that.remoteStreams.hasOwnProperty(index)) {
        stream = that.remoteStreams[index];
        removeStream(stream);
        delete that.remoteStreams[index];
        evt2 = Erizo.StreamEvent({type:"stream-removed", stream:stream});
        that.dispatchEvent(evt2)
      }
    }
    that.remoteStreams = {};
    for(index in that.localStreams) {
      if(that.localStreams.hasOwnProperty(index)) {
        stream = that.localStreams[index];
        stream.pc.close();
        delete that.localStreams[index]
      }
    }
    try {
      that.socket.disconnect()
    }catch(error) {
      L.Logger.debug("Socket already disconnected")
    }
    that.socket = undefined
  });
  removeStream = function(stream) {
    if(stream.stream !== undefined) {
      stream.hide();
      if(stream.pc) {
        stream.pc.close()
      }
      if(stream.local) {
        stream.stream.stop()
      }
    }
  };
  sendDataSocket = function(stream, msg) {
    if(stream.local) {
      sendMessageSocket("sendDataStream", {id:stream.getID(), msg:msg})
    }else {
      L.Logger.error("You can not send data through a remote stream")
    }
  };
  updateAttributes = function(stream, attrs) {
    if(stream.local) {
      stream.updateLocalAttributes(attrs);
      sendMessageSocket("updateStreamAttributes", {id:stream.getID(), attrs:attrs})
    }else {
      L.Logger.error("You can not update attributes in a remote stream")
    }
  };
  connectSocket = function(token, callback, error) {
    console.log(token);
    that.socket = io.connect(token.host, {reconnect:false, secure:token.secure, "force new connection":true});
    that.socket.on("onAddStream", function(arg) {
      var stream = Erizo.Stream({streamID:arg.id, local:false, audio:arg.audio, video:arg.video, data:arg.data, screen:arg.screen, attributes:arg.attributes}), evt;
      that.remoteStreams[arg.id] = stream;
      evt = Erizo.StreamEvent({type:"stream-added", stream:stream});
      that.dispatchEvent(evt)
    });
    that.socket.on("signaling_message_erizo", function(arg) {
      var stream;
      if(arg.peerId) {
        stream = that.remoteStreams[arg.peerId]
      }else {
        stream = that.localStreams[arg.streamId]
      }
      if(stream) {
        stream.pc.processSignalingMessage(arg.mess)
      }
    });
    that.socket.on("signaling_message_peer", function(arg) {
      var stream = that.localStreams[arg.streamId];
      if(stream) {
        stream.pc[arg.peerSocket].processSignalingMessage(arg.msg)
      }else {
        stream = that.remoteStreams[arg.streamId];
        if(!stream.pc) {
          create_remote_pc(stream, arg.peerSocket)
        }
        stream.pc.processSignalingMessage(arg.msg)
      }
    });
    that.socket.on("publish_me", function(arg) {
      var myStream = that.localStreams[arg.streamId];
      if(myStream.pc === undefined) {
        myStream.pc = {}
      }
      myStream.pc[arg.peerSocket] = Erizo.Connection({callback:function(msg) {
        sendSDPSocket("signaling_message", {streamId:arg.streamId, peerSocket:arg.peerSocket, msg:msg})
      }, audio:myStream.hasAudio(), video:myStream.hasVideo(), stunServerUrl:that.stunServerUrl, turnServer:that.turnServer});
      myStream.pc[arg.peerSocket].oniceconnectionstatechange = function(state) {
        if(state === "disconnected") {
          myStream.pc[arg.peerSocket].close();
          delete myStream.pc[arg.peerSocket]
        }
      };
      myStream.pc[arg.peerSocket].addStream(myStream.stream);
      myStream.pc[arg.peerSocket].createOffer()
    });
    var create_remote_pc = function(stream, peerSocket) {
      stream.pc = Erizo.Connection({callback:function(msg) {
        sendSDPSocket("signaling_message", {streamId:stream.getID(), peerSocket:peerSocket, msg:msg})
      }, stunServerUrl:that.stunServerUrl, turnServer:that.turnServer, maxAudioBW:spec.maxAudioBW, maxVideoBW:spec.maxVideoBW, limitMaxAudioBW:spec.maxAudioBW, limitMaxVideoBW:spec.maxVideoBW});
      stream.pc.onaddstream = function(evt) {
        L.Logger.info("Stream subscribed");
        stream.stream = evt.stream;
        var evt2 = Erizo.StreamEvent({type:"stream-subscribed", stream:stream});
        that.dispatchEvent(evt2)
      }
    };
    that.socket.on("onDataStream", function(arg) {
      var stream = that.remoteStreams[arg.id], evt = Erizo.StreamEvent({type:"stream-data", msg:arg.msg, stream:stream});
      stream.dispatchEvent(evt)
    });
    that.socket.on("onUpdateAttributeStream", function(arg) {
      var stream = that.remoteStreams[arg.id], evt = Erizo.StreamEvent({type:"stream-attributes-update", attrs:arg.attrs, stream:stream});
      stream.updateLocalAttributes(arg.attrs);
      stream.dispatchEvent(evt)
    });
    that.socket.on("onRemoveStream", function(arg) {
      var stream = that.remoteStreams[arg.id], evt;
      delete that.remoteStreams[arg.id];
      removeStream(stream);
      evt = Erizo.StreamEvent({type:"stream-removed", stream:stream});
      that.dispatchEvent(evt)
    });
    that.socket.on("disconnect", function(argument) {
      L.Logger.info("Socket disconnected");
      if(that.state !== DISCONNECTED) {
        var disconnectEvt = Erizo.RoomEvent({type:"room-disconnected"});
        that.dispatchEvent(disconnectEvt)
      }
    });
    that.socket.on("connection_failed", function(arg) {
      L.Logger.info("ICE Connection Failed");
      if(that.state !== DISCONNECTED) {
        var disconnectEvt = Erizo.RoomEvent({type:"stream-failed"});
        that.dispatchEvent(disconnectEvt)
      }
    });
    sendMessageSocket("token", token, callback, error)
  };
  sendMessageSocket = function(type, msg, callback, error) {
    that.socket.emit(type, msg, function(respType, msg) {
      if(respType === "success") {
        if(callback !== undefined) {
          callback(msg)
        }
      }else {
        if(respType === "error") {
          if(error !== undefined) {
            error(msg)
          }
        }else {
          if(callback !== undefined) {
            callback(respType, msg)
          }
        }
      }
    })
  };
  sendSDPSocket = function(type, options, sdp, callback) {
    that.socket.emit(type, options, sdp, function(response, respCallback) {
      if(callback !== undefined) {
        callback(response, respCallback)
      }
    })
  };
  that.connect = function() {
    var streamList = [], token = L.Base64.decodeBase64(spec.token);
    if(that.state !== DISCONNECTED) {
      L.Logger.error("Room already connected")
    }
    that.state = CONNECTING;
    connectSocket(JSON.parse(token), function(response) {
      var index = 0, stream, streamList = [], streams, roomId, arg, connectEvt;
      streams = response.streams || [];
      that.p2p = response.p2p;
      roomId = response.id;
      that.stunServerUrl = response.stunServerUrl;
      that.turnServer = response.turnServer;
      that.state = CONNECTED;
      spec.defaultVideoBW = response.defaultVideoBW;
      spec.maxVideoBW = response.maxVideoBW;
      for(index in streams) {
        if(streams.hasOwnProperty(index)) {
          arg = streams[index];
          stream = Erizo.Stream({streamID:arg.id, local:false, audio:arg.audio, video:arg.video, data:arg.data, screen:arg.screen, attributes:arg.attributes});
          streamList.push(stream);
          that.remoteStreams[arg.id] = stream
        }
      }
      that.roomID = roomId;
      L.Logger.info("Connected to room " + that.roomID);
      connectEvt = Erizo.RoomEvent({type:"room-connected", streams:streamList});
      that.dispatchEvent(connectEvt)
    }, function(error) {
      L.Logger.error("Not Connected! Error: " + error)
    })
  };
  that.disconnect = function() {
    var disconnectEvt = Erizo.RoomEvent({type:"room-disconnected"});
    that.dispatchEvent(disconnectEvt)
  };
  that.publish = function(stream, options, callback) {
    options = options || {};
    var maxVideoBW;
    options.maxVideoBW = options.maxVideoBW || spec.defaultVideoBW;
    if(options.maxVideoBW > spec.maxVideoBW) {
      options.maxVideoBW = spec.maxVideoBW
    }
    if(stream.local && that.localStreams[stream.getID()] === undefined) {
      if(stream.hasAudio() || stream.hasVideo() || stream.hasScreen()) {
        if(stream.url !== undefined || stream.recording !== undefined) {
          var type;
          var arg;
          if(stream.url) {
            type = "url";
            arg = stream.url
          }else {
            type = "recording";
            arg = stream.recording
          }
          sendSDPSocket("publish", {state:type, data:stream.hasData(), audio:stream.hasAudio(), video:stream.hasVideo(), attributes:stream.getAttributes()}, arg, function(id, error) {
            if(id !== null) {
              L.Logger.info("Stream published");
              stream.getID = function() {
                return id
              };
              stream.sendData = function(msg) {
                sendDataSocket(stream, msg)
              };
              stream.setAttributes = function(attrs) {
                updateAttributes(stream, attrs)
              };
              that.localStreams[id] = stream;
              stream.room = that;
              if(callback) {
                callback(id)
              }
            }else {
              L.Logger.error("Error when publishing the stream", error);
              if(callback) {
                callback(undefined, error)
              }
            }
          })
        }else {
          if(that.p2p) {
            spec.maxAudioBW = options.maxAudioBW;
            spec.maxVideoBW = options.maxVideoBW;
            sendSDPSocket("publish", {state:"p2p", data:stream.hasData(), audio:stream.hasAudio(), video:stream.hasVideo(), screen:stream.hasScreen(), attributes:stream.getAttributes()}, undefined, function(id, error) {
              if(id === null) {
                L.Logger.error("Error when publishing the stream", error);
                if(callback) {
                  callback(undefined, error)
                }
              }
              L.Logger.info("Stream published");
              stream.getID = function() {
                return id
              };
              if(stream.hasData()) {
                stream.sendData = function(msg) {
                  sendDataSocket(stream, msg)
                }
              }
              stream.setAttributes = function(attrs) {
                updateAttributes(stream, attrs)
              };
              that.localStreams[id] = stream;
              stream.room = that
            })
          }else {
            sendSDPSocket("publish", {state:"erizo", data:stream.hasData(), audio:stream.hasAudio(), video:stream.hasVideo(), screen:stream.hasScreen(), attributes:stream.getAttributes()}, undefined, function(id, error) {
              if(id === null) {
                L.Logger.error("Error when publishing the stream: ", error);
                if(callback) {
                  callback(undefined, error)
                }
                return
              }
              L.Logger.info("Stream published");
              stream.getID = function() {
                return id
              };
              if(stream.hasData()) {
                stream.sendData = function(msg) {
                  sendDataSocket(stream, msg)
                }
              }
              stream.setAttributes = function(attrs) {
                updateAttributes(stream, attrs)
              };
              that.localStreams[id] = stream;
              stream.room = that;
              stream.pc = Erizo.Connection({callback:function(message) {
                console.log("Sending message", message);
                sendSDPSocket("signaling_message", {streamId:stream.getID(), msg:message}, undefined, function() {
                })
              }, stunServerUrl:that.stunServerUrl, turnServer:that.turnServer, maxAudioBW:options.maxAudioBW, maxVideoBW:options.maxVideoBW, limitMaxAudioBW:spec.maxAudioBW, limitMaxVideoBW:spec.maxVideoBW, audio:stream.hasAudio(), video:stream.hasVideo()});
              stream.pc.addStream(stream.stream);
              stream.pc.createOffer();
              if(callback) {
                callback(id)
              }
            })
          }
        }
      }else {
        if(stream.hasData()) {
          sendSDPSocket("publish", {state:"data", data:stream.hasData(), audio:false, video:false, screen:false, attributes:stream.getAttributes()}, undefined, function(id, error) {
            if(id === null) {
              L.Logger.error("Error publishing stream ", error);
              if(callback) {
                callback(undefined, error)
              }
              return
            }
            L.Logger.info("Stream published");
            stream.getID = function() {
              return id
            };
            stream.sendData = function(msg) {
              sendDataSocket(stream, msg)
            };
            stream.setAttributes = function(attrs) {
              updateAttributes(stream, attrs)
            };
            that.localStreams[id] = stream;
            stream.room = that;
            if(callback) {
              callback(id)
            }
          })
        }
      }
    }
  };
  that.startRecording = function(stream, callback) {
    L.Logger.debug("Start Recording streamaa: " + stream.getID());
    sendMessageSocket("startRecorder", {to:stream.getID()}, function(id, error) {
      if(id === null) {
        L.Logger.error("Error on start recording", error);
        if(callback) {
          callback(undefined, error)
        }
        return
      }
      L.Logger.info("Start recording", id);
      if(callback) {
        callback(id)
      }
    })
  };
  that.stopRecording = function(recordingId, callback) {
    sendMessageSocket("stopRecorder", {id:recordingId}, function(result, error) {
      if(result === null) {
        L.Logger.error("Error on stop recording", error);
        if(callback) {
          callback(undefined, error)
        }
        return
      }
      L.Logger.info("Stop recording");
      if(callback) {
        callback(true)
      }
    })
  };
  that.unpublish = function(stream, callback) {
    if(stream.local) {
      sendMessageSocket("unpublish", stream.getID(), function(result, error) {
        if(result === null) {
          L.Logger.error("Error unpublishing stream", error);
          if(callback) {
            callback(undefined, error)
          }
          return
        }
        L.Logger.info("Stream unpublished");
        if(callback) {
          callback(true)
        }
      });
      var p2p = stream.room.p2p;
      stream.room = undefined;
      if((stream.hasAudio() || stream.hasVideo() || stream.hasScreen()) && stream.url === undefined && !p2p) {
        stream.pc.close();
        stream.pc = undefined
      }
      delete that.localStreams[stream.getID()];
      stream.getID = function() {
      };
      stream.sendData = function(msg) {
      };
      stream.setAttributes = function(attrs) {
      }
    }
  };
  that.subscribe = function(stream, options, callback) {
    options = options || {};
    if(!stream.local) {
      if(stream.hasVideo() || stream.hasAudio() || stream.hasScreen()) {
        if(that.p2p) {
          sendSDPSocket("subscribe", {streamId:stream.getID()});
          if(callback) {
            callback(true)
          }
        }else {
          sendSDPSocket("subscribe", {streamId:stream.getID(), audio:options.audio, video:options.video, data:options.data, browser:Erizo.getBrowser()}, undefined, function(result, error) {
            if(result === null) {
              L.Logger.error("Error subscribing to stream ", error);
              if(callback) {
                callback(undefined, error)
              }
              return
            }
            L.Logger.info("Subscriber added");
            stream.pc = Erizo.Connection({callback:function(message) {
              L.Logger.info("Sending message", message);
              sendSDPSocket("signaling_message", {streamId:stream.getID(), msg:message, browser:stream.pc.browser}, undefined, function() {
              })
            }, nop2p:true, audio:stream.hasAudio(), video:stream.hasVideo(), stunServerUrl:that.stunServerUrl, turnServer:that.turnServer});
            stream.pc.onaddstream = function(evt) {
              L.Logger.info("Stream subscribed");
              stream.stream = evt.stream;
              var evt2 = Erizo.StreamEvent({type:"stream-subscribed", stream:stream});
              that.dispatchEvent(evt2)
            };
            stream.pc.createOffer(true);
            if(callback) {
              callback(true)
            }
          })
        }
      }else {
        if(stream.hasData() && options.data !== false) {
          sendSDPSocket("subscribe", {streamId:stream.getID(), data:options.data}, undefined, function(result, error) {
            if(result === null) {
              L.Logger.error("Error subscribing to stream ", error);
              if(callback) {
                callback(undefined, error)
              }
              return
            }
            L.Logger.info("Stream subscribed");
            var evt = Erizo.StreamEvent({type:"stream-subscribed", stream:stream});
            that.dispatchEvent(evt);
            if(callback) {
              callback(true)
            }
          })
        }else {
          L.Logger.info("Subscribing to anything");
          return
        }
      }
      L.Logger.info("Subscribing to: " + stream.getID())
    }
  };
  that.unsubscribe = function(stream, callback) {
    if(that.socket !== undefined) {
      if(!stream.local) {
        sendMessageSocket("unsubscribe", stream.getID(), function(result, error) {
          if(result === null) {
            if(callback) {
              callback(undefined, error)
            }
            return
          }
          removeStream(stream);
          if(callback) {
            callback(true)
          }
        }, function() {
          L.Logger.error("Error calling unsubscribe.")
        })
      }
    }
  };
  that.getStreamsByAttribute = function(name, value) {
    var streams = [], index, stream;
    for(index in that.remoteStreams) {
      if(that.remoteStreams.hasOwnProperty(index)) {
        stream = that.remoteStreams[index];
        if(stream.getAttributes() !== undefined && stream.getAttributes()[name] !== undefined) {
          if(stream.getAttributes()[name] === value) {
            streams.push(stream)
          }
        }
      }
    }
    return streams
  };
  return that
};
var L = L || {};
L.Logger = function(L) {
  var DEBUG = 0, TRACE = 1, INFO = 2, WARNING = 3, ERROR = 4, NONE = 5, logLevel = DEBUG, enableLogPanel, setLogLevel, log, debug, trace, info, warning, error;
  enableLogPanel = function() {
    L.Logger.panel = document.createElement("textarea");
    L.Logger.panel.setAttribute("id", "licode-logs");
    L.Logger.panel.setAttribute("style", "width: 100%; height: 100%; display: none");
    L.Logger.panel.setAttribute("rows", 20);
    L.Logger.panel.setAttribute("cols", 20);
    L.Logger.panel.setAttribute("readOnly", true);
    document.body.appendChild(L.Logger.panel)
  };
  setLogLevel = function(level) {
    if(level > L.Logger.NONE) {
      level = L.Logger.NONE
    }else {
      if(level < L.Logger.DEBUG) {
        level = L.Logger.DEBUG
      }
    }
    L.Logger.logLevel = level
  };
  log = function(level) {
    var out = "";
    if(level < L.Logger.logLevel) {
      return
    }
    if(level === L.Logger.DEBUG) {
      out = out + "DEBUG"
    }else {
      if(level === L.Logger.TRACE) {
        out = out + "TRACE"
      }else {
        if(level === L.Logger.INFO) {
          out = out + "INFO"
        }else {
          if(level === L.Logger.WARNING) {
            out = out + "WARNING"
          }else {
            if(level === L.Logger.ERROR) {
              out = out + "ERROR"
            }
          }
        }
      }
    }
    out = out + ": ";
    var args = [];
    for(var i = 0;i < arguments.length;i++) {
      args[i] = arguments[i]
    }
    var tempArgs = args.slice(1);
    var args = [out].concat(tempArgs);
    if(L.Logger.panel !== undefined) {
      var tmp = "";
      for(var idx = 0;idx < args.length;idx++) {
        tmp = tmp + args[idx]
      }
      L.Logger.panel.value = L.Logger.panel.value + "\n" + tmp
    }else {
      console.log.apply(console, args)
    }
  };
  debug = function() {
    var args = [];
    for(var i = 0;i < arguments.length;i++) {
      args[i] = arguments[i]
    }
    L.Logger.log.apply(L.Logger, [L.Logger.DEBUG].concat(args))
  };
  trace = function() {
    var args = [];
    for(var i = 0;i < arguments.length;i++) {
      args[i] = arguments[i]
    }
    L.Logger.log.apply(L.Logger, [L.Logger.TRACE].concat(args))
  };
  info = function() {
    var args = [];
    for(var i = 0;i < arguments.length;i++) {
      args[i] = arguments[i]
    }
    L.Logger.log.apply(L.Logger, [L.Logger.INFO].concat(args))
  };
  warning = function() {
    var args = [];
    for(var i = 0;i < arguments.length;i++) {
      args[i] = arguments[i]
    }
    L.Logger.log.apply(L.Logger, [L.Logger.WARNING].concat(args))
  };
  error = function() {
    var args = [];
    for(var i = 0;i < arguments.length;i++) {
      args[i] = arguments[i]
    }
    L.Logger.log.apply(L.Logger, [L.Logger.ERROR].concat(args))
  };
  return{DEBUG:DEBUG, TRACE:TRACE, INFO:INFO, WARNING:WARNING, ERROR:ERROR, NONE:NONE, enableLogPanel:enableLogPanel, setLogLevel:setLogLevel, log:log, debug:debug, trace:trace, info:info, warning:warning, error:error}
}(L);
var L = L || {};
L.Base64 = function(L) {
  var END_OF_INPUT, base64Chars, reverseBase64Chars, base64Str, base64Count, i, setBase64Str, readBase64, encodeBase64, readReverseBase64, ntos, decodeBase64;
  END_OF_INPUT = -1;
  base64Chars = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"];
  reverseBase64Chars = [];
  for(i = 0;i < base64Chars.length;i = i + 1) {
    reverseBase64Chars[base64Chars[i]] = i
  }
  setBase64Str = function(str) {
    base64Str = str;
    base64Count = 0
  };
  readBase64 = function() {
    var c;
    if(!base64Str) {
      return END_OF_INPUT
    }
    if(base64Count >= base64Str.length) {
      return END_OF_INPUT
    }
    c = base64Str.charCodeAt(base64Count) & 255;
    base64Count = base64Count + 1;
    return c
  };
  encodeBase64 = function(str) {
    var result, inBuffer, lineCount, done;
    setBase64Str(str);
    result = "";
    inBuffer = new Array(3);
    lineCount = 0;
    done = false;
    while(!done && (inBuffer[0] = readBase64()) !== END_OF_INPUT) {
      inBuffer[1] = readBase64();
      inBuffer[2] = readBase64();
      result = result + base64Chars[inBuffer[0] >> 2];
      if(inBuffer[1] !== END_OF_INPUT) {
        result = result + base64Chars[inBuffer[0] << 4 & 48 | inBuffer[1] >> 4];
        if(inBuffer[2] !== END_OF_INPUT) {
          result = result + base64Chars[inBuffer[1] << 2 & 60 | inBuffer[2] >> 6];
          result = result + base64Chars[inBuffer[2] & 63]
        }else {
          result = result + base64Chars[inBuffer[1] << 2 & 60];
          result = result + "=";
          done = true
        }
      }else {
        result = result + base64Chars[inBuffer[0] << 4 & 48];
        result = result + "=";
        result = result + "=";
        done = true
      }
      lineCount = lineCount + 4;
      if(lineCount >= 76) {
        result = result + "\n";
        lineCount = 0
      }
    }
    return result
  };
  readReverseBase64 = function() {
    if(!base64Str) {
      return END_OF_INPUT
    }
    while(true) {
      if(base64Count >= base64Str.length) {
        return END_OF_INPUT
      }
      var nextCharacter = base64Str.charAt(base64Count);
      base64Count = base64Count + 1;
      if(reverseBase64Chars[nextCharacter]) {
        return reverseBase64Chars[nextCharacter]
      }
      if(nextCharacter === "A") {
        return 0
      }
    }
  };
  ntos = function(n) {
    n = n.toString(16);
    if(n.length === 1) {
      n = "0" + n
    }
    n = "%" + n;
    return unescape(n)
  };
  decodeBase64 = function(str) {
    var result, inBuffer, done;
    setBase64Str(str);
    result = "";
    inBuffer = new Array(4);
    done = false;
    while(!done && (inBuffer[0] = readReverseBase64()) !== END_OF_INPUT && (inBuffer[1] = readReverseBase64()) !== END_OF_INPUT) {
      inBuffer[2] = readReverseBase64();
      inBuffer[3] = readReverseBase64();
      result = result + ntos(inBuffer[0] << 2 & 255 | inBuffer[1] >> 4);
      if(inBuffer[2] !== END_OF_INPUT) {
        result += ntos(inBuffer[1] << 4 & 255 | inBuffer[2] >> 2);
        if(inBuffer[3] !== END_OF_INPUT) {
          result = result + ntos(inBuffer[2] << 6 & 255 | inBuffer[3])
        }else {
          done = true
        }
      }else {
        done = true
      }
    }
    return result
  };
  return{encodeBase64:encodeBase64, decodeBase64:decodeBase64}
}(L);
(function() {
  this.L = this.L || {};
  this.L.ElementQueries = function() {
    function getEmSize(element) {
      if(!element) {
        element = document.documentElement
      }
      var fontSize = getComputedStyle(element, "fontSize");
      return parseFloat(fontSize) || 16
    }
    function convertToPx(element, value) {
      var units = value.replace(/[0-9]*/, "");
      value = parseFloat(value);
      switch(units) {
        case "px":
          return value;
        case "em":
          return value * getEmSize(element);
        case "rem":
          return value * getEmSize();
        case "vw":
          return value * document.documentElement.clientWidth / 100;
        case "vh":
          return value * document.documentElement.clientHeight / 100;
        case "vmin":
        ;
        case "vmax":
          var vw = document.documentElement.clientWidth / 100;
          var vh = document.documentElement.clientHeight / 100;
          var chooser = Math[units === "vmin" ? "min" : "max"];
          return value * chooser(vw, vh);
        default:
          return value
      }
    }
    function SetupInformation(element) {
      this.element = element;
      this.options = [];
      var i, j, option, width = 0, height = 0, value, actualValue, attrValues, attrValue, attrName;
      this.addOption = function(option) {
        this.options.push(option)
      };
      var attributes = ["min-width", "min-height", "max-width", "max-height"];
      this.call = function() {
        width = this.element.offsetWidth;
        height = this.element.offsetHeight;
        attrValues = {};
        for(i = 0, j = this.options.length;i < j;i++) {
          option = this.options[i];
          value = convertToPx(this.element, option.value);
          actualValue = option.property == "width" ? width : height;
          attrName = option.mode + "-" + option.property;
          attrValue = "";
          if(option.mode == "min" && actualValue >= value) {
            attrValue += option.value
          }
          if(option.mode == "max" && actualValue <= value) {
            attrValue += option.value
          }
          if(!attrValues[attrName]) {
            attrValues[attrName] = ""
          }
          if(attrValue && -1 === (" " + attrValues[attrName] + " ").indexOf(" " + attrValue + " ")) {
            attrValues[attrName] += " " + attrValue
          }
        }
        for(var k in attributes) {
          if(attrValues[attributes[k]]) {
            this.element.setAttribute(attributes[k], attrValues[attributes[k]].substr(1))
          }else {
            this.element.removeAttribute(attributes[k])
          }
        }
      }
    }
    function setupElement(element, options) {
      if(element.elementQueriesSetupInformation) {
        element.elementQueriesSetupInformation.addOption(options)
      }else {
        element.elementQueriesSetupInformation = new SetupInformation(element);
        element.elementQueriesSetupInformation.addOption(options);
        new ResizeSensor(element, function() {
          element.elementQueriesSetupInformation.call()
        })
      }
      element.elementQueriesSetupInformation.call()
    }
    function queueQuery(selector, mode, property, value) {
      var query;
      if(document.querySelectorAll) {
        query = document.querySelectorAll.bind(document)
      }
      if(!query && "undefined" !== typeof $$) {
        query = $$
      }
      if(!query && "undefined" !== typeof jQuery) {
        query = jQuery
      }
      if(!query) {
        throw"No document.querySelectorAll, jQuery or Mootools's $$ found.";
      }
      var elements = query(selector);
      for(var i = 0, j = elements.length;i < j;i++) {
        setupElement(elements[i], {mode:mode, property:property, value:value})
      }
    }
    var regex = /,?([^,\n]*)\[[\s\t]*(min|max)-(width|height)[\s\t]*[~$\^]?=[\s\t]*"([^"]*)"[\s\t]*]([^\n\s\{]*)/mgi;
    function extractQuery(css) {
      var match;
      css = css.replace(/'/g, '"');
      while(null !== (match = regex.exec(css))) {
        if(5 < match.length) {
          queueQuery(match[1] || match[5], match[2], match[3], match[4])
        }
      }
    }
    function readRules(rules) {
      var selector = "";
      if(!rules) {
        return
      }
      if("string" === typeof rules) {
        rules = rules.toLowerCase();
        if(-1 !== rules.indexOf("min-width") || -1 !== rules.indexOf("max-width")) {
          extractQuery(rules)
        }
      }else {
        for(var i = 0, j = rules.length;i < j;i++) {
          if(1 === rules[i].type) {
            selector = rules[i].selectorText || rules[i].cssText;
            if(-1 !== selector.indexOf("min-height") || -1 !== selector.indexOf("max-height")) {
              extractQuery(selector)
            }else {
              if(-1 !== selector.indexOf("min-width") || -1 !== selector.indexOf("max-width")) {
                extractQuery(selector)
              }
            }
          }else {
            if(4 === rules[i].type) {
              readRules(rules[i].cssRules || rules[i].rules)
            }
          }
        }
      }
    }
    this.init = function() {
      for(var i = 0, j = document.styleSheets.length;i < j;i++) {
        readRules(document.styleSheets[i].cssText || document.styleSheets[i].cssRules || document.styleSheets[i].rules)
      }
    }
  };
  function init() {
    (new L.ElementQueries).init()
  }
  if(window.addEventListener) {
    window.addEventListener("load", init, false)
  }else {
    window.attachEvent("onload", init)
  }
  this.L.ResizeSensor = function(element, callback) {
    function addResizeListener(element, callback) {
      if(window.OverflowEvent) {
        element.addEventListener("overflowchanged", function(e) {
          callback.call(this, e)
        })
      }else {
        element.addEventListener("overflow", function(e) {
          callback.call(this, e)
        });
        element.addEventListener("underflow", function(e) {
          callback.call(this, e)
        })
      }
    }
    function EventQueue() {
      this.q = [];
      this.add = function(ev) {
        this.q.push(ev)
      };
      var i, j;
      this.call = function() {
        for(i = 0, j = this.q.length;i < j;i++) {
          this.q[i].call()
        }
      }
    }
    function getComputedStyle(element, prop) {
      if(element.currentStyle) {
        return element.currentStyle[prop]
      }else {
        if(window.getComputedStyle) {
          return window.getComputedStyle(element, null).getPropertyValue(prop)
        }else {
          return element.style[prop]
        }
      }
    }
    function attachResizeEvent(element, resized) {
      if(!element.resizedAttached) {
        element.resizedAttached = new EventQueue;
        element.resizedAttached.add(resized)
      }else {
        if(element.resizedAttached) {
          element.resizedAttached.add(resized);
          return
        }
      }
      var myResized = function() {
        if(setupSensor()) {
          element.resizedAttached.call()
        }
      };
      element.resizeSensor = document.createElement("div");
      element.resizeSensor.className = "resize-sensor";
      var style = "position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; z-index: -1;";
      element.resizeSensor.style.cssText = style;
      element.resizeSensor.innerHTML = '<div class="resize-sensor-overflow" style="' + style + '">' + "<div></div>" + "</div>" + '<div class="resize-sensor-underflow" style="' + style + '">' + "<div></div>" + "</div>";
      element.appendChild(element.resizeSensor);
      if("absolute" !== getComputedStyle(element, "position")) {
        element.style.position = "relative"
      }
      var x = -1, y = -1, firstStyle = element.resizeSensor.firstElementChild.firstChild.style, lastStyle = element.resizeSensor.lastElementChild.firstChild.style;
      function setupSensor() {
        var change = false, width = element.resizeSensor.offsetWidth, height = element.resizeSensor.offsetHeight;
        if(x != width) {
          firstStyle.width = width - 1 + "px";
          lastStyle.width = width + 1 + "px";
          change = true;
          x = width
        }
        if(y != height) {
          firstStyle.height = height - 1 + "px";
          lastStyle.height = height + 1 + "px";
          change = true;
          y = height
        }
        return change
      }
      setupSensor();
      addResizeListener(element.resizeSensor, myResized);
      addResizeListener(element.resizeSensor.firstElementChild, myResized);
      addResizeListener(element.resizeSensor.lastElementChild, myResized)
    }
    if("array" === typeof element || "undefined" !== typeof jQuery && element instanceof jQuery || "undefined" !== typeof Elements && element instanceof Elements) {
      var i = 0, j = element.length;
      for(;i < j;i++) {
        attachResizeEvent(element[i], callback)
      }
    }else {
      attachResizeEvent(element, callback)
    }
  }
})();
var Erizo = Erizo || {};
Erizo.View = function(spec) {
  var that = Erizo.EventDispatcher({});
  that.url = "http://chotis2.dit.upm.es:3000";
  return that
};
var Erizo = Erizo || {};
Erizo.VideoPlayer = function(spec) {
  var that = Erizo.View({}), onmouseover, onmouseout;
  that.id = spec.id;
  that.stream = spec.stream.stream;
  that.elementID = spec.elementID;
  onmouseover = function(evt) {
    that.bar.display()
  };
  onmouseout = function(evt) {
    that.bar.hide()
  };
  that.destroy = function() {
    that.video.pause();
    delete that.resizer;
    that.parentNode.removeChild(that.div)
  };
  that.resize = function() {
    var width = that.container.offsetWidth, height = that.container.offsetHeight;
    if(spec.stream.screen || spec.options.crop === false) {
      if(width * (3 / 4) < height) {
        that.video.style.width = width + "px";
        that.video.style.height = 3 / 4 * width + "px";
        that.video.style.top = -(3 / 4 * width / 2 - height / 2) + "px";
        that.video.style.left = "0px"
      }else {
        that.video.style.height = height + "px";
        that.video.style.width = 4 / 3 * height + "px";
        that.video.style.left = -(4 / 3 * height / 2 - width / 2) + "px";
        that.video.style.top = "0px"
      }
    }else {
      if(width !== that.containerWidth || height !== that.containerHeight) {
        if(width * (3 / 4) > height) {
          that.video.style.width = width + "px";
          that.video.style.height = 3 / 4 * width + "px";
          that.video.style.top = -(3 / 4 * width / 2 - height / 2) + "px";
          that.video.style.left = "0px"
        }else {
          that.video.style.height = height + "px";
          that.video.style.width = 4 / 3 * height + "px";
          that.video.style.left = -(4 / 3 * height / 2 - width / 2) + "px";
          that.video.style.top = "0px"
        }
      }
    }
    that.containerWidth = width;
    that.containerHeight = height
  };
  L.Logger.debug("Creating URL from stream " + that.stream);
  var myURL = window.URL || webkitURL;
  that.stream_url = myURL.createObjectURL(that.stream);
  that.div = document.createElement("div");
  that.div.setAttribute("id", "player_" + that.id);
  that.div.setAttribute("style", "width: 100%; height: 100%; position: relative; background-color: black; overflow: hidden;");
  that.loader = document.createElement("img");
  that.loader.setAttribute("style", "width: 16px; height: 16px; position: absolute; top: 50%; left: 50%; margin-top: -8px; margin-left: -8px");
  that.loader.setAttribute("id", "back_" + that.id);
  that.loader.setAttribute("src", that.url + "/assets/loader.gif");
  that.video = document.createElement("video");
  that.video.setAttribute("id", "stream" + that.id);
  that.video.setAttribute("style", "width: 100%; height: 100%; position: absolute");
  that.video.setAttribute("autoplay", "autoplay");
  if(spec.stream.local) {
    that.video.volume = 0
  }
  if(that.elementID !== undefined) {
    document.getElementById(that.elementID).appendChild(that.div);
    that.container = document.getElementById(that.elementID)
  }else {
    document.body.appendChild(that.div);
    that.container = document.body
  }
  that.parentNode = that.div.parentNode;
  that.div.appendChild(that.loader);
  that.div.appendChild(that.video);
  that.containerWidth = 0;
  that.containerHeight = 0;
  that.resizer = new L.ResizeSensor(that.container, that.resize);
  that.resize();
  that.bar = new Erizo.Bar({elementID:"player_" + that.id, id:that.id, stream:spec.stream, media:that.video, options:spec.options});
  that.div.onmouseover = onmouseover;
  that.div.onmouseout = onmouseout;
  that.video.src = that.stream_url;
  return that
};
var Erizo = Erizo || {};
Erizo.AudioPlayer = function(spec) {
  var that = Erizo.View({}), onmouseover, onmouseout;
  that.id = spec.id;
  that.stream = spec.stream.stream;
  that.elementID = spec.elementID;
  L.Logger.debug("Creating URL from stream " + that.stream);
  var myURL = window.URL || webkitURL;
  that.stream_url = myURL.createObjectURL(that.stream);
  that.audio = document.createElement("audio");
  that.audio.setAttribute("id", "stream" + that.id);
  that.audio.setAttribute("style", "width: 100%; height: 100%; position: absolute");
  that.audio.setAttribute("autoplay", "autoplay");
  if(spec.stream.local) {
    that.audio.volume = 0
  }
  if(spec.stream.local) {
    that.audio.volume = 0
  }
  if(that.elementID !== undefined) {
    that.destroy = function() {
      that.audio.pause();
      that.parentNode.removeChild(that.div)
    };
    onmouseover = function(evt) {
      that.bar.display()
    };
    onmouseout = function(evt) {
      that.bar.hide()
    };
    that.div = document.createElement("div");
    that.div.setAttribute("id", "player_" + that.id);
    that.div.setAttribute("style", "width: 100%; height: 100%; position: relative; overflow: hidden;");
    document.getElementById(that.elementID).appendChild(that.div);
    that.container = document.getElementById(that.elementID);
    that.parentNode = that.div.parentNode;
    that.div.appendChild(that.audio);
    that.bar = new Erizo.Bar({elementID:"player_" + that.id, id:that.id, stream:spec.stream, media:that.audio, options:spec.options});
    that.div.onmouseover = onmouseover;
    that.div.onmouseout = onmouseout
  }else {
    that.destroy = function() {
      that.audio.pause();
      that.parentNode.removeChild(that.audio)
    };
    document.body.appendChild(that.audio);
    that.parentNode = document.body
  }
  that.audio.src = that.stream_url;
  return that
};
var Erizo = Erizo || {};
Erizo.Bar = function(spec) {
  var that = Erizo.View({}), waiting, show;
  that.elementID = spec.elementID;
  that.id = spec.id;
  that.div = document.createElement("div");
  that.div.setAttribute("id", "bar_" + that.id);
  that.bar = document.createElement("div");
  that.bar.setAttribute("style", "width: 100%; height: 15%; max-height: 30px; position: absolute; bottom: 0; right: 0; background-color: rgba(255,255,255,0.62)");
  that.bar.setAttribute("id", "subbar_" + that.id);
  that.link = document.createElement("a");
  that.link.setAttribute("href", "http://www.lynckia.com/");
  that.link.setAttribute("target", "_blank");
  that.logo = document.createElement("img");
  that.logo.setAttribute("style", "width: 100%; height: 100%; max-width: 30px; position: absolute; top: 0; left: 2px;");
  that.logo.setAttribute("alt", "Lynckia");
  that.logo.setAttribute("src", that.url + "/assets/star.svg");
  show = function(displaying) {
    if(displaying !== "block") {
      displaying = "none"
    }else {
      clearTimeout(waiting)
    }
    that.div.setAttribute("style", "width: 100%; height: 100%; position: relative; bottom: 0; right: 0; display:" + displaying)
  };
  that.display = function() {
    show("block")
  };
  that.hide = function() {
    waiting = setTimeout(show, 1E3)
  };
  document.getElementById(that.elementID).appendChild(that.div);
  that.div.appendChild(that.bar);
  that.bar.appendChild(that.link);
  that.link.appendChild(that.logo);
  if(!spec.stream.screen && (spec.options === undefined || spec.options.speaker === undefined || spec.options.speaker === true)) {
    that.speaker = new Erizo.Speaker({elementID:"subbar_" + that.id, id:that.id, stream:spec.stream, media:spec.media})
  }
  that.display();
  that.hide();
  return that
};
var Erizo = Erizo || {};
Erizo.Speaker = function(spec) {
  var that = Erizo.View({}), show, mute, unmute, lastVolume = 50;
  that.elementID = spec.elementID;
  that.media = spec.media;
  that.id = spec.id;
  that.stream = spec.stream;
  that.div = document.createElement("div");
  that.div.setAttribute("style", "width: 40%; height: 100%; max-width: 32px; position: absolute; right: 0;z-index:0;");
  that.icon = document.createElement("img");
  that.icon.setAttribute("id", "volume_" + that.id);
  that.icon.setAttribute("src", that.url + "/assets/sound48.png");
  that.icon.setAttribute("style", "width: 80%; height: 100%; position: absolute;");
  that.div.appendChild(that.icon);
  if(!that.stream.local) {
    that.picker = document.createElement("input");
    that.picker.setAttribute("id", "picker_" + that.id);
    that.picker.type = "range";
    that.picker.min = 0;
    that.picker.max = 100;
    that.picker.step = 10;
    that.picker.value = lastVolume;
    that.picker.setAttribute("orient", "vertical");
    that.div.appendChild(that.picker);
    that.media.volume = that.picker.value / 100;
    that.media.muted = false;
    that.picker.oninput = function(evt) {
      if(that.picker.value > 0) {
        that.media.muted = false;
        that.icon.setAttribute("src", that.url + "/assets/sound48.png")
      }else {
        that.media.muted = true;
        that.icon.setAttribute("src", that.url + "/assets/mute48.png")
      }
      that.media.volume = that.picker.value / 100
    };
    show = function(displaying) {
      that.picker.setAttribute("style", "background: transparent; width: 32px; height: 100px; position: absolute; bottom: 90%; z-index: 1;" + that.div.offsetHeight + "px; right: 0px; -webkit-appearance: slider-vertical; display: " + displaying)
    };
    mute = function() {
      that.icon.setAttribute("src", that.url + "/assets/mute48.png");
      lastVolume = that.picker.value;
      that.picker.value = 0;
      that.media.volume = 0;
      that.media.muted = true
    };
    unmute = function() {
      that.icon.setAttribute("src", that.url + "/assets/sound48.png");
      that.picker.value = lastVolume;
      that.media.volume = that.picker.value / 100;
      that.media.muted = false
    };
    that.icon.onclick = function(evt) {
      if(that.media.muted) {
        unmute()
      }else {
        mute()
      }
    };
    that.div.onmouseover = function(evt) {
      show("block")
    };
    that.div.onmouseout = function(evt) {
      show("none")
    };
    show("none")
  }else {
    mute = function() {
      that.media.muted = true;
      that.icon.setAttribute("src", that.url + "/assets/mute48.png");
      that.stream.stream.getAudioTracks()[0].enabled = false
    };
    unmute = function() {
      that.media.muted = false;
      that.icon.setAttribute("src", that.url + "/assets/sound48.png");
      that.stream.stream.getAudioTracks()[0].enabled = true
    };
    that.icon.onclick = function(evt) {
      if(that.media.muted) {
        unmute()
      }else {
        mute()
      }
    }
  }
  document.getElementById(that.elementID).appendChild(that.div);
  return that
};

