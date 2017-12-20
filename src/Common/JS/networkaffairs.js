;(function(root) {

        if (typeof module !== 'undefined' && module.exports) {
            root = GLOBAL;
        }

        var N = {};

    root.serverPath = N.serverPath = "http://dev.indoorstar.com/ids/";
    root.dataServer = N.dataServer = "http://indoorstar.com:6601/";
    root.innerServer = N.innerServer = "http://dev.indoorstar.com:6603/ids/";
    root.newInnerServer = N.newInnerServer = "http://dev.indoorstar.com:6630/ids/";
    root.newInnerWeb = N.newInnerWeb = "http://dev.indoorstar.com:6630/web/";
    root.WxServer = N.WxServer = "http://dev.indoorstar.com:6143/ids/";
    root.testServer = N.testServer = "http://192.168.1.150:6143/ids/";
    root.wxServerPath = N.wxServerPath = "https://qyapi.weixin.qq.com/cgi-bin/";

    N.isJsonStart = function(d) {
        if (!d) return false;
        var c = d.charAt(0);
        return c === '{' || c === '[' || c === '\"' || c === '\'';
    };

    /*
     * TODO: Data Efficiency To Be Improved
     *
     * this data will be GC (Major GC, 20ms, 10MB)
     */
    N.inspectData = function(data) {
        if (!data) return "buffer";
        if (N.isJsonStart(data)) {
            //is action result
            var d = JSON.parse(data);
            if (d.s !== undefined && d.s < 0) {
                return "actionfail";
            }
            if (d.d !== undefined && N.isJsonStart(d.d)) {
                return "actionjson";
            } else if (d.d !== undefined) {
                return "actionraw";
            } else {
                return "json";
            }
        } else {
            return "rawdata";
        }
    };

    N.dataHandlers = {
        "gzipped": function(d) {
            try {return window.E.ungzip(d);} catch(e) {
                H.log("UNGZIP ERROR");
                throw e;
            }
        },
        "actionraw": function(d) {
            var rd = JSON.parse(d);
            if (!rd.d) return rd.d;
            try {
                var dec = window.E.decode(rd.d);
                if (N.isJsonStart(dec)) {
                    return JSON.parse(dec);
                }
                return dec;
            } catch(e) {
                H.log("DECODE ACTIONRAW ERROR: " + e.toLocaleString());
                throw e;
            }
        },
        "actionjson": function(d) {
            var j = undefined;
            try {j = JSON.parse(JSON.parse(decodeURI(d)).d);} catch(e) {
                try{j = JSON.parse(JSON.parse(d).d);} catch(e) {
                    H.log("JSON PARSE ERROR: " + e);
                    throw e;
                }
            }
            return j;
        },
        "action": function(d) {
            if (!d) return d;
            var hdl = N.inspectData(d);
            if (hdl !== "actionjson" && hdl !== "actionfail" && hdl !== "actionraw") {
                hdl = "actionfail";
            }
            return N.dataHandlers[hdl](d);
        },
        "json": function(d) {
            if (!d) return d;
            if (N.isJsonStart(d)) {
                if (typeof d === "object") {
                    return d;
                }
                return JSON.parse(d);
            }
        },
        "rawdata": function(d) {
            return d;
        },
        "actionfail": function() {
            return "&&actionfail";
        },
        "encoded": function(d) {
            try {
                return window.E.decode(d);
            } catch(e) {
                H.log("DECODE RAW ERROR: " + e.toLocaleString());
                throw e;
            }
        },
        "buffer": function(arrayBuffer) {
            "use strict";
            if (!arrayBuffer instanceof ArrayBuffer) {
                H.log("RESULT TYPE ERROR: NOT AN ARRAYBUFFER");
            }
            return arrayBuffer;
        }
    };

    N.request = function(url) {
        url = url || location.href;
        if (url.length >= 4 && url.substr(0, 4) === "http" && (H.likeIE && H.getIE() < 10)) {
            var targetOrigin = url.split("#")[0].split("//")[0] + "//" + url.split("#")[0].split("//")[1].split("/")[0];
            if ((location.protocol + "//" + location.hostname + (location.port || ""))
                !== targetOrigin && !!window["XDomainRequest"]) {
                try {
                    return new window["XDomainRequest"]();
                } catch (e) {
                }
            }
        }
        if (window['XMLHttpRequest']) {
            return new XMLHttpRequest();
        } else {
            try {
                return new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                try {
                    return new ActiveXObject("Microsoft.XMLHTTP");
                } catch (ee) {
                }
            }
            return {
                open: function() {throw new Error("XHR Not Supported!")},
                setRequestHeader: H.noop(),
                send: H.noop()
            };
        }
    };

    /*
     * A callback will get:
     *
     * Part I: possible data
     *
     * Part II: trace if an error or an exception happens
     *
     * last argument: request object
     *
     */
    function call(callbacks, args, traces) {
        H.every(callbacks, function(callback) {
            callback.apply(this, args);
        }, traces);
    }

    function parseHeaders(headerString) {
        var hs = (headerString || "").split("\r\n") || [];
        var rs = {};
        for (var i = 0; i < hs.length; i++) {
            var f = (hs[i] || "").indexOf(":");
            if (f !== -1) {
                rs[hs[i].substring(0, f)] = hs[i].substring(f + 1, hs[i].length).trim();
            }
        }
        return rs;
    }

    N.prepareRequest = function(url, options, data, resultType) {
        options = options || {};
        data = data || {};
        var req = {};
        req.request = N.request(url);

        var isBuffer = resultType === 'buffer';

        var handler;

        if (resultType) handler = N.dataHandlers[resultType];

        var trace = H.getStackTrace();

        if ((!req.request instanceof XMLHttpRequest) && isBuffer) {
            H.log("internal error: using TypedArray in no-XHR2 environment.");
            return null;
        }

        req.open = function() {
            req.request.open();
        };
        req.cancel = function() {
            req.request.abort();
        };

        //on successful finish
        req.cb = [];
        //on bad response
        req.ecb = [];
        //on chunk got
        req.tcb = [];
        //onload = onstart
        req.scb = [];
        //onstarted
        req.sdcb = [];
        //on exception such as 405
        req.xcb = [];

        req.on = function(event, callback) {
            switch (event) {
                case 'finish':
                    req.cb.push(callback);
                    break;
                case 'error':
                    req.ecb.push(callback);
                    break;
                case 'chunk':
                case 'trunk':
                    req.tcb.push(callback);
                    break;
                case 'start':
                    req.scb.push(callback);
                    break;
                case 'started':
                    req.sdcb.push(callback);
                    break;
                case 'exception':
                    req.xcb.push(callback);
                    break;
                default:
                    break;
            }
        };

        var method = options.method || "GET";
        var async = options.async === undefined ? 1 : options.async;

        try {
            if (window["XDomainRequest"] && req.request instanceof window["XDomainRequest"]) {
                req.request.onerror = function() {
                    call(req.ecb, [trace, req], [trace]);
                };
                req.request.onprogress = function() {
                    if (!req.headers) {
                        req.headers = parseHeaders(req.request.getAllResponseHeaders());
                        call(req.scb, [req], [trace]);
                        call(req.tcb, [isBuffer ? req.request.response : req.request.responseText, req], [trace]);
                        call(req.sdcb, [req], [trace]);
                    } else {
                        call(req.tcb, [isBuffer ? req.request.response : req.request.responseText, req], [trace]);
                    }
                };
                req.request.ontimeout = function() {};
                req.request.timeout = 0;
                req.request.onload = function() {
                    var first = !req.headers;
                    if (first) {
                        req.headers = parseHeaders(req.request.getAllResponseHeaders());
                        call(req.scb, [req], [trace]);
                    }
                    if (!handler) handler = N.dataHandlers[N.inspectData(req.request.responseText)];
                    var d = handler(req.request.responseText);
                    if (d !== undefined && d !== null && d !== "&&actionfail") {
                        call(req.cb, [d, req], [trace]);
                    } else {
                        call(req.ecb, [d, trace, req], [trace]);
                    }
                    if (first) {
                        call(req.sdcb, [req], [trace]);
                    }
                };
            }
        } catch (e) {
            H.log('Ajax Error (XDR): ' + e);
        }

        req.request.onreadystatechange = function() {
            if (req.request.readyState === 3) {
                if (!req.headers) {
                    req.headers = parseHeaders(req.request.getAllResponseHeaders());
                    call(req.scb, [req], [trace]);
                    if (!H.likeIE || H.getIE() > 7) {
                        call(req.tcb, [isBuffer ? req.request.response : req.request.responseText, req], [trace]);
                    }
                    call(req.sdcb, [req], [trace]);
                } else {
                    if (!H.likeIE || H.getIE() > 7) {
                        call(req.tcb, [isBuffer ? req.request.response : req.request.responseText, req], [trace]);
                    }
                }
            } else if(req.request.readyState === 4 && (req.request.status === 200 || req.request.status === 0)) {
                if (!handler) handler = N.dataHandlers[N.inspectData(req.request.responseText)];
                var d = handler(isBuffer ? req.request.response : req.request.responseText);
                if (d !== undefined && d !== null && d !== "&&actionfail") {
                    call(req.cb, [d, req], [trace]);
                } else {
                    call(req.ecb, [req.request.response, trace, req],[trace]);
                }
            } else if (req.request.readyState === 4) {
                //request fail
                call(req.ecb, [trace, req], [trace]);
            }
        };

        if (isBuffer) {
            if (typeof req.request.responseType != 'string') {
                trace = H.getStackTrace(new Error('ArrayBuffer as responseType Not Supported!'));
                req.send = function() {
                    call(req.ecb, [null, trace, req], [trace]);
                };
                return req;
            } else {
                req.request.responseType = "arraybuffer";
            }
        }

        req.request.open(method, url, async);

        req.setRange = function(start, end) {
            start = ~~start;
            end = ~~end;
            if (!isNaN(start) && !isNaN(end)) req.request.setRequestHeader("Range", "bytes=" + start + "-" + end);
        };

        var send = function() {
            if (method === "POST") {
                if (!window["XDomainRequest"] || (window["XDomainRequest"] && !req.request instanceof window["XDomainRequest"])) {
                    //Note: XDomainRequest object only accept "text/plain" as it's Content-Type
                    req.request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
                    setTimeout(function() {
                        req.request.send(H.param(data));
                    }, 0);
                } else {
                    setTimeout(function() {
                        if (req.request.readyState === 1) {
                            req.request.send(H.param(data));
                        }
                    }, 0);
                }
            } else {
                if (window["XDomainRequest"] && req.request instanceof window["XDomainRequest"]) {
                    setTimeout(function() {
                        req.request.send(null);
                    }, 0);
                } else {
                    setTimeout(function() {
                        if (req.request.readyState === 1) {
                            req.request.send(null);
                        }
                    }, 0);
                }
            }
        };

        req.send = function() {
            try {
                send();
            } catch (e) {
                call(req.xcb, [e, trace, req], [trace]);
            }
        };

        return req;
    };

    N.req = N.ajax = function(url, options, data, callback, resultType, errcallback, trunkcallback) {
        var request = N.prepareRequest(url, options, data, resultType);

        if (callback) request.on('finish', callback);

        if (trunkcallback) request.on('chunk', trunkcallback);

        if (errcallback) request.on('error', errcallback);

        request.send();

        return request;
    };

    N.get = function(url, callback, errback, type, async) {
        return N.ajax(url, {
            method: 'GET',
            async: !!async || true
        },null, callback, type, errback);
    };

    N.WXajax = function(url, options, data, callback, resultType, errcallback, trunkcallback) {
        var request = N.prepareRequest(url, options, data, resultType);

        if (callback) request.on('finish', callback);

        if (trunkcallback) request.on('chunk', trunkcallback);

        if (errcallback) request.on('error', errcallback);

        request.dataType = 'JSONP';
        request.send();

        return request;
    };
    N.post = function(url, data, callback, errcb, type, async) {
        return N.ajax(url, {
            method: 'POST',
            async: !!async || true
        }, data, callback, type, errcb);
    };

    N.getAction = function(action, params, callback, errcb) {
        return N.get(H.getUrlByParams(N.newInnerServer, action, params), function(d, req) {
            if (d.s !== undefined) {
                if (d.s === 0) {
                    callback(d, req);
                } else {
                    errcb(d, req);
                }
            } else {
                callback(d, req);
            }
        }, errcb, "action");
};
    N.getWXAction = function(action, params, callback, errcb) {
        return N.get(H.getUrlByParams(N.WxServer, action, params), function(d, req) {
        if (d.s !== undefined) {
            if (d.s === 0) {
                callback(d, req);
            } else {
                errcb(d, req);
            }
        } else {
            callback(d, req);
        }
    }, errcb, "action");
    };
    N.testGetAction = function(action, params, callback, errcb) {
        return N.get(H.getUrlByParams(N.testServer, action, params), function(d, req) {
            if (d.s !== undefined) {
                if (d.s === 0) {
                    callback(d, req);
                } else {
                    errcb(d, req);
                }
            } else {
                callback(d, req);
            }
        }, errcb, "action");
    };

    N.WXGetAction = function (action,params,sucback,errback) {
        return N.WXajax(H.getUrlByParams(N.wxServerPath,action,params),{
            method: 'GET',
            async: !!null || true
        },null,function (msg){
            sucback(msg);
        },"action",errback);

    }
    N.postAction = function(action, params, data, callback, errcb) {
        return N.post(H.getUrlByParams(N.serverPath, action, params), data, callback, errcb, "action");
    };

    N.cGetAction = function(server, action, params, callback, errcb) {
        return N.get(H.getUrlByParams(server, action, params), callback, errcb, "action");
    };

    N.cPostAction = function(server, action, params, data, callback, errcb) {
        return N.post(H.getUrlByParams(server, action, params), callback, errcb, "action");
    };

    setInterval(function() {
        if (N.sequence && N.sequence.length > 0) {
            if (!N.sequenceBlocked) {
                var p = N.sequence[0];
                N.sequenceBlocked = true;
                //H.log("processing: " + p.action)
                N.sequenceRequest = N.getAction(p.action, p.params, function(data) {
                    N.sequence.shift();
                    N.sequenceRequest = null;
                    N.sequenceBlocked = false;
                    p.callback(data);
                }, function() {
                    N.sequence[0].tried = (N.sequence[0].tried || 0) + 1;
                    if (N.sequence[0].tried === 3) {
                        //give up
                        N.sequence.shift();
                        H.log("action failed after tried 3 times: " + p.action);
                    }
                    //try it again
                    N.sequenceRequest = null;
                    N.sequenceBlocked = false;
                    H.log("error");
                });
            } else if (!N.sequenceRequest) {
                //H.log("frozen list, defreezing...")
                N.sequenceBlocked = false;
            }
        }
    }, 50);

    N.sequenceAction = function(action, params, callback, errcb) {
        N.sequence = N.sequence || [];
        N.sequence.push({
            action: action,
            params: params,
            callback: callback,
            errcb: errcb
        });
    };

    /*
     * Exports
     */
    if (typeof define === "function" && define.amd) {
        define('N', ['H', 'E'], function() {});
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = N;
    }

    root.N = N;
}.call(this, this));
