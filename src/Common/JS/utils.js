/*
 * Unsafe functions
 */
;(function(root) {

    if (typeof module !== 'undefined' && module.exports) {
        root = GLOBAL;
    }

    function getStackTrace(title) {
        var callstack = ["Referenced From: " + title || ""];
        var i = {}, e = title instanceof Error ? title : new Error(callstack[0]);
        var lines, len;
        if (e.stack) {
            return e.stack;
        } else if (root.opera && e.message) { //Opera
            lines = e.message.split('\n');
            for (i = 2, len = lines.length; i < len; i++) {
                var entry = lines[i];
                //Append next line also since it has the file info
                if (lines[i+1]) {
                    entry += ' at ' + lines[i+1];
                    i++;
                }
                callstack.push(entry);
            }
            callstack.shift();
        } else { //IE and Safari
            //cause error on IE: this code will be executed in strict mode, and caller will be restricted to this function.
            try {
                var currentFunction = arguments.callee.caller;
                while (currentFunction) {
                    var fn = currentFunction.toString();
                    var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('')) || 'anonymous';
                    callstack.push(fname);
                    currentFunction = currentFunction.caller;
                }
            } catch(e) {
                console.log('Strict mode not working correctly with your browser, reporter: UH.getStackTrace.');
            }
        }
        return callstack.join('\n');
    }

    function printStackTrace(title) {
        console.error(getStackTrace(title));
    }

    try {
        //do not overwrite Object.prototype.printStackTrace, toString() may be harmful
        Error.prototype.printStackTrace = function() {
            printStackTrace(this);
        };
    } catch (e) {
        printStackTrace(e);
    }

    var unsafeHP = {};

    unsafeHP.printStackTrace = printStackTrace;
    unsafeHP.getStackTrace = getStackTrace;

    /*
     * Output & Define
     */
    var UH = unsafeHP;

    if (typeof define === 'function' && define.amd) {
        define('UH', [], function() {
            return UH;
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = UH;
    }

    root.UH = UH;
}).call(this, this);

/*
 * Safe functions
 */
(function(root){
    'use strict';

    /*
     * Basic Helpers depending on nothing
     */

    var isNodejs = false;

    if (typeof module !== 'undefined' && module.exports) {
        isNodejs = true;
        root = GLOBAL;
    }

    var navigator = root.navigator || {userAgent: ""};
    var hiddenProperty = function(fn) {
        return {
            value: fn,
            writable: false,
            configurable: false,
            enumerable: false
        };
    };

    var reservedPrototype = {
        ienumerable: true,
        ienumerables: true,
        __isRS__: true,
        __wrapped: true
    };

    var getIE = function() {
        //var v = root.$IE = parseInt((navigator.userAgent.split("MSIE ")[1] || "0").charAt(0));
        //return root.$IE || (isNaN(v) ? "0" : v);

        var MSIEs = navigator.userAgent.split('MSIE ')[1] || "0";
        var DNETs = navigator.userAgent.split('rv:')[1] || "0";

        MSIEs = MSIEs.split(".")[0];
        DNETs = DNETs.split(".")[0];

        var msie = ~~MSIEs;
        var dnet = ~~DNETs;

        if (msie != 0) {
            return msie;
        }
        if (dnet != 0) {
            return dnet;
        }

        return 0;
    };

    var isIE = function(v) {
        return getIE() == v;
    };

    var noop = function() {
        return function() {};
    };

    var isInteger = function(i) {
        return  /^-?\d+$/.test(i + "") || /^(-?\d+)e(\d+)$/.test(i + "");
    };

    var isFloat = function(v) {
        return /^(-?\d+)(\.\d+)?$/.test(v + "") || /^(-?\d+)(\.\d+)?e(-?\d+)$/.test(v + "");
    };

    var isObject = function(obj) {
        var type = typeof (arguments.length === 0 ? this : obj);
        return type === 'function' || type === 'object' && !!obj;
    };

    var isFunction = function(obj) {
        return typeof (arguments.length === 0 ? this : obj) === 'function';
    };

    //root.hasOwnProperty
    if (!root.hasOwnProperty) {
        root.hasOwnProperty = function(p) {
            //Note: in IE<9, p cannot be a function (for window)
            return !!root[p];
        };
    }

    /*
     * Shims
     */
    var addProperty = noop();
    //defineProperty in IE8 only accepts DOM elements as parameters, while in Safari 5 it's opposite
    if (!Object.defineProperty || (0 < getIE() <= 8 && navigator.userAgent.indexOf('MSIE') !== -1)) {
        addProperty = function(instance, k, descriptor) {
            instance[k] = descriptor.value;

            if (isObject(descriptor[k])) {
                instance[k].ienumerable = !descriptor.enumerable;
            } else {
                if (!instance[k].ienumerables) {
                    instance[k].ienumerables = [];
                }
                if (!descriptor.enumerable && instance[k].ienumerables instanceof Array) {
                    instance[k].ienumerables.push(k);
                } else if (instance['ienumerables']) {
                    instance['ienumerables'][k] = undefined;
                    delete instance['ienumerables'][k];
                }
            }

            //configurable, writable to be impl.
        };

        addProperty.__userDefined__ = true;

        //if (!Object.defineProperty) Object.defineProperty = addProperty;
    } else {
        addProperty = Object.defineProperty;
    }

    var createObject = function() {
        function F() {}

        return function(o, p) {
            F.prototype = o;
            var instance = new F();
            if (p) {
                //p is a descriptor with key name k
                //is this enough for replacing H.each(H.keys ?
                for (var k in p) {
                    if (p.hasOwnProperty(k)) addProperty(instance, k, p[k]);
                }
            }
            return instance;
        };
    }();

    //emulate legacy getter/setter API using ES5 APIs
    try {
        if (!Object.prototype.__defineGetter__ &&
            addProperty({},"x",{get: function(){return true;}}).x) {
            addProperty(Object.prototype, "__defineGetter__",
                {enumerable: false, configurable: true,
                    value: function(name,func)
                    {addProperty(this,name,
                        {get:func,enumerable: true,configurable: true});
                    }});
            addProperty(Object.prototype, "__defineSetter__",
                {enumerable: false, configurable: true,
                    value: function(name,func)
                    {addProperty(this,name,
                        {set:func,enumerable: true,configurable: true});
                    }});
        }
    } catch(defPropException) {/*Do nothing if an exception occurs*/}

    // Avoid `console` errors in browsers that lack a console.
    (function() {
        var method;
        var noop = function () {};
        var methods = [
            'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
            'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
            'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
            'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
        ];
        var length = methods.length;
        var console = root.console || {};
        if (!root.console) root.console = console;

        while (length--) {
            method = methods[length];

            // Only stub undefined methods.
            if (!console[method]) {
                console[method] = noop;
            }
        }
    }());

    /**
     * Implementation of standard Array methods (introduced in ECMAScript 5th
     * edition) and shorthand generics (JavaScript 1.8.5)
     *
     * Copyright (c) 2013 Alex K @plusdude
     * http://opensource.org/licenses/MIT
     */
    (function (global, infinity, undefined) {
        /*jshint bitwise:false, maxlen:95, plusplus:false, validthis:true*/
        "use strict";

        var Array = global['Array'];
        var Object = global['Object'];
        var Math = global['Math'];
        var Number = global['Number'];

        function toInteger(value) {
            var number = Number(value);
            return (
                number !== number ? 0 :
                    0 === number || infinity === number || -infinity === number ? number :
                    (0 < number || -1) * Math.floor(Math.abs(number))
            );
        }

        function slice(begin, end) {
            /*jshint newcap:false*/
            var result, elements = Object(this), length, index, count;
            length = elements.length >>> 0;
            if (undefined !== begin) {
                begin = toInteger(begin);
                index = 0 > begin ? Math.max(length + begin, 0) : Math.min(begin, length);
            } else {
                index = 0;
            }
            if (undefined !== end) {
                end = toInteger(end);
                length = 0 > end ? Math.max(length + end, 0) : Math.min(end, length);
            }
            result = new Array(length - index);
            for (count = 0; index < length; ++index, ++count) {
                if (index in elements) {
                    result[count] = elements[index];
                }
            }
            return result;
        }

        function indexOf(target, begin) {
            /*jshint newcap:false*/
            var elements = Object(this), length, index;
            length = elements.length >>> 0;
            if (undefined !== begin) {
                begin = toInteger(begin);
                index = 0 > begin ? Math.max(length + begin, 0) : Math.min(begin, length);
            } else {
                index = 0;
            }
            for (; index < length; ++index) {
                if (index in elements && target === elements[index]) {
                    return index;
                }
            }
            return -1;
        }
        function lastIndexOf(target, begin) {
            /*jshint newcap:false*/
            var elements = Object(this), length, index;
            length = elements.length >>> 0;
            if (undefined !== begin) {
                begin = toInteger(begin);
                index = 0 > begin ? length - Math.abs(begin) : Math.min(begin, length - 1);
            } else {
                index = length - 1;
            }
            for (; -1 < index; --index) {
                if (index in elements && target === elements[index]) {
                    return index;
                }
            }
            return -1;
        }

        function forEach(callback, scope) {
            /*jshint newcap:false*/
            var elements = Object(this), length, index;
            requireFunction(callback);
            length = elements.length >>> 0;
            for (index = 0; index < length; ++index) {
                if (index in elements) {
                    callback.call(scope, elements[index], index, elements);
                }
            }
        }

        function every(callback, scope) {
            /*jshint newcap:false*/
            var elements = Object(this), length, index;
            requireFunction(callback);
            length = elements.length >>> 0;
            for (index = 0; index < length; ++index) {
                if (index in elements &&
                    !callback.call(scope, elements[index], index, elements)) {
                    return false;
                }
            }
            return true;
        }

        function some(callback, scope) {
            /*jshint newcap:false*/
            var elements = Object(this), length, index;
            requireFunction(callback);
            length = elements.length >>> 0;
            for (index = 0; index < length; ++index) {
                if (index in elements &&
                    callback.call(scope, elements[index], index, elements)) {
                    return true;
                }
            }
            return false;
        }

        function filter(callback, scope) {
            /*jshint newcap:false*/
            var result = [], elements = Object(this), length, index, count;
            requireFunction(callback);
            length = elements.length >>> 0;
            for (index = count = 0; index < length; ++index) {
                if (index in elements && callback.call(scope, elements[index], index, elements)) {
                    result[count++] = elements[index];
                }
            }
            return result;
        }

        function map(callback, scope) {
            /*jshint newcap:false*/
            var result = [], elements = Object(this), length, index;
            requireFunction(callback);
            length = elements.length >>> 0;
            for (index = 0; index < length; ++index) {
                if (index in elements) {
                    result[index] = callback.call(scope, elements[index], index, elements);
                }
            }
            return result;
        }

        function reduce(callback, value) {
            /*jshint newcap:false*/
            var elements = Object(this), isset, length, index;
            requireFunction(callback);
            isset = undefined !== value;
            length = elements.length >>> 0;
            for (index = 0; index < length; ++index) {
                if (index in elements) {
                    if (isset) {
                        value = callback(value, elements[index], index, elements);
                    } else {
                        value = elements[index];
                        isset = true;
                    }
                }
            }
            requireValue(isset);
            return value;
        }

        function reduceRight(callback, value) {
            /*jshint newcap:false*/
            var elements = Object(this), isset, index;
            requireFunction(callback);
            isset = undefined !== value;
            index = (elements.length >>> 0) - 1;
            for (; -1 < index; --index) {
                if (index in elements) {
                    if (isset) {
                        value = callback(value, elements[index], index, elements);
                    } else {
                        value = elements[index];
                        isset = true;
                    }
                }
            }
            requireValue(isset);
            return value;
        }

        function isArray(value) {
            return "[object Array]" === Object.prototype.toString.call(value);
        }

        function requireFunction(value) {
            if ("[object Function]" !== Object.prototype.toString.call(value)) {
                throw new Error(value + " is not a function");
            }
        }

        function requireValue(isset) {
            if (!isset) {
                throw new Error("reduce of empty array with no initial value");
            }
        }

        function supportsStandard(key) {
            var support = true;
            if (Array.prototype[key]) {
                try {
                    Array.prototype[key].call(undefined, /test/, null);
                    support = false;
                } catch (e) {
                }
            } else {
                support = false;
            }
            return support;
        }

        function supportsGeneric(key) {
            var support = true;
            if (Array[key]) {
                try {
                    Array[key](undefined, /test/, null);
                    support = false;
                } catch (e) {
                }
            } else {
                support = false;
            }
            return support;
        }

        function extendArray(key) {
            if (!supportsGeneric(key)) {
                Array[key] = createGeneric(key);
            }
        }

        function createGeneric(key) {
            /** @public */
            return function (elements) {
                var list;

                if (undefined === elements || null === elements) {
                    throw new Error("Array.prototype." + key + " called on " + elements);
                }
                list = Array.prototype.slice.call(arguments, 1);
                return Array.prototype[key].apply(elements, list);
            };
        }

        var ES5 = {
            "indexOf": indexOf,
            "lastIndexOf": lastIndexOf,
            "forEach": forEach,
            "every": every,
            "some": some,
            "filter": filter,
            "map": map,
            "reduce": reduce,
            "reduceRight": reduceRight
        };
        for (var key in ES5) {
            if (ES5.hasOwnProperty(key)) {

                if (!supportsStandard(key)) {
                    Array.prototype[key] = ES5[key];
                }
                extendArray(key);
            }
        }
        Array.isArray = Array.isArray || isArray;

        [
            "concat",
            "join",
            "slice",
            "pop",
            "push",
            "reverse",
            "shift",
            "sort",
            "splice",
            "unshift"

        ].forEach(extendArray);

        /*jshint browser:true*/
        if (root.document) {
            try {
                Array.slice(document['childNodes']);
            } catch (e) {
                Array.prototype.slice = slice;
            }
        }
    }(root, 1 / 0));

    !(function () {
        'use strict';
        var i, /*p,*/ ml, method, methods,
            test = String('a');

        if (test[0]) {
            return;
        }

        // Inheriting from or iterating over String.prototype is not possible,
        //  nor does it work to iterate over '' or String instance, so we hard-code
        methods = ['charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf',
            'localeCompare', 'match', 'replace', 'search', 'slice',
            'split', 'substr', 'substring', 'toLocaleLowerCase',
            'toLocaleUpperCase', 'toLowerCase', 'toString', 'toUpperCase',
            'trim', 'valueOf'
        ];

        function addStringMethods (method) {
            return function () {
                // Using String.prototype gives stack error in IE, so we obtain from our test instance
                return test[method].apply(this._str, arguments);
            };
        }

        /**
         * @return String string value
         */
        function Str (str) {
            var i, strl;
            if (!(this instanceof Str)) {
                return "" + str;
            }

            str = str + ''; // Ensure converted (avoid converting with String() in case line above uncommented)
            this._str = str;
            this.length = strl = str.length;
            for (i = 0; i < strl; i++) {
                this[i] = str.charAt(i);
            }
        }

        for (i = 0, ml = methods.length; i < ml; i++) {
            method = methods[i];
            if (test[method]) { // Only add if supported (i.e., not trim())
                Str.prototype[method] = addStringMethods(method);
            }
        }

        if (!String.prototype.hasOwnProperty) {
            String.prototype.hasOwnProperty = function(p) {
                return !!String.prototype[p];
            };
        }

        // Default methods shouldn't be iteratable, but we want to grab any user-defined properties/methods
        for (method in String.prototype) {
            if (String.prototype.hasOwnProperty(method)) {
                Str.prototype[method] = addStringMethods(method);
            }
        }

        Str.prototype.constructor = String;
        String = Str;
    }());

    /*
     json2.js
     2015-05-03
     Public Domain.
     NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
     See http://www.JSON.org/js.html
     This is a reference implementation. You are free to copy, modify, or
     redistribute.
     */

    /*jslint
     eval, for, this
     */

    /*property
     JSON, apply, call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
     getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
     lastIndex, length, parse, prototype, push, replace, slice, stringify,
     test, toJSON, toString, valueOf
     */
    if (typeof root.JSON !== 'object') {
        root.JSON = {};
    }

    !(function () {
        'use strict';

        var rx_one = /^[\],:{}\s]*$/,
            rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
            rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
            rx_four = /(?:^|:|,)(?:\s*\[)+/g,
            rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
            rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

        function f(n) {
            return n < 10
                ? '0' + n
                : n;
        }

        function this_value() {
            return this.valueOf();
        }

        if (typeof Date.prototype.toJSON !== 'function') {

            Date.prototype.toJSON = function () {
                return isFinite(this.valueOf())
                    ? this.getUTCFullYear() + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate()) + 'T' +
                f(this.getUTCHours()) + ':' +
                f(this.getUTCMinutes()) + ':' +
                f(this.getUTCSeconds()) + 'Z'
                    : null;
            };

            Boolean.prototype.toJSON = this_value;
            Number.prototype.toJSON = this_value;
            String.prototype.toJSON = this_value;
        }

        var gap,
            indent,
            meta,
            rep;

        function quote(string) {
            rx_escapable.lastIndex = 0;
            return rx_escapable.test(string)
                ? '"' + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string'
                    ? c
                    : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"'
                : '"' + string + '"';
        }

        function str(key, holder) {

            var i,          // The loop counter.
                k,          // The member key.
                v,          // The member value.
                length,
                mind = gap,
                partial,
                value = holder[key];

            if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
                value = value.toJSON(key);
            }

            if (typeof rep === 'function') {
                value = rep.call(holder, key, value);
            }

            switch (typeof value) {
                case 'string':
                    return quote(value);
                case 'number':
                    return isFinite(value)
                        ? String(value)
                        : 'null';
                case 'boolean':
                case 'null':
                    return String(value);
                case 'object':
                    if (!value) {
                        return 'null';
                    }
                    gap += indent;
                    partial = [];
                    if (Object.prototype.toString.apply(value) === '[object Array]') {
                        length = value.length;
                        for (i = 0; i < length; i += 1) {
                            partial[i] = str(i, value) || 'null';
                        }
                        v = partial.length === 0
                            ? '[]'
                            : gap
                            ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                            : '[' + partial.join(',') + ']';
                        gap = mind;
                        return v;
                    }
                    if (rep && typeof rep === 'object') {
                        length = rep.length;
                        for (i = 0; i < length; i += 1) {
                            if (typeof rep[i] === 'string') {
                                k = rep[i];
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (
                                            gap
                                                ? ': '
                                                : ':'
                                        ) + v);
                                }
                            }
                        }
                    } else {
                        for (k in value) {
                            if (Object.prototype.hasOwnProperty.call(value, k)) {
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (
                                            gap
                                                ? ': '
                                                : ':'
                                        ) + v);
                                }
                            }
                        }
                    }
                    v = partial.length === 0
                        ? '{}'
                        : gap
                        ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                        : '{' + partial.join(',') + '}';
                    gap = mind;
                    return v;
            }
        }

        if (typeof JSON.stringify !== 'function') {
            meta = {    // table of character substitutions
                '\b': '\\b',
                '\t': '\\t',
                '\n': '\\n',
                '\f': '\\f',
                '\r': '\\r',
                '"': '\\"',
                '\\': '\\\\'
            };
            JSON.stringify = function (value, replacer, space) {
                var i;
                gap = '';
                indent = '';
                if (typeof space === 'number') {
                    for (i = 0; i < space; i += 1) {
                        indent += ' ';
                    }
                } else if (typeof space === 'string') {
                    indent = space;
                }
                rep = replacer;
                if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                    throw new Error('JSON.stringify');
                }
                return str('', {'': value});
            };
        }

        if (typeof JSON.parse !== 'function') {
            JSON.parse = function (text, reviver) {
                var j;
                function walk(holder, key) {
                    var k, v, value = holder[key];
                    if (value && typeof value === 'object') {
                        for (k in value) {
                            if (Object.prototype.hasOwnProperty.call(value, k)) {
                                v = walk(value, k);
                                if (v !== undefined) {
                                    value[k] = v;
                                } else {
                                    delete value[k];
                                }
                            }
                        }
                    }
                    return reviver.call(holder, key, value);
                }

                text = String(text);
                rx_dangerous.lastIndex = 0;
                if (rx_dangerous.test(text)) {
                    text = text.replace(rx_dangerous, function (a) {
                        return '\\u' +
                            ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                    });
                }

                if (
                    rx_one.test(
                        text
                            .replace(rx_two, '@')
                            .replace(rx_three, ']')
                            .replace(rx_four, '')
                    )
                ) {

                    j = eval('(' + text + ')');

                    return typeof reviver === 'function'
                        ? walk({'': j}, '')
                        : j;
                }
                throw new SyntaxError('JSON.parse');
            };
        }
    }());

    /*
     * Polyfills & Patches
     */

    //root.hasOwnProperty
    if (!root.hasOwnProperty) {
        root.hasOwnProperty = function(p) {
            //Note: in IE<9, p cannot be a function (for window)
            return !!root[p];
        };
    }

    if (root.jQuery) {
        jQuery.fn.slideLeftHide = function( speed, callback ) {
            this.animate( {
                width: "hide",
                paddingLeft: "hide",
                paddingRight: "hide",
                marginLeft: "hide",
                marginRight: "hide"
            }, speed, callback);
        };
        jQuery.fn.slideLeftShow = function( speed, callback ) {
            this.animate( {
                width: "show",
                paddingLeft: "show",
                paddingRight: "show",
                marginLeft: "show",
                marginRight: "show"
            }, speed, callback);
        };
    }

    Date.prototype.pattern=function(fmt) {
        var o = {
            "M+" : this.getMonth()+1, //月份
            "d+" : this.getDate(), //日
            "h+" : this.getHours()%12 === 0 ? 12 : this.getHours()%12, //小时
            "H+" : this.getHours(), //小时
            "m+" : this.getMinutes(), //分
            "s+" : this.getSeconds(), //秒
            "q+" : Math.floor((this.getMonth()+3)/3), //季度
            "S" : this.getMilliseconds() //毫秒
        };
        var week = {
            "0" : "\u65e5",
            "1" : "\u4e00",
            "2" : "\u4e8c",
            "3" : "\u4e09",
            "4" : "\u56db",
            "5" : "\u4e94",
            "6" : "\u516d"
        };

        if(/(y+)/.test(fmt)){
            fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
        }
        if(/(E+)/.test(fmt)){
            fmt=fmt.replace(RegExp.$1, ((RegExp.$1.length>1) ? (RegExp.$1.length>2 ? "\u661f\u671f" : "\u5468") : "")+week[this.getDay()+""]);
        }
        for(var k in o){
            if(o.hasOwnProperty(k) && new RegExp("("+ k +")").test(fmt)){
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length===1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
            }
        }
        return fmt;
    };

    root.requestAnimationFrame = (function() {
        return root.webkitRequestAnimationFrame ||
            root.requestAnimationFrame ||
            root.mozRequestAnimationFrame ||
            root.oRequestAnimationFrame ||
            root.msRequestAnimationFrame ||
            function(callback/*, element*/){
                return root.setTimeout(callback, 1000 / 60);
            };
    })();

    String.prototype.replaceAll = function(s1,s2){
        return this.replace(new RegExp(s1,"gm"),s2);
    };

    /*
     * helpers
     */
    var push = Array.prototype.push,
        slice = Array.prototype.slice,
        toString = Object.prototype.toString,
        hasOwnProperty = Object.prototype.hasOwnProperty;

    var nativeIsArray = Array.isArray,
        nativeKeys = Object.keys,
    //nativeBind = Function.bind,
        nativeCreate = Object.create;
    var Ctor = function(){};

    var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
    var nonEnumerableProps = ['valueOf', 'isPropertyOf', 'toString',
        'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

    var HP = {};

    function collectNonEnumProps(obj, keys) {
        var nonEnumIdx = nonEnumerableProps.length;
        var constructor = obj.constructor;
        var proto = (HP.isFunction(constructor) && constructor.prototype) || Object.prototype;

        var prop = 'constructor';
        if (HP.has(obj, prop) && !HP.arrayContains(keys, prop)) keys.push(prop);

        while (nonEnumIdx--) {
            prop = nonEnumerableProps[nonEnumIdx];
            if (prop in obj && obj[prop] !== proto[prop] && !HP.arrayContains(keys, prop)) {
                keys.push(prop);
            }
        }
    }

    var property = function(key) {
        return function(obj) {
            return obj == null ? void 0 : obj[key];
        };
    };

    // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
    var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
    var getLength = property('length');
    var isArrayLike = function(collection) {
        var length = getLength(collection);
        return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
    };

    function createIEnumerable(obj, proto) {
        var objProto = createObject(proto || null);

        var objKeys = HP.keys(obj);
        for (var i = objKeys.length + 1; --i;) {
            addProperty(objProto, objKeys[i - 1], hiddenProperty(obj[objKeys[i - 1]]));
        }

        return createObject(objProto);
    }

    /*
     * Properties
     */
    HP.likeIE = navigator.userAgent.indexOf('MSIE') !== -1;

    HP.ienumerable = true;

    HP.isObject = isObject;
    HP.isFunction = isFunction;
    HP.isFloat = isFloat;
    HP.isInteger = isInteger;
    HP.noop = noop;
    HP.isIE = isIE;
    HP.getIE = getIE;
    HP.isiPhone = navigator.userAgent.indexOf('iPhone') !== -1;
    HP.isLollipop = navigator.userAgent.indexOf('Android 5.') !== -1;
    HP.createIEnumerable = createIEnumerable;
    HP.isArrayLike = isArrayLike;

    HP.isCanvasSupported = function () {
        if (isNodejs) return false;
        var canvas = document.createElement('canvas');
        return HP.hasOwnProperty("cv") ? HP.cv : HP.cv = !!(canvas.getContext && canvas.getContext('2d'));
    };

    HP.isWebGLSupported = function () {
        if (isNodejs) return false;
        var canvas = document.createElement('canvas');
        return HP.hasOwnProperty("gl") ? HP.gl : HP.gl = !!(window['WebGLRenderingContext'] && canvas.getContext('webgl'));
    };

    HP.isCanvasSupported();
    HP.isWebGLSupported();

    HP.language = isNodejs ? "" : (navigator.language || navigator['browserLanguage'] || "").toLowerCase();

    HP.localStorage = {
        removeItem: function(key) {
            if (!root.hStorage) root.hStorage = {};
            root.hStorage[key] = undefined;
        },
        setItem: function(key, value) {
            if (!root.hStorage) root.hStorage = {};
            root.hStorage[key] = value;
        },
        getItem: function(key) {
            if (!root.hStorage) root.hStorage = {};
            return root.hStorage[key];
        }
    };

    if (!root.hasOwnProperty("sessionStorage") && !root.sessionStorage) {
        root.sessionStorage = HP.localStorage;
    }

    HP.secAddItem = function(key, value) {
        root.sessionStorage.removeItem(key);
        root.sessionStorage.setItem(key, value);
    };

    HP.getItem = function(key) {
        return root.sessionStorage.getItem(key);
    };

    HP.removeItem = function(key) {
        root.sessionStorage.removeItem(key);
    };

    HP.Request = {
        /**
         * @return {any}
         */
        QueryString : function(item){
            var svalue = location.search.match(new RegExp("[\?\&]" + item + "=([^\&]*)(\&?)","i"));
            return svalue ? svalue[1] : svalue;
        }
    };

    var log = function(d) {
        if ((H || HP).debug) console.log(d);
    };

    HP.log = function(d) {
        if (console && console.log) console.log(d);
    };

    var errlog = function(d, stackTrace) {
        if ((H || HP).debug) {
            HP.printStackTrace(d);
            if (stackTrace && !isArrayLike(stackTrace)) {
                console.error("Referenced From: " + stackTrace);
            } else if (stackTrace && isArrayLike(stackTrace)) {
                for (var i = stackTrace.length - 1; i > -1; i--) {
                    if (stackTrace[i]) console.error("Referenced From: " + stackTrace[i]);
                }
            }
        }
    };

    HP.newError = function(instantiatedMessage) {
        this.name = type;
        this.message = instantiatedMessage || message;
        this.stack = (new Error()).stack;
    };

    HP.newError.prototype = new Error();

    HP.getPrettyJson = function(jsonObject) {
        return JSON.stringify(jsonObject, null, "\t");
    };

    HP.now = Date.now || function() {
            return new Date().getTime();
        };

    HP.isArray = nativeIsArray || function(obj) {
            return toString.call(obj) === '[object Array]';
        };

    //retrieve names of object's own properties
    HP.keys = function(obj, strict) {
        if (!isObject(obj)) return [];
        if (nativeKeys) return nativeKeys(obj);
        var keys = [];
        //note: for-in in IE8 will iterate keys in a different sequence, comparing to chrome
        if (obj != null) for (var key in obj) if (hasOwnProperty.call(obj, key)) keys.push(key);
        if (hasEnumBug && strict) collectNonEnumProps(obj, keys);
        if (addProperty.__userDefined__) {
            var __getProto__accessor__ = HP.likeIE ? 'prototype' : '__proto__';
            var nkeys = [];
            for (var i = 0; i < keys.length; i++) {
                if (__getProto__accessor__ !== keys[i]) {
                    nkeys.push(keys[i]);
                }
            }
            return nkeys;
        } else {
            return keys;
        }
    };

    //retrieve names of all properties
    HP.allKeys = function(obj) {
        if (!isObject(obj)) return [];
        var keys = [];
        for (var key in obj) keys.push(key);
        if (hasEnumBug) collectNonEnumProps(obj, keys);
        return keys;
    };

    HP.values = function(obj) {
        var keys = HP.keys(obj);
        var length = keys.length;
        var values = new Array(length);
        for (var i = length + 1; --i;) {
            values[i - 1] = obj[keys[i - 1]];
        }
        return values;
    };

    // Invert the keys and values of an object. The values must be serializable.
    HP.invert = function(obj) {
        var result = {};
        var keys = HP.keys(obj);
        for (var i = 0, length = keys.length; i < length; i++) {
            result[obj[keys[i]]] = keys[i];
        }
        return result;
    };

    HP.has = function(obj, key) {
        return obj != null && hasOwnProperty.call(obj, key);
    };

    HP.contains = HP.arrayContains = HP.includes = HP.include = function(obj, item, fromIndex, guard) {
        if (!isArrayLike(obj)) obj = HP.values(obj);
        if (typeof fromIndex != 'number' || guard) fromIndex = 0;
        return HP.indexOf(obj, item, fromIndex) >= 0;
    };

    HP.strContains = function(str, sub) {
        return str.indexOf(sub) !== -1;
    };

    HP.strContainsIgnoreCase = function(str, sub) {
        return str.toLowerCase().indexOf(sub.toLowerCase()) !== -1;
    };

    HP.parseJson = function(json) {
        try {
            return JSON.parse(decodeURI(json));
        } catch (e) {
            try {
                return JSON.parse(json);
            } catch (e) {
                log(e);
            }
        }
        return undefined;
    };

    HP.cloneByParse = function(obj) {
        //for small pure object only. json is not good for big object
        return JSON.parse(JSON.stringify(obj));
    };

    HP.Event = {
        addHandler: function (oElement, sEvent, fnHandler) {
            oElement.addEventListener ? oElement.addEventListener(sEvent, fnHandler, false) : oElement.attachEvent("on" + sEvent, fnHandler)
        },
        removeHandler: function (oElement, sEvent, fnHandler) {
            oElement.removeEventListener ? oElement.removeEventListener(sEvent, fnHandler, false) : oElement.detachEvent("on" + sEvent, fnHandler)
        }
    };

    HP.EventDispatcher = function() {
        return {
            listeners: {},
            attachListener: function(key, cb) {
                this.listeners[key] = this.listeners[key] || {};
                cb.uuid = cb.uuid || HP.fastUuid();
                this.listeners[key][cb.uuid] = cb;
                return cb.uuid;
            },
            fire: function(key, data) {
                if (this.listeners[key]) {
                    HP.each(HP.wrap(this.listeners[key]), function(cb) {
                        if (cb && typeof cb === 'function' && !cb.blocked) {
                            try {
                                cb(data);
                            }catch(e) {
                                log(e)
                            }
                        }
                    });
                }
            },
            removeListener: function(key, func) {
                if (this.listeners[key]) {
                    this.listeners[key] = HP.each(this.listeners[key], function(listener) {
                        if (listener.uuid !== func.uuid) return listener;
                    }).merge();
                }
            },
            clearListener: function(key) {
                this.listeners[key] = undefined;
                delete this.listeners[key];
            }
        };
    };

    HP.insist = function(fn) {
        var result;
        HP.each(HP.range(0, 10), function() {
            result = fn();
            if (result) {
                throw {identifier: 'stopiterating'};
            }
            setTimeout(HP.noop(), 200);
        });
        if (!result) {
            console.error('Caution: target insisted remains undefiend: ' + fn);
        }
    };

    /*
     * DOM Properties
     */
    HP.widthOf = function(ele) {
        return ele.innerWidth || ele.clientWidth;
    };

    HP.heightOf = function(ele) {
        return ele.innerHeight || ele.clientHeight;
    };

    HP.parentOf = function(ele) {
        return ele.parentElement || ele.parentNode;
    };

    HP.windowWidth = function() {
        return root.innerWidth || (document.compatMode == "BackCompat" ? document.body.clientWidth : document.documentElement.clientWidth);
    };

    HP.windowHeight = function() {
        return root.innerHeight || (document.compatMode == "BackCompat" ? document.body.clientHeight : document.documentElement.clientHeight);
    };

    HP.escape2Html = HP.unescape || function(str) {
            var arrEntities={'lt':'<','gt':'>','nbsp':' ','amp':'&','quot':'"'};
            return str.replace(/&(lt|gt|nbsp|amp|quot);/ig,function(all,t){return arrEntities[t];});
        };

    HP.encodeHTML = function(url) {
        return url.replaceAll('#', '%23');
    };

    HP.translateFromWindowToCanvas = function(canvas, x, y) {
        var bbox = canvas.getBoundingClientRect();

        return {
            x: x - bbox.left - (bbox.width - canvas.width) / 2,
            y: y - bbox.top - (bbox.height - canvas.height) / 2
        };
    };

    //TODO: css value type inspect & transform
    HP.css = function(ele, attr, val) {
        if (this === HP) {
            //implicit
        } else {
            val = attr;
            attr = ele;
            ele = this;
        }
        if (val == undefined && typeof attr == 'string') {
            return window.getComputedStyle(ele)[attr];
        }
        if (typeof attr == 'string') {
            if (isArrayLike(ele)) {
                if (ele.length === 1) {
                    ele[0].style[attr] = val;
                } else {
                    HP.every(ele, function(e) {
                        e.style[attr] = val;
                    });
                }
            } if (ele instanceof Element) {
                //implicit set
                ele.style[attr] = val;
            }
        } else if (isObject(attr)) {
            //attr-val object
            if (isArrayLike(ele)) {
                if (ele.length === 1) {
                    HP.every(attr, function(v, a) {
                        ele[0].style[a] = v;
                    });
                } else {
                    HP.every(attr, function(v, a) {
                        HP.every(ele, function(e) {
                            e.style[a] = v;
                        });
                    });
                }
            } if (ele instanceof Element) {
                //implicit set
                HP.every(attr, function(v, a) {
                    ele.style[a] = v;
                });
            }
        }
    };

    HP.text = function(ele, text) {
        if (this === HP) {
            //implicit
        } else {
            text = ele;
            ele = this;
        }
        if (text == undefined) text = "";
        if (isArrayLike(ele)) {
            HP.every(ele, function(e) {
                while (e.firstChild) {
                    e.removeChild(e.firstChild);
                }
                e.appendChild(document.createTextNode(text));
            });
        } else if (ele instanceof Element) {
            while (ele.firstChild) {
                ele.removeChild(ele.firstChild);
            }
            ele.appendChild(document.createTextNode(text));
        }
    };

    HP.attribute = function(ele, attr, val) {
        if (this === HP) {
            //implicit
        } else {
            val = attr;
            attr = ele;
            ele = this;
        }
        if (val == undefined) {
            return ele.getAttribute(attr);
        } else if (isArrayLike(ele)) {
            //for Array-Like, can only be a setter
            if (ele.length === 1) {
                ele[0].setAttribute(attr, val);
            } else {
                HP.every(ele, function(e) {
                    e.setAttribute(attr, val);
                });
            }
        } if (ele instanceof Element) {
            //implicit set
            ele.setAttribute(attr, val);
        }
    };

    HP.click = function(ele, func) {
        if ((this instanceof Element || isArrayLike(this)) && !func) {
            func = ele;
            ele = this;
        }
        if (!func) {
            //fire event
            if (ele['onclick'] && typeof ele['onclick'] == 'function') {
                ele['onclick'].apply(ele);
            }
        } else {
            //bind event
            //TODO: extract isArrayLike to a individual function
            if (isArrayLike(ele)) {
                if (ele.length === 1) {
                    if (ele[0] instanceof Element) {
                        ele[0].onclick = func;
                    }
                } else {
                    HP.every(ele, function(e) {
                        if (e instanceof Element) e.onclick = func;
                    });
                }
            } else if (ele instanceof Element) {
                ele.onclick = func;
            }
        }
    };

    HP.cloneDom = function(ele) {
        if (!ele && this && (this instanceof Element || isArrayLike(this))) {
            ele = this;
        }
        if (ele) {
            var clone;
            if (ele instanceof Element) {
                clone = Element.prototype.cloneNode;
            } else if (isArrayLike(ele)) {
                if (ele.length === 1) {
                    clone = function() {
                        return Element.prototype.cloneNode.apply(ele[0], [true]);
                    };
                } else {
                    clone = function(deep) {
                        return HP.coreEach(ele, function(e) {
                            if (e instanceof Element) {
                                return Element.prototype.cloneNode.apply(e, [deep]);
                            }
                        }, {noEmpty: 1});
                    };
                }
            } else {
                //console.log('')
            }
            return clone.apply(ele, [true]);
        }
    };

    HP.append = function(ele, children) {
        if (!children && (this instanceof Element || isArrayLike(this))) {
            children = ele;
            ele = this;
        }
        if (ele) {
            if (isArrayLike(children) && children.length > 1) {
                HP.every(children, function(child) {
                    if (child instanceof Element) {
                        ele.appendChild(child);
                    }
                });
            } else if (isArrayLike(children)) {
                if (children[0] instanceof Element) {
                    ele.appendChild(children[0]);
                }
            } else if (children instanceof Element) {
                ele.appendChild(children);
            }
        }
    };

    /*
     * Cef Interactions
     */
    HP.cefQuery = root.cefQuery || function() {
            if (root.H && root.H.debug) console.log(arguments[0]);
        };

    HP.callCef = function(req, persistent, onsuccess, onfailure) {
        return HP.cefQuery({
            request: req || "",
            persistent: !!persistent,
            onSuccess: onsuccess || function(response) {},
            onFailure: onfailure || function(err_code, err_msg) {}
        })
    };

    /*
     * Array-Related
     */
    HP.range = function(start, stop, step) {
        if (stop == null) {
            stop = start || 0;
            start = 0;
        }
        step = step || 1;

        var length = Math.max(Math.ceil((stop - start) / step), 0);
        var range = new Array(length);

        for (var idx = 0; idx < length; idx++, start += step) {
            range[idx] = start;
        }

        return range;
    };

    HP.indexOf = function(arr, item, idx) {
        //TODO: build a sorted index array, use binary search to find origin index, not now
        var keyArr = isArrayLike(arr) ? arr : HP.keys(arr);
        if (typeof idx === 'undefined') {
            idx = 0;
        } else if (idx > keyArr.length) {
            return -1;
        }
        for (var i = idx; i < keyArr.length; i++) {
            if (keyArr[i] == item) {
                return i;
            }
        }
        return -1;
    };

    HP.extractKey = function(obj, key) {
        var keys = HP.keys(obj);
        var narr = [];
        for (var i = 0; i < keys.length; i++) {
            narr.push(obj[keys[i]][key]);
        }
        return narr;
    };

    HP.shuffle = function(obj) {
        var s = isArrayLike(obj) ? obj : HP.values(obj);
        var length = s.length;
        var shuffled = new Array(length);
        var rand;
        do {
            rand = HP.random(0, length - 1);
            if (rand === length - 1) shuffled[length - 1] = shuffled[rand];
            shuffled[rand] = s[length - 1];
        } while(--length);
        return shuffled;
    };

    HP.sample = function(obj, n, guard) {
        if (n == null || guard) {
            if (!isArrayLike(obj)) obj = HP.values(obj);
            return obj[HP.random(obj.length - 1)];
        }
        return HP.shuffle(obj).slice(0, Math.max(0, n));
    };

    /*
     * Function-Related
     */
    var baseCreate = function(prototype) {
        if (!_.isObject(prototype)) return {};
        if (nativeCreate) return nativeCreate(prototype);
        Ctor.prototype = prototype;
        var result = new Ctor;
        Ctor.prototype = null;
        return result;
    };

    // Determines whether to execute a function as a constructor
    // or a normal function with the provided arguments
    var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
        if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
        var self = baseCreate(sourceFunc.prototype);
        var result = sourceFunc.apply(self, args);
        if (isObject(result)) return result;
        return self;
    };

    // Partially apply a function by creating a version that has had some of its
    // arguments pre-filled, without changing its dynamic `this` context. _ acts
    // as a placeholder, allowing any combination of arguments to be pre-filled.
    HP.partial = function(func) {
        var boundArgs = slice.call(arguments, 1);
        var bound = function() {
            var position = 0, length = boundArgs.length;
            var args = new Array(length);
            for (var i = 0; i < length; i++) {
                args[i] = boundArgs[i] === HP ? arguments[position++] : boundArgs[i];
            }
            while (position < arguments.length) args.push(arguments[position++]);
            return executeBound(func, bound, this, this, args);
        };
        return bound;
    };

    HP.debounce = function(func, wait, immediate) {
        var timeout, args, context, timestamp, result;

        var later = function() {
            var last = HP.now() - timestamp;

            if (last < wait && last >= 0) {
                timeout = setTimeout(later, wait - last);
            } else {
                if (!immediate) {
                    result = func.apply(context, args);
                    if (!timeout) context = args = null;
                }
            }
        };

        return function() {
            context = this;
            args = arguments;
            timestamp = HP.now();
            var callNow = immediate && !timeout;
            if (!timeout) timeout = setTimeout(later, wait);
            if (callNow) {
                result = func.apply(context, args);
                context = args = null;
            }

            return result;
        };
    };

    HP.delay = function(func, wait) {
        var args = slice.call(arguments, 2);
        return setTimeout(function() {
            return func.apply(null, args);
        }, wait);
    };

    HP.throttle = function(func, wait, options) {
        var context, args, result;
        var timeout = null;
        var previous = 0;
        if (!options) options = {};
        var later = function() {
            previous = options.leading === false ? 0 : HP.now();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        };
        return function() {
            var now = HP.now();
            if (!previous && options.leading === false) previous = now;
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            } else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
            }
            return result;
        };
    };

    // Returns a function that will only be executed on and after the Nth call.
    HP.after = function(times, func) {
        return function() {
            if (--times < 1) {
                return func.apply(this, arguments);
            }
        };
    };

    // Returns a function that will only be executed up to (but not including) the Nth call.
    HP.before = function(times, func) {
        var memo;
        return function() {
            if (--times > 0) {
                memo = func.apply(this, arguments);
            }
            if (times <= 1) func = null;
            return memo;
        };
    };

    HP.once = HP.partial(HP.before, 2);

    /*
     * Promise-Compatible
     */

    HP.find = function(list, fn) {
        if (isFunction(fn)) {
            var isarr = isArrayLike(list);
            var keys;
            if (!isarr) keys = HP.keys(list);
            var i = isarr ? list.length : keys.length;
            if (i === 0) return;
            var k;
            for (i += 1;--i;) {
                k = isarr ? (i - 1) : keys[i - 1];
                if (fn(list[k], k)) {
                    return list[k];
                }
            }
            return;
        }
        errlog('HP.find error: iterating via ' + fn + ' which should be a function');
        return undefined;
    };

    HP.sortBy = function(list, fn) {
        var keys = [];
        if (!isArrayLike(list)) {
            list = HP.values(list);
            keys = HP.keys(list);
        } else {
            keys = HP.range(list.length);
        }

        if (!isObject(list)) {
            errlog('HP.sortBy error: try to sort a primitive value');
            return;
        }

        if (!isFunction(fn)) {
            //sort by field
            var field = fn;
            fn = function(obj) {
                return obj[field];
            };
        }

        var idx = new Array(list.length);

        var i = list.length;
        if (i === 0) return;
        var k;
        do {
            //use a local variable to store current key
            //cuz the HP.values() don't return things in a right sequence in IE8
            k = keys[i - 1];
            idx[k] = {
                index: i - 1,
                value: list[k],
                it: fn(list[k])
            };
        } while (--i);

        //returns a value list
        return HP.extractKey(idx.sort(function(left, right) {
            if (left.it < right.it) {
                return -1;
            } else if (left.it > right.it) {
                return 1;
            }
            return 0;
        }), 'value');
    };

    HP.groupBy = function(list, fn) {
        var keys = [];
        var values = HP.wrap();

        if (typeof fn === 'string') {
            var key = fn;
            fn = function(obj) {
                return obj[key];
            };
        }

        HP.each(list, function(item) {
            if (item !== undefined) {
                var key = fn.call(item, item);
                var indexL = keys.indexOf(key);
                if (indexL === -1) {
                    //new key
                    indexL = keys.length;
                    keys.push(key);
                }
                //now indexL is key's index
                if (!values[indexL]) values[indexL] = [];
                values[indexL].push(item);
            }
        });
        return HP.wrap(values.toArray());
    };

    /*
     * Experimental extreme-fast iterator
     */
    HP.forEach = function(array, iterator) {
        if (!isArrayLike(array)) array = H.wrap(array).toArray();
        var l = array.length;
        var length = l;
        for (l++; --l;) {
            iterator(length - l, array[length - l]);
        }
    };

    /*
     * Option Spec
     *
     * key: stopper (function) judgement function to stop iterating
     * key: noRS (boolean) should not use ResultSet
     * key: dropResult (boolean) should not reserve result
     * key: noEmpty (boolean) should not include undefined value (for object/asobject only)
     * key: asObject (boolean) should always check H.keys()
     * key: noValidation (boolean) should not check key legitimacy
     * key: debug (boolean) use try-catch
     *
     * eachKey: coreEach(H.keys())
     * eachIndex: coreEach(H.range())
     *
     * NOTE:
     *
     * Example:
     * H.each test 1100
     * -debug: 747
     * -H.wrap: 452
     * H.wrap() itself doesn't cost too much, but v8_setProto costs much
     */
    HP.coreEach = function(object, iteratee, options, stackTraceStack) {
        options = options || {};
        var stopper = options.stopper;
        var noRS = options.noRS;
        var drop = options.dropResult;
        var noEmpty = options.noEmpty;
        var asObject = options.asObject;
        var noValidation = options.noValidation;

        //WARN: accessing root.anything is EXTREMELY slow
        if (options.debug || (H || HP).debug) {
            var olditeratee = iteratee;
            if (!stackTraceStack) {
                stackTraceStack = [];
            }
            if (!isArrayLike(stackTraceStack)) {
                stackTraceStack = [stackTraceStack];
            }
            iteratee = function() {
                try {
                    return olditeratee.apply(null, arguments);
                } catch (e) {
                    stackTraceStack.push(HP.getStackTrace(e));
                    errlog('Bug sacked: ', stackTraceStack);
                }
            };
        }

        if (object === undefined) {
            //WARN: log and errlog is SLOW due to accessing root.debug and printing out
            errlog('Iterating over undefined ', stackTraceStack);
            return;
        }

        var isarray = isArrayLike(object) && !asObject;
        var baseResult = isarray ? [] : {};
        var iterator = noRS ? baseResult : HP.wrap(baseResult);

        if (!noValidation && object.ienumerable) {
            console.warn('Iterating over ienumerable object.');
            return baseResult;
        }

        if (isarray) {
            if (object.length === 0) return drop ? undefined : iterator;
            var l = object.length;
            var cl = 0;
            if (stopper) {
                //find
                for (l += 1; --l;) {
                    iterator[cl] = iteratee(object[cl], cl, object, iterator);
                    if (stopper(iterator[cl])) {
                        return iterator;
                    }
                    cl++;
                }
            } else {
                //each: isarray has no noEmpty option cuz delete array[i] equals to a[i] = undefined
                for (l += 1; --l;) {
                    iterator[cl] = iteratee(object[cl], cl, object, iterator);
                    cl++;
                }
            }
        } else {

            var banned = {};

            if (!noValidation && !!object['ienumerables'] && object['ienumerables'] !== []) {
                //check key validation
                var k = object['ienumerables'].length;
                //shortened do-while to a for loop, not tested
                if (k !== 0) for (k += 1; --k;) {
                    banned[object['ienumerables'][k - 1]] = true;
                }
            }

            var keys = HP.keys(object);
            var i = keys.length;
            var ki = 0, key;

            if (i === 0) return drop ? undefined : iterator;

            var it, ci = 0;
            for (i += 1; --i;) {
                it = keys[ci];

                //force check reserved prototype names
                if (reservedPrototype[it]) {
                    keys[ci] = undefined;
                }
                if (!noValidation && (banned[it] || it.ienumerable)) {
                    keys[ci] = undefined;
                }
                ci++;
            }

            if (stopper) {
                for (i = keys.length + 1; --i;) {
                    key = keys[ki++];
                    if (key) {
                        iterator[key] = iteratee(object[key], key, object, iterator);
                        if (noEmpty && iterator[key] === undefined) {
                            delete iterator[key];
                        }
                        if (stopper(object[key])) {
                            return !asObject ? HP.values(iterator) : iterator;
                        }
                    }
                }
            } else {
                for (i = keys.length + 1; --i;) {
                    key = keys[ki++];
                    if (key) {
                        iterator[key] = iteratee(object[key], key, object, iterator);
                        if (noEmpty && iterator[key] === undefined) {
                            delete iterator[key];
                        }
                    }
                }
            }
        }
        if (!drop) {
            return iterator;
        }
    };

    //no result
    HP.every = function(list, iteratee, stackStack) {
        HP.coreEach(list, iteratee, {
            dropResult: 1
        }, stackStack);
    };

    //return array
    HP.map = function(list, iteratee, stackStack) {
        return HP.coreEach(list, iteratee, {
            noEmpty: 1,
            asObject: 0
        }, stackStack);
    };

    //find
    HP.until = function(list, iteratee, stackStack) {
        return HP.coreEach(list, function() {}, {
            stopper: iteratee
        }, stackStack);
    };

    HP.each = HP.coreEach;

    /*
     * @parameter list: list or object to iterate
     * @parameter iteratee: handler on each value inside list, iteratee(value, key, list, resultSet)
     * @parameter nocheck: don't check illegal fields like 'ienumerables'
     * @parameter nostop: no internal stop will be fired
     * @parameter eachKeyIteratee: specified key iteratee, eachKeyIteratee(key)
     * @parameter noRS: boolean, don't return ResultSet for promise
     * @parameter forceCheckKeys: force always check keys
     * @parameter ignoreUndefined: ignore undefined key
     */
    HP.ceach = function(list, iteratee, nocheck, nostop, eachKeyIteratee, noRS, forceCheckKeys, ignoreUndefined, stackTrace) {

        function processEachError (e, key) {
            log("Received exception inside HP.each: " + e);

            //NOTE: can use "throw {identifier:'stopiterating'} inside iteratee to stop iterating
            //NOTE: can use "throw {margin:true}" inside iteratee to left key undefined rather than 'Not Defined'

            if (!e.margin) {
                iterator[key] = undefined;
                delete iterator[key];
            }
            if (e instanceof Error) {
                errlog('Error: iterating over unexcepted key: ' + key , stackTrace);
            }
        }

        if (list === undefined) {
            errlog('Iterating over undefined object', stackTrace);
        }

        var iterator = noRS ? {} : HP.wrap();

        var isarray = isArrayLike(list);

        if (!isarray || forceCheckKeys) {
            var keys, i;

            var banned = {};

            var shouldCheck = !!list['ienumerables'] && list['ienumerables'] !== [];

            if (!nocheck && shouldCheck) {
                var k = list['ienumerables'].length;
                //shortened do-while to a for loop, not tested
                if (k !== 0) for (k += 1; --k;) {
                    banned[list['ienumerables'][k - 1]] = true;
                }
            }

            keys = HP.keys(list);
            i = keys.length;

            if (i === 0) return iterator;

            var it, ci = 0;
            for (i += 1; --i;) {
                it = keys[ci];

                if (reservedPrototype[it]) {
                    keys[ci] = undefined;
                }
                if (!nocheck && shouldCheck && (banned[it] || it.ienumerable)) {
                    keys[ci] = undefined;
                }
                ci++;
            }

            HP.find(keys, eachKeyIteratee || function(key) {
                    if (!key) return false;

                    if (nostop) {
                        iterator[key] = iteratee(list[key], key, list, iterator);
                        if (!iterator[key]) delete iterator[key];
                        return false;
                    }
                    try {
                        iterator[key] = iteratee(list[key], key, list, iterator);
                        if (!iterator[key]) delete iterator[key];
                    } catch (e) {
                        processEachError(e, key);
                        return (e.identifier && e.identifier === 'stopiterating');
                    }
                });
        } else {
            if (list.length === 0) return;
            var cIteratee = eachKeyIteratee || function(key, val, control) {
                    if (nostop) {
                        iterator[key] = iteratee(val, key, list, iterator);
                        if (!iterator[key]) delete iterator[key];
                    } else {
                        try {
                            iterator[key] = iteratee(val, key, list, iterator);
                            if (!iterator[key]) delete iterator[key];
                        } catch (e) {
                            processEachError(e, key);
                            if (e.identifier && e.identifier === 'stopiterating') {
                                control.s = 1;
                            }
                        }
                    }
                };
            var l = list.length;
            var s = {
                s : 0
            };
            var cl = 0;
            for (l += 1; --l;) {
                cIteratee(cl, list[cl], s);
                if (s.s) break;
                cl++;
            }
        }

        return iterator;
    };

    HP.eachIndex = function() {
        var length = arguments.length;
        //accept 2-4 arguments only.
        if (length < 2 || length > 4) {
            return;
        }
        var start = length > 2 ? arguments[0] : 0;
        var end = length === 2 ? arguments[0] : arguments[1];
        var step = length >= 4 ? arguments[2] : 1;
        var iteratee = arguments[length - 1];

        //end, iteratee
        //start, end, iteratee
        //start, end, step, iteratee
        var rs = HP.wrap();
        var i = 0;

        if (step === 1) {
            //short for is faster than dowhile
            var ci = start;
            for (i = end - start + 1; --i;) {
                rs[ci] = iteratee(ci, ci);
                ci++;
            }
            return rs;
        } else {
            do {
                rs[start] = iteratee(start, i++);

                start += step;
            } while (start <= end);
            return rs;
        }
    };

    /*
     * ResultSet-Related
     */
    var RS = {};

    RS.each = RS.forEach = function() {
        return HP.each.apply(HP, [this].concat(Array.prototype.slice.call(arguments)));
    };

    RS.filter = function(fn) {
        return HP.coreEach(this, function(o) {
            if (fn(o)) {
                return o;
            }
        }, {noEmpty: 1});
    };

    RS.sortBy = function(fn) {
        return HP.sortBy(this, fn);
    };

    RS.toArray = function() {
        return HP.values(this);
    };

    RS.groupBy = function(fn) {
        return HP.groupBy(this, fn);
    };

    RS.join = function(separator) {
        return HP.values(this).join(separator || "");
    };

    RS.sum = function() {
        var s = 0;
        HP.each(this, function(v) {
            var nv = isInteger(v) ? parseInt(v) : isFloat(v) ? parseFloat(v) : NaN;
            if (!isNaN(v)) {
                s += nv;
            }
        });
        return s;
    };

    RS.Length = function() {
        return HP.values(this).length;
    };

    RS.merge = function() {
        return this;
    };

    RS.values = function() {
        return HP.values(this);
    };

    RS.css = HP.css;

    RS.text = HP.text;

    RS.attribute = HP.attr;

    RS.clone = HP.cloneDom;

    RS.append = HP.append;

    HP.RSProto = createIEnumerable(RS);
    addProperty(HP.RSProto, '__isRS__', hiddenProperty(true));

    var __innerFunc = function() {};
    __innerFunc.prototype = HP.RSProto;

    HP.wrap = HP.RSFactory = function(data) {
        if (!data) return new __innerFunc();

        if (!data.__isRS__) {
            var r = HP.__replaceRootProto__(data, __innerFunc);
            if (r) return r;
        }

        return data;
    };

    HP.fastWrap = function() {
        return new __innerFunc();
    };

    //TODO: NOTE: modify HTMLElement-Element's prototype chain will fail jQuery but acceptable

    //TODO: what if I cannot modify __proto__?

    //TODO: to be impl.
    var H$ = function(selector) {
        var result;
        if (typeof selector == 'string') {
            //TODO: pre process selector
            if (selector[0] === '#') {
                result = document.getElementById(selector.substring(1));
            } else if (selector[0] === '.') {
                result = document.getElementsByClassName(selector.substring(1));
            } else {
                result = document.getElementsByTagName(selector);
            }
        }
        return result;
    };

    if (Element.prototype.querySelectorAll) {
        H$ = function() {
            var func = this ? Element.prototype.querySelectorAll : document.querySelectorAll;
            return HP.wrap(func.apply(this || document, arguments));
        };
    }

    root.H$ = H$;

    //Patch Element(Prototype of HTMLElement)
    //in Safari, typeof Element === 'object'
    if (window.Element != undefined) {
        var RSKeys = HP.keys(RS);
        for (var i = RSKeys.length + 1; --i;) {
            Element.prototype[RSKeys[i - 1]] = RS[RSKeys[i - 1]];
        }

        Element.prototype.__isDOM__ = true;
        Element.prototype.css = HP.css;
        Element.prototype.text = HP.text;
        Element.prototype.find = H$;
        //NOTE: overriding attribute name `attr` breaks AngularJS's jqLite at `removeClass`
        Element.prototype.attribute = HP.attribute;
        ////NOTE: cannot overwrite Element.click
        Element.prototype.clicked = HP.click;
        //Element.prototype.clone = HP.cloneDom;
        //Element.prototype.append = HP.append;
    }

    HP.__getProto__ = function(obj) {
        if (Object.getPrototypeOf) return Object.getPrototypeOf(obj);
        if (obj.__proto__) return obj.__proto__;
        return obj.constructor.prototype;
    };

    HP.__setProto__ = function(obj, proto) {
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(obj, proto);
        } else if (obj.__proto__) {
            obj.__proto__ = proto;
        } else if (obj.prototype) {
            obj.prototype = proto;
        } else {
            var p = createObject(proto);
            HP.each(obj, function(v, k) {
                addProperty(p, k, hiddenProperty(v));
            });
            return p;
        }
    };

    HP.__getProto__accessor__ = HP.likeIE ? 'prototype' : '__proto__';

    HP.__replaceRootProto__ = function(obj, proto) {
        if (!isObject(obj)) {
            errlog('Attempt to replace the prototype of a non-object item: ' + obj);
            return;
        }
        var p = obj;
        //NOTE: accessing property via local variable is slower than dot notation or bracket notation
        //dot and bracket notations are equal
        //but while accessing prototype, the operand will not always be big objects, so speed is not the issue
        var pp = HP.__getProto__(p);
        while (pp !== undefined && pp !== Object.prototype && pp !== Array.prototype) {
            if (pp == proto) {
                return;
            }
            p = pp;
            pp = HP.__getProto__(p);
        }
        if (!p) {
            errlog('Unexpected error: cannot find the root prototype of ' + obj);
        }
        var k = HP.__setProto__(p, HP.RSProto);
        if (k) return k;
    };

    HP.basedOnObject = function(obj) {
        return obj[HP.__getProto__accessor__] == Object.prototype;
    };

    /*
     * Math Utils
     */
    HP.hypot = Math.hypot || function() {
            return Math.sqrt(HP.each(arguments, function(arg) {
                return arg * arg;
            }).sum());
        };

    HP.log2 = Math.log2 || function(number) {
            return Math.log(number) / Math.log(2);
        };

    HP.varInRange = function(v, v0, v1) {
        return (v - v0) * (v - v1) < 0;
    };

    HP.pointInRect = function(p, p0, p1) {
        var result = true;
        HP.each(p, function(ele, index) {
            result &= HP.varInRange(ele, p0[index], p1[index]);
        });
        return result;
    };

    HP.degToRad = function(degree) {
        return (degree / 180.0) * Math.PI;
    };

    HP.radToDeg = function(rad) {
        return rad * 180.0 / Math.PI;
    };

    HP.standardizeDegree = function(degree) {
        var floor = Math.floor(degree / 360.0);
        return degree - floor * 360.0;
    };

    HP.standardizeRad = function(rad) {
        var floor = Math.floor(rad / (2 * Math.PI));
        return rad - floor * 2 * Math.PI;
    };

    //in rad
    HP.rectToPolar = function(coor) {
        var r = HP.hypot(coor[0], coor[1]);
        var absTheta = Math.atan2(Math.abs(coor[1]), Math.abs(coor[0])); // in rad
        var signal = coor[0] * coor[1] < 0;
        if (coor[0] >= 0) {
            if (coor[1] >= 0) {
                return [r, absTheta];
            } else {
                return [r, 2 * Math.PI - absTheta];
            }
        } else {
            return [r, Math.PI + (signal ? -1 : 1) * absTheta];
        }
    };

    HP.polarToRect = function(coor) {
        var cA = Math.cos(coor[1]);
        var sA = Math.sin(coor[1]);
        return [coor[0] * cA, coor[0] * sA];
    };

    HP.latToMeter = function(delta) {//in meters
        return 40008000 * delta / 360.0;
    };

    HP.lngToMeterAtLat = function(lat, delta) {
        return delta * Math.cos(Math.PI * Math.abs(lat) / 180) * 40075040 / 360.0;
    };

    HP.meterToLat = function(meter) {
        return 360.0 * meter / 40008000;
    };

    HP.meterToLngAtLat = function(lat, meter) {
        return 360.0 * meter / (40075040 * Math.cos(Math.PI * Math.abs(lat) / 180));
    };

    HP.distOnEarth = function(p0, p1) {
        //[lng, lat], assuming earth a sphere
        return Math.PI * 6400000 * Math.acos(Math.cos(p0[0] - p1[0]) + Math.cos(p0[1] - p1[1]) - 1) / 180.0;
    };

    HP.max = function(list) {
        var mx = -Infinity;
        HP.each(list, function(v) {
            if (v > mx) mx = v;
        });
        return mx;
    };

    HP.min = function(list) {
        var mx = Infinity;
        HP.each(list, function(v) {
            if (v < mx) mx = v;
        });
        return mx;
    };

    HP.maxValue = function(obj) {
        return HP.max(HP.values(obj));
    };

    HP.minValue = function(obj) {
        return HP.min(HP.values(obj));
    };

    /*
     * Data Structures
     */
    HP.randomMappers = {
        0: function(string) {
            return HP.eachIndex(string.length, function(i) {
                return string.charCodeAt(i);
            }).sum();
        },
        1: function(string) {
            return HP.eachIndex(string.length, function(i) {
                return string.charCodeAt(i) * ((i % 2 === 0) ? 1 : -1);
            }).sum();
        }
    };

    //reliable but not always correct
    HP.bloomFilter = function() {
        return {
            val: {},
            mappers: HP.randomMappers,
            add: function(string) {
                var self = this;
                HP.each(self.mappers, function(mapper) {
                    self.val[mapper(string)] = 1;
                });
            },
            query: function(string) {
                var self = this;
                //NOTE: element "ienumerable" will be inserted into HP.randomMappers
                var count = HP.each(self.mappers, function(mapper) {
                    return typeof mapper === "function" ? 1 : 0;
                }).sum();
                return HP.each(self.mappers, function(mapper) {
                        return self.val[mapper(string)];
                    }).sum() === count;
            }
        };
    };

    //not 100% reliable
    HP.countingBloomFilter = function() {
        return {
            val: {},
            mappers: HP.randomMappers,
            add: function(string) {
                var self = this;
                HP.each(self.mappers, function(mapper) {
                    self.val[mapper(string)] = self.val[mapper(string)] === undefined ? 1 : self.val[mapper(string)] + 1;
                });
            },
            query: function(string) {
                var self = this;
                //NOTE: element "ienumerable" will be inserted into HP.randomMappers
                var count = HP.each(self.mappers, function(mapper) {
                    return typeof mapper === "function" ? 1 : 0;
                }).sum();
                return HP.each(self.mappers, function(mapper) {
                        return !!self.val[mapper(string)] ? 1 : 0;
                    }).sum() === count;
            },
            remove: function(string) {
                var self = this;
                !self.check(string) || HP.each(self.mappers, function(mapper) {
                    var newVal = self.val[mapper(string)] - 1;
                    if (newVal !== 0) {
                        self.val[mapper(string)] = newVal;
                    } else {
                        self.val[mapper(string)] = undefined;
                        delete self.val[mapper(string)];
                    }
                });
            }
        }
    };

    var FSLLN = function(id, data, s, e, f, p, n) {
        return {
            d: data, // data trunk
            i: id, // trunk id
            s: s, // start index
            e: e, // end index
            f: f, // is free
            p: p, // previous node
            n: n, // next node
            v: 1, // valid
            o: [] // owner
        };
    };

    var FSLL = function(id, size, data, oc) {
        var self = this;
        var head = new FSLLN(id, data, 0, size, !oc);
        self.fragments = [head];
        self.data = data;
        self.head = head;
        self.tail = head;
        self.splitNode = function(node, len1) {
            if (node.e - node.s <= len1) {
                throw "trying to alloc or free in a smaller space";
            }
            if (!node.v) {
                throw "trying to operate an invalid memory block";
            }
            var vn = {d: node.d, i: node.i, s: node.s + len1, e: node.e, f: node.f, p: node, n: node.n, v: 1, o: []};
            node.e = node.s + len1;
            node.n = vn;
            self.fragments[self.fragments.length] = vn;

            if (!vn.n) {
                self.tail = vn;
            }

            return node;
        };
        self.mergeNode = function(node) {
            if (!node.n) {
                throw "trying to merge a tail";
            }
            if (node.n.f !== node.f) {
                throw "cannot merge two different spaces";
            }
            if (node.i !== node.n.i) {
                throw "cannot merge into a cross-block node";
            }
            if (node.e !== node.n.s) {
                throw "cannot merge two separate nodes";
            }
            //merge nodes is dangerous, the owner must be one
            if (node.n.o.length === 0) {
                //no ref to next, can merge
            } else if (node.o.length === node.n.o.length) {
                var occupacy = [];
                var nl = node.n.o.length - 1, nli = 0;
                HP.each(node.o, function(holder) {
                    occupacy[holder] = 1;
                });
                do {
                    if (!occupacy[node.n.o[nli++]]) {
                        throw "cannot merge nodes with different owners";
                    }
                } while(nl--);
            }
            node.n.v = 0;
            node.e = node.n.e;
            node.n.p = undefined;
            node.n = node.n.n;
        };
    };

    HP.LinkedList = function(id, size, data) {
        return new FSLL(id, size, data);
    };

    HP.LinkedListNode = function() {
        return FSLLN.apply(null, arguments);
    };

    /*
     * Utils
     */
    HP.uuid = function (len, radix) {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = [], i;
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
        } else {
            // rfc4122, version 4 form
            var r;
            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';
            // Fill in random data.  At i==19 set the high bits of clock sequence as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random()*16;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }
        return uuid.join('');
    };

    HP.fastUuid = function() {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = new Array(36), rnd=0, r;
        for (var i = 0; i < 36; i++) {
            if (i === 8 || i === 13 || i === 18 || i === 23) {
                uuid[i] = '-';
            } else if (i === 14) {
                uuid[i] = '4';
            } else {
                if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
                r = rnd & 0xf;
                rnd = rnd >> 4;
                uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r];
            }
        }
        return uuid.join('');
    };

    HP.getUrlByParams =  function(server, action, params) {
        var paramUrl = "";
        HP.each(params, function(param, key) {
            paramUrl += "&" + key + "=";
            var p = "";
            if (param instanceof Array) {
                p = "[";
                var tr = "";
                HP.each(param, function(val) {
                    tr += ",";
                    if (val instanceof Boolean ||
                        val instanceof String ||
                        val instanceof Number ||
                        typeof val === "string" ||
                        typeof val === "number") {
                        tr += "\"" + val + "\"";
                    } else if (val) {
                        tr += val;
                    }
                });
                p += tr.substr(1) + "]";
            } else {
                p = param;
            }
            paramUrl += p;
        });
        return (server + action + "?" + paramUrl.substr(1));
    };

    HP.param = function(data) {
        var s = [], add = function(k, v) {
            s[s.length] = encodeURIComponent(k) + "=" + encodeURIComponent(v);
        };

        HP.each(data, function(o, k) {
            add(k, o);
        });

        return s.join("&").replace(/%20/g, "+");
    };

    HP.random = function(min, max) {
        if (max == null) {
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    };

    // List of HTML entities for escaping.
    var escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;'
    };

    var unescapeMap = HP.invert(escapeMap);

    // Functions for escaping and unescaping strings to/from HTML interpolation.
    var createEscaper = function(map) {
        var escaper = function(match) {
            return map[match];
        };
        // Regexes for identifying a key that needs to be escaped
        var source = '(?:' + HP.keys(map).join('|') + ')';
        var testRegexp = new RegExp(source);
        var replaceRegexp = new RegExp(source, 'g');
        return function(string) {
            string = string == null ? '' : '' + string;
            return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
        };
    };
    HP.escape = createEscaper(escapeMap);
    HP.unescape = createEscaper(unescapeMap);

    /**
     * @deprecated
     */
    HP.emptyObject = function(obj) {
        //HP.eachKey(obj, function(val, key) {
        //    obj[key] = undefined;
        //    delete obj.key;
        //});
    };

    HP.nonceStr = function() {
        var s = "";
        var c = "0123456789qwertyuiopasdfghjklzxcvbnm";
        for (var i = 0; i < 16; i++) {
            s += c[parseInt(36 * Math.random())];
        }
        return s;
    };

    HP.clearTimer = function(timer) {
        if (timer) {
            clearInterval(timer);
        }
    };

    HP.amapEventExtData = function(event) {
        var list = HP.coreEach(event.target, function(ele) {
            if ((typeof ele === 'object') && ele.hasOwnProperty('extData')) {
                return ele;
            }
        }, {noEmpty: 1}).toArray();
        return list[0];
    };

    HP.test = function(cb) {
        var o = HP.now();
        cb();
        var d = HP.now() - o;
        log(d);
        return d;
    };

    var a0, a1, a2, a3;
    var b0, b1, b2, b3, tb1;
    var sign, exponent, mantissa;
    HP.readInt32 = function(byteView, offset, littleEndian) {
        a0 = byteView[offset + 0];
        a1 = byteView[offset + 1];
        a2 = byteView[offset + 2];
        a3 = byteView[offset + 3];
        if (littleEndian) {
            a3 = (a3 << 24) >>> 0;
            a2 = a2 << 16;
            a1 = a1 << 8;
        } else {
            a0 = (a0 << 24) >>> 0;
            a1 = a1 << 16;
            a2 = a2 << 8;
        }
        return a3 + a2 + a1 + a0;
    };

    HP.readInt16 = function(byteView, offset, littleEndian) {
        a0 = byteView[offset + 0];
        a1 = byteView[offset + 1];
        if (littleEndian) {
            a1 = a1 << 8;
        } else {
            a0 = a0 << 8
        }
        return a0 + a1;
    };

    var native = new Int8Array(new Int16Array([1]).buffer)[0] == 1;
    HP.readFloat32 = function(byteView, index, littleEndian) {
        if (littleEndian === undefined) littleEndian = native;

        if (littleEndian) {
            b0 = byteView[index+3];
            b1 = byteView[index+2];
            b2 = byteView[index+1];
            b3 = byteView[index];
        } else {
            b0 = byteView[index];
            b1 = byteView[index+1];
            b2 = byteView[index+2];
            b3 = byteView[index+3];
        }

        //to prevent gc
        tb1 = b0 >> 7;
        sign = 1 - (2 * tb1);

        b0 = b0 << 1;
        tb1 = b1 >> 7;
        b0 = (b0 & 0xff);
        exponent = (b0 | tb1) - 127;

        tb1 = b1 & 0x7f;
        tb1 = tb1 << 16;
        b2 = b2 << 8;
        mantissa = tb1 | b2 | b3;

        if (exponent === 128) {
            if (mantissa !== 0) {
                return NaN;
            } else {
                return sign * Infinity;
            }
        }

        if (exponent === -127) { // Denormalized
            return sign * mantissa * Math.pow(2, -126 - 23);
        }

        return sign * (1 + mantissa * Math.pow(2, -23)) * Math.pow(2, exponent);
    };

    /*
     * Output & Define
     */

    HP.each(UH, function(func, key) {
        HP[key] = func;
    });

    var H = createIEnumerable(HP);

    addProperty(H, 'debug', {
        value: false,
        writable: true,
        configurable: false,
        enumerable: false
    });

    if (typeof define === 'function' && define.amd) {
        define('H', ['UH'], function() {
            return H;
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = H;
    }

    root.H = H;

    Object.defineProperty(root, 'H', {
        value: H,
        writable: false,
        configurable: false,
        enumerable: true
    });

}.call(this, this));