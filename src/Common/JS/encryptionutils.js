;!function(root){

    if (typeof module !== 'undefined' && module.exports) {
        root = GLOBAL;
    }

    var exports = {};

    //waste too much memory: GC
    function decodeLargeCodePointsArray (array) {
        var res = ''
        var i
        var end = array.length

        for (i = 0; i < end; i++) {
            res += String.fromCharCode(array[i])
        }

        return res
    }

    function decodeCodePointsArray (array) {
        if (array.length < 0x10000) {
            return String.fromCharCode.apply(String, array)
        }
        // Decode using string concatenation to avoid "call stack size exceeded".
        // Based on http://stackoverflow.com/a/22747272/680742, the browser with
        // the lowest limit is Chrome, with 0x10000 args.
        return decodeLargeCodePointsArray(array)
    }

    /*
     * Binary Operations
     */
    /**
     * Char Code Array -> Unicode String
     * @param ar
     * @returns {string}
     */
    function arrayToString(ar) {
        var result = "";
        var l = ar.length;
        var length = ar.length;
        for (l += 1; --l;) {
            result += String.fromCharCode(ar[length - l]);
        }
        return result;
    }

    /**
     * Unicode String -> Char Code Array
     * @param str
     * @returns {Array}
     */
    function stringToArray(str) {
        var length = str.length;
        var result = new Array(length);
        for (length += 1; --length;) {
            result[length - 1] = str.charCodeAt(length - 1);
        }
        return result;
    }

    /**
     * Utf16 String -> Byte Array (represented in UTF-8)
     * @param str
     * @returns {Array}
     */
    function stringToUtf8ByteArray(str) {
        // TODO(user): Use native implementations if/when available
        str = str.replace(/\r\n/g, '\n');
        var out = [], p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            } else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            } else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    }

    function stringToUnicodeString(str) {
        return decodeURIComponent(escape(str));
        // return exports.ua2s(exports.s2a(str));
    }

    function unicodeStringToString(str) {
        return exports.a2s(exports.s2ua(str));
    }

    var B10000000 = 0x80;
    var B11000000 = 0xC0;
    var B11100000 = 0xE0;
    var B11110000 = 0xF0;
    var B11111000 = 0xF8;
    var B11111100 = 0xFC;
    var B11111110 = 0xFE;
    var B00111111 = 0x3F;
    var B00000001 = 0x01;
    var B00000011 = 0x03;
    var B00000111 = 0x07;
    var B00001111 = 0x0F;
    var B00011111 = 0x1F;
    var B00111111 = 0x3F;
    var B01111111 = 0x7F;
    var B11111111 = 0xFF;

    /**
     * Byte Array (UTF-8 representation) -> Int Array (UTF-16 representation)
     * @param arr
     */
    function byteArrayToUtf16Array(arr) {
        var used = 0;
        var l;
        var length = l = arr.length, i, t, byteCount, rev;
        for (l += 1;--l;) {
            rev = 0;
            i = length - l;
            t = arr[i];
            if (t < B10000000) {
                byteCount = 0;
                rev = B11111111;
            } else if (t < B11000000) {
                //will not happen
                byteCount = 0;
                rev = B11111111;
            } else if (t < B11100000) {
                //U-00000080 - U-000007FF: 110xxxxx 10xxxxxx
                byteCount = 1;
                rev = B00011111;
            } else if (t < B11110000) {
                //U-00000800 - U-0000FFFF: 1110xxxx 10xxxxxx 10xxxxxx
                byteCount = 2;
                rev = B00001111;
            } else if (t < B11111000) {
                //U-00010000 - U-001FFFFF: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
                byteCount = 3;
                rev = B00000111;
            }
            //NOTE: 4 and 5 are not safe, cuz `<<` operation is over 32bit (int)
            //NOTE: javascript byte operations use int(32bit)
            else if (t < B11111100) {
                //U-00200000 - U-03FFFFFF: 111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
                byteCount = 4;
                rev = B00000011;
            } else {
                //U-04000000 - U-7FFFFFFF: 1111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
                byteCount = 5;
                rev = B00000001;
            }

            var allc = byteCount;
            var result = 0;
            if (byteCount) {
                for (byteCount += 1; --byteCount;) {
                    //byteCount: bc -> 1
                    result += ((arr[i + byteCount] & B00111111) << (6 * (allc - byteCount)));
                }
            }
            result |= (t & rev) << (allc * 6);
            arr[used++] = result;
            l -= allc;
            if (l <= 0) {
                break;
            }
        }
        arr.length = used;
        return arr;
    }

    function utf16StringToUtf8Array(str) {
        var utf8 = [];
        for (var i=0; i < str.length; i++) {
            var charcode = str.charCodeAt(i);
            if (charcode < 0x80) utf8[utf8.length] = charcode;
            else if (charcode < 0x800) {
                utf8[utf8.length] = 0xc0 | (charcode >> 6);
                utf8[utf8.length] = 0x80 | (charcode & 0x3f);
            }
            else if (charcode < 0xd800 || charcode >= 0xe000) {
                utf8[utf8.length] = 0xe0 | (charcode >> 12);
                utf8[utf8.length] = 0x80 | ((charcode>>6) & 0x3f);
                utf8[utf8.length] = 0x80 | (charcode & 0x3f);
            }
            // surrogate pair
            else {
                i++;
                // UTF-16 encodes 0x10000-0x10FFFF by
                // subtracting 0x10000 and splitting the
                // 20 bits of 0x0-0xFFFFF into two halves
                charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                    | (str.charCodeAt(i) & 0x3ff));
                utf8[utf8.length] = 0xf0 | (charcode >>18);
                utf8[utf8.length] = 0x80 | ((charcode>>12) & 0x3f);
                utf8[utf8.length] = 0x80 | ((charcode>>6) & 0x3f);
                utf8[utf8.length] = 0x80 | (charcode & 0x3f);
            }
        }
        return utf8;
    }

    /**
     * Decimal String -> Binary String
     * @param d
     * @returns {string}
     */
    function decimalToBinaryString(d) {
        return Number(d).toString(2);
    }

    function decimalArrayToByteArray(arr) {
        var bins = [];
        //
        return H.map(arr, function(item) {
            return decimalToBinaryString(item);
        });
    }

    /**
     * Byte Array -> Binary String
     * @param ba
     * @returns {*}
     */
    function binaryArrayToBinaryString(ba) {
        return H.map(ba, function(b) {
            return ("00000000" + b).slice(-8);
        }).join("");
    }

    function unicodeIntArrayToString(uintArray) {
        var mapped = new Array(uintArray.length);
        var l = uintArray.length;
        for (l += 1; --l;) {
            mapped[l - 1] = String.fromCharCode(uintArray[l - 1]);
        }
        return decodeURIComponent(escape(mapped.join("")));
    }

    function stringToUnicodeIntArray(str) {
        return exports.s2a(str);
    }

    function strintToUtf8String(str) {
        return decodeURIComponent(escape(str));
    }

    function hex(i) {
        if (!i) return "??";
        return ("00" + (i & 0xff).toString(16)).slice(-2);
    }

    var B10000000 = 0x80;
    var B11000000 = 0xC0;
    var B11100000 = 0xE0;
    var B11110000 = 0xF0;
    var B11111000 = 0xF8;
    var B11111100 = 0xFC;
    var B11111110 = 0xFE;
//  var B01111111 = 0x7F;
    var B00111111 = 0x3F;
    var B00011111 = 0x1F;
    var B00001111 = 0x0F;
    var B00000111 = 0x07;
    var B00000011 = 0x03;
    var B00000001 = 0x01;

    function str2utf8( str ){
        var result = [];
        var length = str.length;
        var idx=0;
        for ( var i=0; i<length; i++ ){
            var c = str.charCodeAt( i );
            if ( c <= 0x7f ) {
                result[idx++] = c;
            } else if ( c <= 0x7ff ) {
                result[idx++] = B11000000 | ( B00011111 & ( c >>>  6 ) );
                result[idx++] = B10000000 | ( B00111111 & ( c >>>  0 ) );
            } else if ( c <= 0xffff ) {
                result[idx++] = B11100000 | ( B00001111 & ( c >>> 12 ) ) ;
                result[idx++] = B10000000 | ( B00111111 & ( c >>>  6 ) ) ;
                result[idx++] = B10000000 | ( B00111111 & ( c >>>  0 ) ) ;
            } else if ( c <= 0x10ffff ) {
                result[idx++] = B11110000 | ( B00000111 & ( c >>> 18 ) ) ;
                result[idx++] = B10000000 | ( B00111111 & ( c >>> 12 ) ) ;
                result[idx++] = B10000000 | ( B00111111 & ( c >>>  6 ) ) ;
                result[idx++] = B10000000 | ( B00111111 & ( c >>>  0 ) ) ;
            } else {
                throw "error";
            }
        }
        return result;
    }

    function utf82str( data ) {
        var result = "";
        var length = data.length;

        for ( var i=0; i<length; ){
            var c = data[i++];
            if ( c < 0x80 ) {
                result += String.fromCharCode( c );
            } else if ( ( c < B11100000 ) ) {
                result += String.fromCharCode(
                    ( ( B00011111 & c         ) <<  6 ) |
                    ( ( B00111111 & data[i++] ) <<  0 )
                );
            } else if ( ( c < B11110000 ) ) {
                result += String.fromCharCode(
                    ( ( B00001111 & c         ) << 12 ) |
                    ( ( B00111111 & data[i++] ) <<  6 ) |
                    ( ( B00111111 & data[i++] ) <<  0 )
                );
            } else if ( ( c < B11111000 ) ) {
                result += String.fromCharCode(
                    ( ( B00000111 & c         ) << 18 ) |
                    ( ( B00111111 & data[i++] ) << 12 ) |
                    ( ( B00111111 & data[i++] ) <<  6 ) |
                    ( ( B00111111 & data[i++] ) <<  0 )
                );
            } else if ( ( c < B11111100 ) ) {
                result += String.fromCharCode(
                    ( ( B00000011 & c         ) << 24 ) |
                    ( ( B00111111 & data[i++] ) << 18 ) |
                    ( ( B00111111 & data[i++] ) << 12 ) |
                    ( ( B00111111 & data[i++] ) <<  6 ) |
                    ( ( B00111111 & data[i++] ) <<  0 )
                );
            } else if ( ( c < B11111110 ) ) {
                result += String.fromCharCode(
                    ( ( B00000001 & c         ) << 30 ) |
                    ( ( B00111111 & data[i++] ) << 24 ) |
                    ( ( B00111111 & data[i++] ) << 18 ) |
                    ( ( B00111111 & data[i++] ) << 12 ) |
                    ( ( B00111111 & data[i++] ) <<  6 ) |
                    ( ( B00111111 & data[i++] ) <<  0 )
                );
            }
        }
        return result;
    }

    exports.d2bs = decimalToBinaryString;
    exports.da2ba = decimalArrayToByteArray;
    exports.ba2bs = binaryArrayToBinaryString;
    exports.ua2s = unicodeIntArrayToString;
    exports.s2ua = stringToUnicodeIntArray;
    exports.s2us = strintToUtf8String;
    exports.hex = hex;
    exports.s2utf = str2utf8;
    exports.utf2s = utf82str;
    exports.s2uni = stringToUnicodeString;
    exports.uni2s = unicodeStringToString;
    exports.s2a = stringToArray;
    exports.a2s = arrayToString;
    exports.uc2s = exports.a2s; //unicode char array to str
    exports.s2uc = exports.s2a; //str to unicode char array
    exports.d2s = exports.a2s; //decimal array to str
    exports.s2ba = stringToUtf8ByteArray; //str to binary arr (utf8)
    exports.c2s = exports.a2s; //char array to str
    exports.s2c = exports.s2a; //str to char array
    exports.ba2ua = byteArrayToUtf16Array;

    /**
     * CRC Caculation
     *
     * Interface:
     *  crc32(val, direct)
     *      val: string to calculate
     *      direct: direct calculate (true) or direct table (false)
     */
    !function(packageRoot){
        'use strict';

        var table = [];
        var poly = 0xEDB88320; //reverse polynomial

        function makeTable() {
            for (var i = 0; i < 256; i++) {
                var c = i;
                for (var j = 0; j < 8; j++) {
                    c = ((c & 1) * poly) ^ (c >>> 1);
                }
                table[i] = c >>> 0;
            }
        }

        /*
         * Compute CRC of array directly.
         *
         * This is slower for repeated calls, so append mode is not supported.
         */
        function crcDirect(arr) {
            var crc = -1; // initial contents of LFBSR
            var temp;

            for (var i = 0; i < arr.length; i++) {
                temp = (crc ^ arr[i]) & 0xff;
                for (var j = 0; j < 8; j++) {
                    temp = ((temp & 1) * poly) ^ (temp >>> 1);
                }
                crc = (crc >>> 8) ^ temp;
            }

            // flip bits
            return crc ^ -1;
        }

        /*
         * Compute CRC with the help of a pre-calculated table.
         *
         * This supports append mode, if the second parameter is set.
         */
        function crcTable(arr, append) {
            var crc, i, l;

            // if we're in append mode, don't reset crc
            // if arr is null or undefined, reset table and return
            if (typeof crcTable.crc === 'undefined' || !append || !arr) {
                crcTable.crc = 0 ^ -1;

                if (!arr) {
                    return;
                }
            }

            // store in temp variable for minor speed gain
            crc = crcTable.crc;

            for (i = 0, l = arr.length; i < l; i += 1) {
                crc = (crc >>> 8) ^ table[(crc ^ arr[i]) & 0xff];
            }

            crcTable.crc = crc;

            return crc ^ -1;
        }

        // build the table
        // this isn't that costly, and most uses will be for table assisted mode
        makeTable();

        packageRoot.crc32 = function(val, direct) {
            if (direct === undefined) direct = true;
            val = (typeof val === "string") ? exports.s2ba(val) : val;
            var ret = direct ? crcDirect(val) : crcTable(val);
            return (ret >>> 0).toString(16);
        };

        packageRoot.crc32.direct = crcDirect;
        packageRoot.crc32.table = crcTable;

    }(exports);


    /**
     * Base64 Codec
     *
     * Interfaces:
     *  base64encode(data)
     *  base64decode(byte64)
     */
    (function(packageRoot){
        /* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
         * Version: 1.0
         * LastModified: Dec 25 1999
         * This library is free.  You can redistribute it and/or modify it.
         */

        var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var base64DecodeChars = [
            -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
            -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
            -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
            52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
            -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
            15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
            -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
            41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
        ];

        function base64encode(data, outputType) {
            var getter = function(i) {
                return data.charCodeAt(i);
            };
            if (typeof data === 'object' && !data.byteLength) {
                getter = function(i) {
                    return data[i];
                };
            } else if (typeof data === 'object' && data.byteLength) {
                var int8 = new Uint8Array(data);
                getter = function(i) {
                    return int8[i];
                };
            } else {
                //do nothing to string
            }
            var out, i, len;
            var c1, c2, c3;

            len = data.length;
            i = 0;

            //var setter = function(v, idx) {
            //    out += String.fromCharCode(v);
            //};
            //var prelength = Math.ceil((data.length || data.byteLength) * 3 / 4);
            //if (outputType == 'array') {
            //    out = new Array(prelength);
            //    setter = function(v, idx) {
            //        out[idx] = v;
            //    };
            //} else if (outputType == 'arraybuffer') {
            //    var outdata = new ArrayBuffer(prelength);
            //    out = new Uint8Array(outdata);
            //    setter = function(v, idx) {
            //        out[idx] = v;
            //    };
            //} else {
            //    out = "";
            //}
            //var cindex = 0;

            out = "";

            while(i < len) {
                c1 = getter(i++) & 0xff;
                if(i == len)
                {
                    //TODO: output type to be supported, cuz ArrayBuffer output or Array output is not used now
                    out += base64EncodeChars.charAt(c1 >> 2);
                    out += base64EncodeChars.charAt((c1 & 0x3) << 4);
                    out += "==";
                    break;
                }
                c2 = getter(i++);
                if(i == len)
                {
                    out += base64EncodeChars.charAt(c1 >> 2);
                    out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
                    out += base64EncodeChars.charAt((c2 & 0xF) << 2);
                    out += "=";
                    break;
                }
                c3 = getter(i++);
                out += base64EncodeChars.charAt(c1 >> 2);
                out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
                out += base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >>6));
                out += base64EncodeChars.charAt(c3 & 0x3F);
            }
            return out;
        }

        function base64decode(data, outputType) {
            var getter = function(i) {
                return data.charCodeAt(i);
            };
            if (typeof data === 'object' && !data.byteLength) {
                getter = function(i) {
                    return data[i];
                };
            } else if (typeof data === 'object' && data.byteLength) {
                var int8 = new Uint8Array(data);
                getter = function(i) {
                    return int8[i];
                };
            } else {
                //do nothing to string
            }
            var c1, c2, c3, c4;
            var i, len, out;

            len = data.length || data.byteLength;
            i = 0;

            var outdata;
            var setter = function(v, idx) {
                out += String.fromCharCode(v);
            };
            var prelength = Math.ceil((data.length || data.byteLength) * 3 / 4);
            if (outputType == 'array') {
                out = new Array(prelength);
                setter = function(v, idx) {
                    out[idx] = v;
                };
            } else if (outputType == 'arraybuffer') {
                outdata = new ArrayBuffer(prelength);
                out = new Uint8Array(outdata);
                setter = function(v, idx) {
                    out[idx] = v;
                };
            } else {
                out = "";
            }
            var cindex = 0;
            while(i < len) {
                /* c1 */
                do {
                    c1 = base64DecodeChars[getter(i++) & 0xff];
                } while(i < len && c1 == -1);
                if(c1 == -1)
                    break;

                /* c2 */
                do {
                    c2 = base64DecodeChars[getter(i++) & 0xff];
                } while(i < len && c2 == -1);
                if(c2 == -1)
                    break;

                setter((c1 << 2) | ((c2 & 0x30) >> 4), cindex++);

                /* c3 */
                do {
                    c3 = getter(i++) & 0xff;
                    if(c3 == 61)
                        return out;
                    c3 = base64DecodeChars[c3];
                } while(i < len && c3 == -1);
                if(c3 == -1)
                    break;

                setter(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2), cindex++);

                /* c4 */
                do {
                    c4 = getter(i++) & 0xff;
                    if(c4 == 61)
                        return out;
                    c4 = base64DecodeChars[c4];
                } while(i < len && c4 == -1);
                if(c4 == -1)
                    break;
                setter(((c3 & 0x03) << 6) | c4, cindex++);
            }

            //fix length

            if (cindex != prelength) {
                if (outputType == 'array') {
                    out.length = cindex;
                } else if (outputType == 'arraybuffer') {
                    out = out.slice(0, cindex);
                } else {
                    out = out.substring(0, cindex);
                }
            }

            return outdata || out;
        }

        packageRoot.base64encode = packageRoot.base64encode || base64encode;
        packageRoot.base64decode = packageRoot.base64decode || base64decode;
    })(exports);

    /*!
     * Joseph Myer's md5() algorithm wrapped in a self-invoked function to prevent
     * global namespace polution, modified to hash unicode characters as UTF-8.
     *
     * Copyright 1999-2010, Joseph Myers, Paul Johnston, Greg Holt, Will Bond <will@wbond.net>
     * http://www.myersdaily.org/joseph/javascript/md5-text.html
     * http://pajhome.org.uk/crypt/md5
     *
     * Released under the BSD license
     * http://www.opensource.org/licenses/bsd-license
     */
    (function(packageRoot) {
        var txt;

        function md5cycle(x, k) {
            var a = x[0], b = x[1], c = x[2], d = x[3];

            a = ff(a, b, c, d, k[0], 7, -680876936);
            d = ff(d, a, b, c, k[1], 12, -389564586);
            c = ff(c, d, a, b, k[2], 17, 606105819);
            b = ff(b, c, d, a, k[3], 22, -1044525330);
            a = ff(a, b, c, d, k[4], 7, -176418897);
            d = ff(d, a, b, c, k[5], 12, 1200080426);
            c = ff(c, d, a, b, k[6], 17, -1473231341);
            b = ff(b, c, d, a, k[7], 22, -45705983);
            a = ff(a, b, c, d, k[8], 7, 1770035416);
            d = ff(d, a, b, c, k[9], 12, -1958414417);
            c = ff(c, d, a, b, k[10], 17, -42063);
            b = ff(b, c, d, a, k[11], 22, -1990404162);
            a = ff(a, b, c, d, k[12], 7, 1804603682);
            d = ff(d, a, b, c, k[13], 12, -40341101);
            c = ff(c, d, a, b, k[14], 17, -1502002290);
            b = ff(b, c, d, a, k[15], 22, 1236535329);

            a = gg(a, b, c, d, k[1], 5, -165796510);
            d = gg(d, a, b, c, k[6], 9, -1069501632);
            c = gg(c, d, a, b, k[11], 14, 643717713);
            b = gg(b, c, d, a, k[0], 20, -373897302);
            a = gg(a, b, c, d, k[5], 5, -701558691);
            d = gg(d, a, b, c, k[10], 9, 38016083);
            c = gg(c, d, a, b, k[15], 14, -660478335);
            b = gg(b, c, d, a, k[4], 20, -405537848);
            a = gg(a, b, c, d, k[9], 5, 568446438);
            d = gg(d, a, b, c, k[14], 9, -1019803690);
            c = gg(c, d, a, b, k[3], 14, -187363961);
            b = gg(b, c, d, a, k[8], 20, 1163531501);
            a = gg(a, b, c, d, k[13], 5, -1444681467);
            d = gg(d, a, b, c, k[2], 9, -51403784);
            c = gg(c, d, a, b, k[7], 14, 1735328473);
            b = gg(b, c, d, a, k[12], 20, -1926607734);

            a = hh(a, b, c, d, k[5], 4, -378558);
            d = hh(d, a, b, c, k[8], 11, -2022574463);
            c = hh(c, d, a, b, k[11], 16, 1839030562);
            b = hh(b, c, d, a, k[14], 23, -35309556);
            a = hh(a, b, c, d, k[1], 4, -1530992060);
            d = hh(d, a, b, c, k[4], 11, 1272893353);
            c = hh(c, d, a, b, k[7], 16, -155497632);
            b = hh(b, c, d, a, k[10], 23, -1094730640);
            a = hh(a, b, c, d, k[13], 4, 681279174);
            d = hh(d, a, b, c, k[0], 11, -358537222);
            c = hh(c, d, a, b, k[3], 16, -722521979);
            b = hh(b, c, d, a, k[6], 23, 76029189);
            a = hh(a, b, c, d, k[9], 4, -640364487);
            d = hh(d, a, b, c, k[12], 11, -421815835);
            c = hh(c, d, a, b, k[15], 16, 530742520);
            b = hh(b, c, d, a, k[2], 23, -995338651);

            a = ii(a, b, c, d, k[0], 6, -198630844);
            d = ii(d, a, b, c, k[7], 10, 1126891415);
            c = ii(c, d, a, b, k[14], 15, -1416354905);
            b = ii(b, c, d, a, k[5], 21, -57434055);
            a = ii(a, b, c, d, k[12], 6, 1700485571);
            d = ii(d, a, b, c, k[3], 10, -1894986606);
            c = ii(c, d, a, b, k[10], 15, -1051523);
            b = ii(b, c, d, a, k[1], 21, -2054922799);
            a = ii(a, b, c, d, k[8], 6, 1873313359);
            d = ii(d, a, b, c, k[15], 10, -30611744);
            c = ii(c, d, a, b, k[6], 15, -1560198380);
            b = ii(b, c, d, a, k[13], 21, 1309151649);
            a = ii(a, b, c, d, k[4], 6, -145523070);
            d = ii(d, a, b, c, k[11], 10, -1120210379);
            c = ii(c, d, a, b, k[2], 15, 718787259);
            b = ii(b, c, d, a, k[9], 21, -343485551);

            x[0] = add32(a, x[0]);
            x[1] = add32(b, x[1]);
            x[2] = add32(c, x[2]);
            x[3] = add32(d, x[3]);
        }

        function cmn(q, a, b, x, s, t) {
            a = add32(add32(a, q), add32(x, t));
            return add32((a << s) | (a >>> (32 - s)), b);
        }

        function ff(a, b, c, d, x, s, t) {
            return cmn((b & c) | ((~b) & d), a, b, x, s, t);
        }

        function gg(a, b, c, d, x, s, t) {
            return cmn((b & d) | (c & (~d)), a, b, x, s, t);
        }

        function hh(a, b, c, d, x, s, t) {
            return cmn(b ^ c ^ d, a, b, x, s, t);
        }

        function ii(a, b, c, d, x, s, t) {
            return cmn(c ^ (b | (~d)), a, b, x, s, t);
        }

        function md51(s) {
            // Converts the string to UTF-8 "bytes" when necessary
            if (/[\x80-\xFF]/.test(s)) {
                s = unescape(encodeURI(s));
            }
            txt = '';
            var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
            for (i = 64; i <= s.length; i += 64) {
                md5cycle(state, md5blk(s.substring(i - 64, i)));
            }
            s = s.substring(i - 64);
            var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (i = 0; i < s.length; i++)
                tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
            tail[i >> 2] |= 0x80 << ((i % 4) << 3);
            if (i > 55) {
                md5cycle(state, tail);
                for (i = 0; i < 16; i++) tail[i] = 0;
            }
            tail[14] = n * 8;
            md5cycle(state, tail);
            return state;
        }

        function md5blk(s) { /* I figured global was faster.   */
            var md5blks = [], i; /* Andy King said do it this way. */
            for (i = 0; i < 64; i += 4) {
                md5blks[i >> 2] = s.charCodeAt(i) +
                    (s.charCodeAt(i + 1) << 8) +
                    (s.charCodeAt(i + 2) << 16) +
                    (s.charCodeAt(i + 3) << 24);
            }
            return md5blks;
        }

        var hex_chr = '0123456789abcdef'.split('');

        function rhex(n) {
            var s = '', j = 0;
            for (; j < 4; j++)
                s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] +
                    hex_chr[(n >> (j * 8)) & 0x0F];
            return s;
        }

        function hex(x) {
            for (var i = 0; i < x.length; i++)
                x[i] = rhex(x[i]);
            return x.join('');
        }

        packageRoot.MD5 = function (s) {
            return hex(md51(s));
        };

        /* this function is much faster, so if possible we use it. Some IEs are the
         only ones I know of that need the idiotic second function, generated by an
         if clause.  */
        function add32(a, b) {
            return (a + b) & 0xFFFFFFFF;
        }

        if (packageRoot.MD5('hello') != '5d41402abc4b2a76b9719d911017c592') {
            add32 = function(x, y) {
                var lsw = (x & 0xFFFF) + (y & 0xFFFF),
                    msw = (x >> 16) + (y >> 16) + (lsw >> 16);
                return (msw << 16) | (lsw & 0xFFFF);
            }
        }
    })(exports);

    /**
     * DES Encryption
     *
     * Interface:
     *  des()
     *  des_createKeys()
     *
     * Usage: des(key, message, encrypt, mode, iv, padding)
     *  key: encryption key
     *  message: string to decrypt/encrypt
     *  encrypt: whether to encrypt (1) or decrypt (0)
     *  mode: CBC mode, 0 by default, cipher block chaining
     *  iv: used in CBC mode, blank by default
     *  padding: used in CBC mode, blank by default
     */
    (function(packageRoot){

//Paul Tero, July 2001
//http://www.tero.co.uk/des/
//
//Optimised for performance with large blocks by Michael Hayworth, November 2001
//http://www.netdealing.com
//
//THIS SOFTWARE IS PROVIDED "AS IS" AND
//ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
//ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
//FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
//DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
//OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
//HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
//LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
//OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
//SUCH DAMAGE.

//des
//this takes the key, the message, and whether to encrypt or decrypt
        function des (key, message, encrypt, mode, iv, padding) {
            //declaring this locally speeds things up a bit
            var spfunction1 = [0x1010400,0,0x10000,0x1010404,0x1010004,0x10404,0x4,0x10000,0x400,0x1010400,0x1010404,0x400,0x1000404,0x1010004,0x1000000,0x4,0x404,0x1000400,0x1000400,0x10400,0x10400,0x1010000,0x1010000,0x1000404,0x10004,0x1000004,0x1000004,0x10004,0,0x404,0x10404,0x1000000,0x10000,0x1010404,0x4,0x1010000,0x1010400,0x1000000,0x1000000,0x400,0x1010004,0x10000,0x10400,0x1000004,0x400,0x4,0x1000404,0x10404,0x1010404,0x10004,0x1010000,0x1000404,0x1000004,0x404,0x10404,0x1010400,0x404,0x1000400,0x1000400,0,0x10004,0x10400,0,0x1010004];
            var spfunction2 = [-0x7fef7fe0,-0x7fff8000,0x8000,0x108020,0x100000,0x20,-0x7fefffe0,-0x7fff7fe0,-0x7fffffe0,-0x7fef7fe0,-0x7fef8000,-0x80000000,-0x7fff8000,0x100000,0x20,-0x7fefffe0,0x108000,0x100020,-0x7fff7fe0,0,-0x80000000,0x8000,0x108020,-0x7ff00000,0x100020,-0x7fffffe0,0,0x108000,0x8020,-0x7fef8000,-0x7ff00000,0x8020,0,0x108020,-0x7fefffe0,0x100000,-0x7fff7fe0,-0x7ff00000,-0x7fef8000,0x8000,-0x7ff00000,-0x7fff8000,0x20,-0x7fef7fe0,0x108020,0x20,0x8000,-0x80000000,0x8020,-0x7fef8000,0x100000,-0x7fffffe0,0x100020,-0x7fff7fe0,-0x7fffffe0,0x100020,0x108000,0,-0x7fff8000,0x8020,-0x80000000,-0x7fefffe0,-0x7fef7fe0,0x108000];
            var spfunction3 = [0x208,0x8020200,0,0x8020008,0x8000200,0,0x20208,0x8000200,0x20008,0x8000008,0x8000008,0x20000,0x8020208,0x20008,0x8020000,0x208,0x8000000,0x8,0x8020200,0x200,0x20200,0x8020000,0x8020008,0x20208,0x8000208,0x20200,0x20000,0x8000208,0x8,0x8020208,0x200,0x8000000,0x8020200,0x8000000,0x20008,0x208,0x20000,0x8020200,0x8000200,0,0x200,0x20008,0x8020208,0x8000200,0x8000008,0x200,0,0x8020008,0x8000208,0x20000,0x8000000,0x8020208,0x8,0x20208,0x20200,0x8000008,0x8020000,0x8000208,0x208,0x8020000,0x20208,0x8,0x8020008,0x20200];
            var spfunction4 = [0x802001,0x2081,0x2081,0x80,0x802080,0x800081,0x800001,0x2001,0,0x802000,0x802000,0x802081,0x81,0,0x800080,0x800001,0x1,0x2000,0x800000,0x802001,0x80,0x800000,0x2001,0x2080,0x800081,0x1,0x2080,0x800080,0x2000,0x802080,0x802081,0x81,0x800080,0x800001,0x802000,0x802081,0x81,0,0,0x802000,0x2080,0x800080,0x800081,0x1,0x802001,0x2081,0x2081,0x80,0x802081,0x81,0x1,0x2000,0x800001,0x2001,0x802080,0x800081,0x2001,0x2080,0x800000,0x802001,0x80,0x800000,0x2000,0x802080];
            var spfunction5 = [0x100,0x2080100,0x2080000,0x42000100,0x80000,0x100,0x40000000,0x2080000,0x40080100,0x80000,0x2000100,0x40080100,0x42000100,0x42080000,0x80100,0x40000000,0x2000000,0x40080000,0x40080000,0,0x40000100,0x42080100,0x42080100,0x2000100,0x42080000,0x40000100,0,0x42000000,0x2080100,0x2000000,0x42000000,0x80100,0x80000,0x42000100,0x100,0x2000000,0x40000000,0x2080000,0x42000100,0x40080100,0x2000100,0x40000000,0x42080000,0x2080100,0x40080100,0x100,0x2000000,0x42080000,0x42080100,0x80100,0x42000000,0x42080100,0x2080000,0,0x40080000,0x42000000,0x80100,0x2000100,0x40000100,0x80000,0,0x40080000,0x2080100,0x40000100];
            var spfunction6 = [0x20000010,0x20400000,0x4000,0x20404010,0x20400000,0x10,0x20404010,0x400000,0x20004000,0x404010,0x400000,0x20000010,0x400010,0x20004000,0x20000000,0x4010,0,0x400010,0x20004010,0x4000,0x404000,0x20004010,0x10,0x20400010,0x20400010,0,0x404010,0x20404000,0x4010,0x404000,0x20404000,0x20000000,0x20004000,0x10,0x20400010,0x404000,0x20404010,0x400000,0x4010,0x20000010,0x400000,0x20004000,0x20000000,0x4010,0x20000010,0x20404010,0x404000,0x20400000,0x404010,0x20404000,0,0x20400010,0x10,0x4000,0x20400000,0x404010,0x4000,0x400010,0x20004010,0,0x20404000,0x20000000,0x400010,0x20004010];
            var spfunction7 = [0x200000,0x4200002,0x4000802,0,0x800,0x4000802,0x200802,0x4200800,0x4200802,0x200000,0,0x4000002,0x2,0x4000000,0x4200002,0x802,0x4000800,0x200802,0x200002,0x4000800,0x4000002,0x4200000,0x4200800,0x200002,0x4200000,0x800,0x802,0x4200802,0x200800,0x2,0x4000000,0x200800,0x4000000,0x200800,0x200000,0x4000802,0x4000802,0x4200002,0x4200002,0x2,0x200002,0x4000000,0x4000800,0x200000,0x4200800,0x802,0x200802,0x4200800,0x802,0x4000002,0x4200802,0x4200000,0x200800,0,0x2,0x4200802,0,0x200802,0x4200000,0x800,0x4000002,0x4000800,0x800,0x200002];
            var spfunction8 = [0x10001040,0x1000,0x40000,0x10041040,0x10000000,0x10001040,0x40,0x10000000,0x40040,0x10040000,0x10041040,0x41000,0x10041000,0x41040,0x1000,0x40,0x10040000,0x10000040,0x10001000,0x1040,0x41000,0x40040,0x10040040,0x10041000,0x1040,0,0,0x10040040,0x10000040,0x10001000,0x41040,0x40000,0x41040,0x40000,0x10041000,0x1000,0x40,0x10040040,0x1000,0x41040,0x10001000,0x40,0x10000040,0x10040000,0x10040040,0x10000000,0x40000,0x10001040,0,0x10041040,0x40040,0x10000040,0x10040000,0x10001000,0x10001040,0,0x10041040,0x41000,0x41000,0x1040,0x1040,0x40040,0x10000000,0x10041000];

            //create the 16 or 48 subkeys we will need
            var keys = des_createKeys (key);
            var m=0, i, j, temp/*, temp2*/, right1, right2, left, right, looping;
            var cbcleft, cbcleft2, cbcright, cbcright2;
            var endloop, loopinc;
            var len = message.length;
            var chunk = 0;
            //set up the loops for single and triple des
            var iterations = keys.length == 32 ? 3 : 9; //single or triple des
            if (iterations == 3) {looping = encrypt ? [0, 32, 2] : [30, -2, -2];}
            else {looping = encrypt ? [0, 32, 2, 62, 30, -2, 64, 96, 2] : [94, 62, -2, 32, 64, 2, 30, -2, -2];}

            //pad the message depending on the padding parameter
            if (padding == 2) message += "        "; //pad the message with spaces
            else if (padding == 1) {temp = 8-(len%8); message += String.fromCharCode (temp,temp,temp,temp,temp,temp,temp,temp); if (temp==8) len+=8;} //PKCS7 padding
            else if (!padding) message += "\0\0\0\0\0\0\0\0"; //pad the message out with null bytes

            //store the result here
            var result = "";
            var tempresult = "";

            if (mode == 1) { //CBC mode
                cbcleft = (iv.charCodeAt(m++) << 24) | (iv.charCodeAt(m++) << 16) | (iv.charCodeAt(m++) << 8) | iv.charCodeAt(m++);
                cbcright = (iv.charCodeAt(m++) << 24) | (iv.charCodeAt(m++) << 16) | (iv.charCodeAt(m++) << 8) | iv.charCodeAt(m+1);
                m=0;
            }

            //loop through each 64 bit chunk of the message
            while (m < len) {
                left = (message.charCodeAt(m++) << 24) | (message.charCodeAt(m++) << 16) | (message.charCodeAt(m++) << 8) | message.charCodeAt(m++);
                right = (message.charCodeAt(m++) << 24) | (message.charCodeAt(m++) << 16) | (message.charCodeAt(m++) << 8) | message.charCodeAt(m++);

                //for Cipher Block Chaining mode, xor the message with the previous result
                if (mode == 1) {if (encrypt) {left ^= cbcleft; right ^= cbcright;} else {cbcleft2 = cbcleft; cbcright2 = cbcright; cbcleft = left; cbcright = right;}}

                //first each 64 but chunk of the message must be permuted according to IP
                temp = ((left >>> 4) ^ right) & 0x0f0f0f0f; right ^= temp; left ^= (temp << 4);
                temp = ((left >>> 16) ^ right) & 0x0000ffff; right ^= temp; left ^= (temp << 16);
                temp = ((right >>> 2) ^ left) & 0x33333333; left ^= temp; right ^= (temp << 2);
                temp = ((right >>> 8) ^ left) & 0x00ff00ff; left ^= temp; right ^= (temp << 8);
                temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);

                left = ((left << 1) | (left >>> 31));
                right = ((right << 1) | (right >>> 31));

                //do this either 1 or 3 times for each chunk of the message
                for (j=0; j<iterations; j+=3) {
                    endloop = looping[j+1];
                    loopinc = looping[j+2];
                    //now go through and perform the encryption or decryption
                    for (i=looping[j]; i!=endloop; i+=loopinc) { //for efficiency
                        right1 = right ^ keys[i];
                        right2 = ((right >>> 4) | (right << 28)) ^ keys[i+1];
                        //the result is attained by passing these bytes through the S selection functions
                        temp = left;
                        left = right;
                        right = temp ^ (spfunction2[(right1 >>> 24) & 0x3f] | spfunction4[(right1 >>> 16) & 0x3f]
                            | spfunction6[(right1 >>>  8) & 0x3f] | spfunction8[right1 & 0x3f]
                            | spfunction1[(right2 >>> 24) & 0x3f] | spfunction3[(right2 >>> 16) & 0x3f]
                            | spfunction5[(right2 >>>  8) & 0x3f] | spfunction7[right2 & 0x3f]);
                    }
                    temp = left; left = right; right = temp; //unreverse left and right
                } //for either 1 or 3 iterations

                //move then each one bit to the right
                left = ((left >>> 1) | (left << 31));
                right = ((right >>> 1) | (right << 31));

                //now perform IP-1, which is IP in the opposite direction
                temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);
                temp = ((right >>> 8) ^ left) & 0x00ff00ff; left ^= temp; right ^= (temp << 8);
                temp = ((right >>> 2) ^ left) & 0x33333333; left ^= temp; right ^= (temp << 2);
                temp = ((left >>> 16) ^ right) & 0x0000ffff; right ^= temp; left ^= (temp << 16);
                temp = ((left >>> 4) ^ right) & 0x0f0f0f0f; right ^= temp; left ^= (temp << 4);

                //for Cipher Block Chaining mode, xor the message with the previous result
                if (mode == 1) {if (encrypt) {cbcleft = left; cbcright = right;} else {left ^= cbcleft2; right ^= cbcright2;}}
                tempresult += String.fromCharCode ((left>>>24), ((left>>>16) & 0xff), ((left>>>8) & 0xff), (left & 0xff), (right>>>24), ((right>>>16) & 0xff), ((right>>>8) & 0xff), (right & 0xff));

                chunk += 8;
                if (chunk == 512) {result += tempresult; tempresult = ""; chunk = 0;}
            } //for every 8 characters, or 64 bits in the message

            //return the result as an array
            return result + tempresult;
        } //end of des


//des_createKeys
//this takes as input a 64 bit key (even though only 56 bits are used)
//as an array of 2 integers, and returns 16 48 bit keys
        function des_createKeys (key) {
            //declaring this locally speeds things up a bit
            var pc2bytes0  = [0,0x4,0x20000000,0x20000004,0x10000,0x10004,0x20010000,0x20010004,0x200,0x204,0x20000200,0x20000204,0x10200,0x10204,0x20010200,0x20010204];
            var pc2bytes1  = [0,0x1,0x100000,0x100001,0x4000000,0x4000001,0x4100000,0x4100001,0x100,0x101,0x100100,0x100101,0x4000100,0x4000101,0x4100100,0x4100101];
            var pc2bytes2  = [0,0x8,0x800,0x808,0x1000000,0x1000008,0x1000800,0x1000808,0,0x8,0x800,0x808,0x1000000,0x1000008,0x1000800,0x1000808];
            var pc2bytes3  = [0,0x200000,0x8000000,0x8200000,0x2000,0x202000,0x8002000,0x8202000,0x20000,0x220000,0x8020000,0x8220000,0x22000,0x222000,0x8022000,0x8222000];
            var pc2bytes4  = [0,0x40000,0x10,0x40010,0,0x40000,0x10,0x40010,0x1000,0x41000,0x1010,0x41010,0x1000,0x41000,0x1010,0x41010];
            var pc2bytes5  = [0,0x400,0x20,0x420,0,0x400,0x20,0x420,0x2000000,0x2000400,0x2000020,0x2000420,0x2000000,0x2000400,0x2000020,0x2000420];
            var pc2bytes6  = [0,0x10000000,0x80000,0x10080000,0x2,0x10000002,0x80002,0x10080002,0,0x10000000,0x80000,0x10080000,0x2,0x10000002,0x80002,0x10080002];
            var pc2bytes7  = [0,0x10000,0x800,0x10800,0x20000000,0x20010000,0x20000800,0x20010800,0x20000,0x30000,0x20800,0x30800,0x20020000,0x20030000,0x20020800,0x20030800];
            var pc2bytes8  = [0,0x40000,0,0x40000,0x2,0x40002,0x2,0x40002,0x2000000,0x2040000,0x2000000,0x2040000,0x2000002,0x2040002,0x2000002,0x2040002];
            var pc2bytes9  = [0,0x10000000,0x8,0x10000008,0,0x10000000,0x8,0x10000008,0x400,0x10000400,0x408,0x10000408,0x400,0x10000400,0x408,0x10000408];
            var pc2bytes10 = [0,0x20,0,0x20,0x100000,0x100020,0x100000,0x100020,0x2000,0x2020,0x2000,0x2020,0x102000,0x102020,0x102000,0x102020];
            var pc2bytes11 = [0,0x1000000,0x200,0x1000200,0x200000,0x1200000,0x200200,0x1200200,0x4000000,0x5000000,0x4000200,0x5000200,0x4200000,0x5200000,0x4200200,0x5200200];
            var pc2bytes12 = [0,0x1000,0x8000000,0x8001000,0x80000,0x81000,0x8080000,0x8081000,0x10,0x1010,0x8000010,0x8001010,0x80010,0x81010,0x8080010,0x8081010];
            var pc2bytes13 = [0,0x4,0x100,0x104,0,0x4,0x100,0x104,0x1,0x5,0x101,0x105,0x1,0x5,0x101,0x105];

            //how many iterations (1 for des, 3 for triple des)
            var iterations = key.length > 8 ? 3 : 1; //changed by Paul 16/6/2007 to use Triple DES for 9+ byte keys
            //stores the return keys
            var keys = new Array (32 * iterations);
            //now define the left shifts which need to be done
            var shifts = [0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0];
            //other variables
            var lefttemp, righttemp, m=0, n=0, temp;

            for (var j=0; j<iterations; j++) { //either 1 or 3 iterations
                var left = (key.charCodeAt(m++) << 24) | (key.charCodeAt(m++) << 16) | (key.charCodeAt(m++) << 8) | key.charCodeAt(m++);
                var right = (key.charCodeAt(m++) << 24) | (key.charCodeAt(m++) << 16) | (key.charCodeAt(m++) << 8) | key.charCodeAt(m++);

                temp = ((left >>> 4) ^ right) & 0x0f0f0f0f; right ^= temp; left ^= (temp << 4);
                temp = ((right >>> -16) ^ left) & 0x0000ffff; left ^= temp; right ^= (temp << -16);
                temp = ((left >>> 2) ^ right) & 0x33333333; right ^= temp; left ^= (temp << 2);
                temp = ((right >>> -16) ^ left) & 0x0000ffff; left ^= temp; right ^= (temp << -16);
                temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);
                temp = ((right >>> 8) ^ left) & 0x00ff00ff; left ^= temp; right ^= (temp << 8);
                temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);

                //the right side needs to be shifted and to get the last four bits of the left side
                temp = (left << 8) | ((right >>> 20) & 0x000000f0);
                //left needs to be put upside down
                left = (right << 24) | ((right << 8) & 0xff0000) | ((right >>> 8) & 0xff00) | ((right >>> 24) & 0xf0);
                right = temp;

                //now go through and perform these shifts on the left and right keys
                for (var i=0; i < shifts.length; i++) {
                    //shift the keys either one or two bits to the left
                    if (shifts[i]) {left = (left << 2) | (left >>> 26); right = (right << 2) | (right >>> 26);}
                    else {left = (left << 1) | (left >>> 27); right = (right << 1) | (right >>> 27);}
                    left &= -0xf; right &= -0xf;

                    //now apply PC-2, in such a way that E is easier when encrypting or decrypting
                    //this conversion will look like PC-2 except only the last 6 bits of each byte are used
                    //rather than 48 consecutive bits and the order of lines will be according to
                    //how the S selection functions will be applied: S2, S4, S6, S8, S1, S3, S5, S7
                    lefttemp = pc2bytes0[left >>> 28] | pc2bytes1[(left >>> 24) & 0xf]
                        | pc2bytes2[(left >>> 20) & 0xf] | pc2bytes3[(left >>> 16) & 0xf]
                        | pc2bytes4[(left >>> 12) & 0xf] | pc2bytes5[(left >>> 8) & 0xf]
                        | pc2bytes6[(left >>> 4) & 0xf];
                    righttemp = pc2bytes7[right >>> 28] | pc2bytes8[(right >>> 24) & 0xf]
                        | pc2bytes9[(right >>> 20) & 0xf] | pc2bytes10[(right >>> 16) & 0xf]
                        | pc2bytes11[(right >>> 12) & 0xf] | pc2bytes12[(right >>> 8) & 0xf]
                        | pc2bytes13[(right >>> 4) & 0xf];
                    temp = ((righttemp >>> 16) ^ lefttemp) & 0x0000ffff;
                    keys[n++] = lefttemp ^ temp; keys[n++] = righttemp ^ (temp << 16);
                }
            } //for each iterations
            //return the keys we've created
            return keys;
        } //end of des_createKeys

        packageRoot.des = des;
        packageRoot.des_createKeys = des_createKeys;
    })(exports);

    /**
     * SHA-1 Encryption
     */
    !(function(packageRoot){
        /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
        /*  SHA-1 implementation in JavaScript                  (c) Chris Veness 2002-2014 / MIT Licence  */
        /*                                                                                                */
        /*  - see http://csrc.nist.gov/groups/ST/toolkit/secure_hashing.html                              */
        /*        http://csrc.nist.gov/groups/ST/toolkit/examples.html                                    */
        /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

        /* jshint node:true *//* global define, escape, unescape */
        'use strict';


        /**
         * SHA-1 hash function reference implementation.
         *
         * @namespace
         */
        var Sha1 = {};


        /**
         * Generates SHA-1 hash of string.
         *
         * @param   {string} msg - (Unicode) string to be hashed.
         * @returns {string} Hash of msg as hex character string.
         */
        Sha1.hash = function(msg) {
            // convert string to UTF-8, as SHA only deals with byte-streams
            msg = msg.utf8Encode();

            // constants [§4.2.1]
            var K = [ 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6 ];

            // PREPROCESSING

            msg += String.fromCharCode(0x80);  // add trailing '1' bit (+ 0's padding) to string [§5.1.1]

            // convert string msg into 512-bit/16-integer blocks arrays of ints [§5.2.1]
            var l = msg.length/4 + 2; // length (in 32-bit integers) of msg + ‘1’ + appended length
            var N = Math.ceil(l/16);  // number of 16-integer-blocks required to hold 'l' ints
            var M = new Array(N);

            for (var i=0; i<N; i++) {
                M[i] = new Array(16);
                for (var j=0; j<16; j++) {  // encode 4 chars per integer, big-endian encoding
                    M[i][j] = (msg.charCodeAt(i*64+j*4)<<24) | (msg.charCodeAt(i*64+j*4+1)<<16) |
                        (msg.charCodeAt(i*64+j*4+2)<<8) | (msg.charCodeAt(i*64+j*4+3));
                } // note running off the end of msg is ok 'cos bitwise ops on NaN return 0
            }
            // add length (in bits) into final pair of 32-bit integers (big-endian) [§5.1.1]
            // note: most significant word would be (len-1)*8 >>> 32, but since JS converts
            // bitwise-op args to 32 bits, we need to simulate this by arithmetic operators
            M[N-1][14] = ((msg.length-1)*8) / Math.pow(2, 32); M[N-1][14] = Math.floor(M[N-1][14]);
            M[N-1][15] = ((msg.length-1)*8) & 0xffffffff;

            // set initial hash value [§5.3.1]
            var H0 = 0x67452301;
            var H1 = 0xefcdab89;
            var H2 = 0x98badcfe;
            var H3 = 0x10325476;
            var H4 = 0xc3d2e1f0;

            // HASH COMPUTATION [§6.1.2]

            var W = new Array(80); var a, b, c, d, e;
            for (var i=0; i<N; i++) {

                // 1 - prepare message schedule 'W'
                for (var t=0;  t<16; t++) W[t] = M[i][t];
                for (var t=16; t<80; t++) W[t] = Sha1.ROTL(W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16], 1);

                // 2 - initialise five working variables a, b, c, d, e with previous hash value
                a = H0; b = H1; c = H2; d = H3; e = H4;

                // 3 - main loop
                for (var t=0; t<80; t++) {
                    var s = Math.floor(t/20); // seq for blocks of 'f' functions and 'K' constants
                    var T = (Sha1.ROTL(a,5) + Sha1.f(s,b,c,d) + e + K[s] + W[t]) & 0xffffffff;
                    e = d;
                    d = c;
                    c = Sha1.ROTL(b, 30);
                    b = a;
                    a = T;
                }

                // 4 - compute the new intermediate hash value (note 'addition modulo 2^32')
                H0 = (H0+a) & 0xffffffff;
                H1 = (H1+b) & 0xffffffff;
                H2 = (H2+c) & 0xffffffff;
                H3 = (H3+d) & 0xffffffff;
                H4 = (H4+e) & 0xffffffff;
            }

            return Sha1.toHexStr(H0) + Sha1.toHexStr(H1) + Sha1.toHexStr(H2) +
                Sha1.toHexStr(H3) + Sha1.toHexStr(H4);
        };


        /**
         * Function 'f' [§4.1.1].
         * @private
         */
        Sha1.f = function(s, x, y, z)  {
            switch (s) {
                case 0: return (x & y) ^ (~x & z);           // Ch()
                case 1: return  x ^ y  ^  z;                 // Parity()
                case 2: return (x & y) ^ (x & z) ^ (y & z);  // Maj()
                case 3: return  x ^ y  ^  z;                 // Parity()
            }
        };

        /**
         * Rotates left (circular left shift) value x by n positions [§3.2.5].
         * @private
         */
        Sha1.ROTL = function(x, n) {
            return (x<<n) | (x>>>(32-n));
        };


        /**
         * Hexadecimal representation of a number.
         * @private
         */
        Sha1.toHexStr = function(n) {
            // note can't use toString(16) as it is implementation-dependant,
            // and in IE returns signed numbers when used on full words
            var s="", v;
            for (var i=7; i>=0; i--) { v = (n>>>(i*4)) & 0xf; s += v.toString(16); }
            return s;
        };


        /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


        /** Extend String object with method to encode multi-byte string to utf8
         *  - monsur.hossa.in/2012/07/20/utf-8-in-javascript.html */
        if (typeof String.prototype.utf8Encode == 'undefined') {
            String.prototype.utf8Encode = function() {
                return unescape( encodeURIComponent( this ) );
            };
        }

        /** Extend String object with method to decode utf8 string to multi-byte */
        if (typeof String.prototype.utf8Decode == 'undefined') {
            String.prototype.utf8Decode = function() {
                try {
                    return decodeURIComponent( escape( this ) );
                } catch (e) {
                    return this; // invalid UTF-8? return as-is
                }
            };
        }

        packageRoot.SHA1 = Sha1.hash;

        /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
        //if (typeof module != 'undefined' && module.exports) module.exports = Sha1; // CommonJs export
        //if (typeof define == 'function' && define.amd) define([], function() { return Sha1; }); // AMD
    })(exports);

    /**
     * zip_deflate module
     *
     * Interface
     *  zip_deflate(src): String to String
     */
    (function(packageRoot){
        /* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
         * Version: 1.0.1
         * LastModified: Dec 25 1999
         */

        /* Interface:
         * data = zip_deflate(src);
         */

        /* constant parameters */
        var zip_WSIZE = 32768;		// Sliding Window size
        var zip_STORED_BLOCK = 0;
        var zip_STATIC_TREES = 1;
        var zip_DYN_TREES    = 2;

        /* for deflate */
        var zip_DEFAULT_LEVEL = 6;
        var zip_FULL_SEARCH = true;
        var zip_INBUFSIZ = 32768;	// Input buffer size
        var zip_INBUF_EXTRA = 64;	// Extra buffer
        var zip_OUTBUFSIZ = 1024 * 8;
        var zip_window_size = 2 * zip_WSIZE;
        var zip_MIN_MATCH = 3;
        var zip_MAX_MATCH = 258;
        var zip_BITS = 16;
// for SMALL_MEM
        var zip_LIT_BUFSIZE = 0x2000;
        var zip_HASH_BITS = 13;
// for MEDIUM_MEM
// var zip_LIT_BUFSIZE = 0x4000;
// var zip_HASH_BITS = 14;
// for BIG_MEM
// var zip_LIT_BUFSIZE = 0x8000;
// var zip_HASH_BITS = 15;
        if(zip_LIT_BUFSIZE > zip_INBUFSIZ)
            // alert("error: zip_INBUFSIZ is too small");
        if((zip_WSIZE<<1) > (1<<zip_BITS))
            // alert("error: zip_WSIZE is too large");
        if(zip_HASH_BITS > zip_BITS-1)
            // alert("error: zip_HASH_BITS is too large");
        if(zip_HASH_BITS < 8 || zip_MAX_MATCH != 258)
            // alert("error: Code too clever");
        var zip_DIST_BUFSIZE = zip_LIT_BUFSIZE;
        var zip_HASH_SIZE = 1 << zip_HASH_BITS;
        var zip_HASH_MASK = zip_HASH_SIZE - 1;
        var zip_WMASK = zip_WSIZE - 1;
        var zip_NIL = 0; // Tail of hash chains
        var zip_TOO_FAR = 4096;
        var zip_MIN_LOOKAHEAD = zip_MAX_MATCH + zip_MIN_MATCH + 1;
        var zip_MAX_DIST = zip_WSIZE - zip_MIN_LOOKAHEAD;
        var zip_SMALLEST = 1;
        var zip_MAX_BITS = 15;
        var zip_MAX_BL_BITS = 7;
        var zip_LENGTH_CODES = 29;
        var zip_LITERALS =256;
        var zip_END_BLOCK = 256;
        var zip_L_CODES = zip_LITERALS + 1 + zip_LENGTH_CODES;
        var zip_D_CODES = 30;
        var zip_BL_CODES = 19;
        var zip_REP_3_6 = 16;
        var zip_REPZ_3_10 = 17;
        var zip_REPZ_11_138 = 18;
        var zip_HEAP_SIZE = 2 * zip_L_CODES + 1;
        var zip_H_SHIFT = parseInt((zip_HASH_BITS + zip_MIN_MATCH - 1) /
            zip_MIN_MATCH);

        /* variables */
        var zip_free_queue;
        var zip_qhead, zip_qtail;
        var zip_initflag;
        var zip_outbuf = null;
        var zip_outcnt, zip_outoff;
        var zip_complete;
        var zip_window;
        var zip_d_buf;
        var zip_l_buf;
        var zip_prev;
        var zip_bi_buf;
        var zip_bi_valid;
        var zip_block_start;
        var zip_ins_h;
        var zip_hash_head;
        var zip_prev_match;
        var zip_match_available;
        var zip_match_length;
        var zip_prev_length;
        var zip_strstart;
        var zip_match_start;
        var zip_eofile;
        var zip_lookahead;
        var zip_max_chain_length;
        var zip_max_lazy_match;
        var zip_compr_level;
        var zip_good_match;
        var zip_nice_match;
        var zip_dyn_ltree;
        var zip_dyn_dtree;
        var zip_static_ltree;
        var zip_static_dtree;
        var zip_bl_tree;
        var zip_l_desc;
        var zip_d_desc;
        var zip_bl_desc;
        var zip_bl_count;
        var zip_heap;
        var zip_heap_len;
        var zip_heap_max;
        var zip_depth;
        var zip_length_code;
        var zip_dist_code;
        var zip_base_length;
        var zip_base_dist;
        var zip_flag_buf;
        var zip_last_lit;
        var zip_last_dist;
        var zip_last_flags;
        var zip_flags;
        var zip_flag_bit;
        var zip_opt_len;
        var zip_static_len;
        var zip_deflate_data;
        var zip_deflate_pos;

        /* constant tables */
        var zip_extra_lbits = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
        var zip_extra_dbits = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
        var zip_extra_blbits = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];
        var zip_bl_order = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
        var zip_configuration_table = [
            new Zip_DeflateConfiguration(0,    0,   0,    0),
            new Zip_DeflateConfiguration(4,    4,   8,    4),
            new Zip_DeflateConfiguration(4,    5,  16,    8),
            new Zip_DeflateConfiguration(4,    6,  32,   32),
            new Zip_DeflateConfiguration(4,    4,  16,   16),
            new Zip_DeflateConfiguration(8,   16,  32,   32),
            new Zip_DeflateConfiguration(8,   16, 128,  128),
            new Zip_DeflateConfiguration(8,   32, 128,  256),
            new Zip_DeflateConfiguration(32, 128, 258, 1024),
            new Zip_DeflateConfiguration(32, 258, 258, 4096)
        ];

        /* objects (deflate) */

        function Zip_DeflateCT() {
            this.fc = 0; // frequency count or bit string
            this.dl = 0; // father node in Huffman tree or length of bit string
        }

        function Zip_DeflateTreeDesc() {
            this.dyn_tree = null;	// the dynamic tree
            this.static_tree = null;	// corresponding static tree or NULL
            this.extra_bits = null;	// extra bits for each code or NULL
            this.extra_base = 0;	// base index for extra_bits
            this.elems = 0;		// max number of elements in the tree
            this.max_length = 0;	// max bit length for the codes
            this.max_code = 0;		// largest code with non zero frequency
        }

        /* Values for max_lazy_match, good_match and max_chain_length, depending on
         * the desired pack level (0..9). The values given below have been tuned to
         * exclude worst case performance for pathological files. Better values may be
         * found for specific files.
         */
        function Zip_DeflateConfiguration(a, b, c, d) {
            this.good_length = a; // reduce lazy search above this match length
            this.max_lazy = b;    // do not perform lazy search above this match length
            this.nice_length = c; // quit search above this match length
            this.max_chain = d;
        }

        function Zip_DeflateBuffer() {
            this.next = null;
            this.len = 0;
            this.ptr = new Array(zip_OUTBUFSIZ);
            this.off = 0;
        }

        /* routines (deflate) */

        function zip_deflate_start(level) {
            var i;

            if(!level)
                level = zip_DEFAULT_LEVEL;
            else if(level < 1)
                level = 1;
            else if(level > 9)
                level = 9;

            zip_compr_level = level;
            zip_initflag = false;
            zip_eofile = false;
            if(zip_outbuf != null)
                return;

            zip_free_queue = zip_qhead = zip_qtail = null;
            zip_outbuf = new Array(zip_OUTBUFSIZ);
            zip_window = new Array(zip_window_size);
            zip_d_buf = new Array(zip_DIST_BUFSIZE);
            zip_l_buf = new Array(zip_INBUFSIZ + zip_INBUF_EXTRA);
            zip_prev = new Array(1 << zip_BITS);
            zip_dyn_ltree = new Array(zip_HEAP_SIZE);
            for(i = 0; i < zip_HEAP_SIZE; i++)
                zip_dyn_ltree[i] = new Zip_DeflateCT();
            zip_dyn_dtree = new Array(2*zip_D_CODES+1);
            for(i = 0; i < 2*zip_D_CODES+1; i++)
                zip_dyn_dtree[i] = new Zip_DeflateCT();
            zip_static_ltree = new Array(zip_L_CODES+2);
            for(i = 0; i < zip_L_CODES+2; i++)
                zip_static_ltree[i] = new Zip_DeflateCT();
            zip_static_dtree = new Array(zip_D_CODES);
            for(i = 0; i < zip_D_CODES; i++)
                zip_static_dtree[i] = new Zip_DeflateCT();
            zip_bl_tree = new Array(2*zip_BL_CODES+1);
            for(i = 0; i < 2*zip_BL_CODES+1; i++)
                zip_bl_tree[i] = new Zip_DeflateCT();
            zip_l_desc = new Zip_DeflateTreeDesc();
            zip_d_desc = new Zip_DeflateTreeDesc();
            zip_bl_desc = new Zip_DeflateTreeDesc();
            zip_bl_count = new Array(zip_MAX_BITS+1);
            zip_heap = new Array(2*zip_L_CODES+1);
            zip_depth = new Array(2*zip_L_CODES+1);
            zip_length_code = new Array(zip_MAX_MATCH-zip_MIN_MATCH+1);
            zip_dist_code = new Array(512);
            zip_base_length = new Array(zip_LENGTH_CODES);
            zip_base_dist = new Array(zip_D_CODES);
            zip_flag_buf = new Array(parseInt(zip_LIT_BUFSIZE / 8));
        }

        //function Zip_deflate_end() {
        //    zip_free_queue = zip_qhead = zip_qtail = null;
        //    zip_outbuf = null;
        //    zip_window = null;
        //    zip_d_buf = null;
        //    zip_l_buf = null;
        //    zip_prev = null;
        //    zip_dyn_ltree = null;
        //    zip_dyn_dtree = null;
        //    zip_static_ltree = null;
        //    zip_static_dtree = null;
        //    zip_bl_tree = null;
        //    zip_l_desc = null;
        //    zip_d_desc = null;
        //    zip_bl_desc = null;
        //    zip_bl_count = null;
        //    zip_heap = null;
        //    zip_depth = null;
        //    zip_length_code = null;
        //    zip_dist_code = null;
        //    zip_base_length = null;
        //    zip_base_dist = null;
        //    zip_flag_buf = null;
        //}

        function zip_reuse_queue(p) {
            p.next = zip_free_queue;
            zip_free_queue = p;
        }

        function zip_new_queue() {
            var p;

            if(zip_free_queue != null)
            {
                p = zip_free_queue;
                zip_free_queue = zip_free_queue.next;
            }
            else
                p = new Zip_DeflateBuffer();
            p.next = null;
            p.len = p.off = 0;

            return p;
        }

        function zip_head1(i) {
            return zip_prev[zip_WSIZE + i];
        }

        function zip_head2(i, val) {
            return zip_prev[zip_WSIZE + i] = val;
        }

        /* put_byte is used for the compressed output, put_ubyte for the
         * uncompressed output. However unlzw() uses window for its
         * suffix table instead of its output buffer, so it does not use put_ubyte
         * (to be cleaned up).
         */
        function zip_put_byte(c) {
            zip_outbuf[zip_outoff + zip_outcnt++] = c;
            if(zip_outoff + zip_outcnt == zip_OUTBUFSIZ)
                zip_qoutbuf();
        }

        /* Output a 16 bit value, lsb first */
        function zip_put_short(w) {
            w &= 0xffff;
            if(zip_outoff + zip_outcnt < zip_OUTBUFSIZ - 2) {
                zip_outbuf[zip_outoff + zip_outcnt++] = (w & 0xff);
                zip_outbuf[zip_outoff + zip_outcnt++] = (w >>> 8);
            } else {
                zip_put_byte(w & 0xff);
                zip_put_byte(w >>> 8);
            }
        }

        /* ==========================================================================
         * Insert string s in the dictionary and set match_head to the previous head
         * of the hash chain (the most recent string with same hash key). Return
         * the previous length of the hash chain.
         * IN  assertion: all calls to to INSERT_STRING are made with consecutive
         *    input characters and the first MIN_MATCH bytes of s are valid
         *    (except for the last MIN_MATCH-1 bytes of the input file).
         */
        function zip_INSERT_STRING() {
            zip_ins_h = ((zip_ins_h << zip_H_SHIFT)
                ^ (zip_window[zip_strstart + zip_MIN_MATCH - 1] & 0xff))
                & zip_HASH_MASK;
            zip_hash_head = zip_head1(zip_ins_h);
            zip_prev[zip_strstart & zip_WMASK] = zip_hash_head;
            zip_head2(zip_ins_h, zip_strstart);
        }

        /* Send a code of the given tree. c and tree must not have side effects */
        function zip_SEND_CODE(c, tree) {
            zip_send_bits(tree[c].fc, tree[c].dl);
        }

        /* Mapping from a distance to a distance code. dist is the distance - 1 and
         * must not have side effects. dist_code[256] and dist_code[257] are never
         * used.
         */
        function zip_D_CODE(dist) {
            return (dist < 256 ? zip_dist_code[dist]
                    : zip_dist_code[256 + (dist>>7)]) & 0xff;
        }

        /* ==========================================================================
         * Compares to subtrees, using the tree depth as tie breaker when
         * the subtrees have equal frequency. This minimizes the worst case length.
         */
        function zip_SMALLER(tree, n, m) {
            return tree[n].fc < tree[m].fc ||
                (tree[n].fc == tree[m].fc && zip_depth[n] <= zip_depth[m]);
        }

        /* ==========================================================================
         * read string data
         */
        function zip_read_buff(buff, offset, n) {
            var i;
            for(i = 0; i < n && zip_deflate_pos < zip_deflate_data.length; i++)
                buff[offset + i] =
                    zip_deflate_data.charCodeAt(zip_deflate_pos++) & 0xff;
            return i;
        }

        /* ==========================================================================
         * Initialize the "longest match" routines for a new file
         */
        function zip_lm_init() {
            var j;

            /* Initialize the hash table. */
            for(j = 0; j < zip_HASH_SIZE; j++)
//	zip_head2(j, zip_NIL);
                zip_prev[zip_WSIZE + j] = 0;
            /* prev will be initialized on the fly */

            /* Set the default configuration parameters:
             */
            zip_max_lazy_match = zip_configuration_table[zip_compr_level].max_lazy;
            zip_good_match     = zip_configuration_table[zip_compr_level].good_length;
            if(!zip_FULL_SEARCH)
                zip_nice_match = zip_configuration_table[zip_compr_level].nice_length;
            zip_max_chain_length = zip_configuration_table[zip_compr_level].max_chain;

            zip_strstart = 0;
            zip_block_start = 0;

            zip_lookahead = zip_read_buff(zip_window, 0, 2 * zip_WSIZE);
            if(zip_lookahead <= 0) {
                zip_eofile = true;
                zip_lookahead = 0;
                return;
            }
            zip_eofile = false;
            /* Make sure that we always have enough lookahead. This is important
             * if input comes from a device such as a tty.
             */
            while(zip_lookahead < zip_MIN_LOOKAHEAD && !zip_eofile)
                zip_fill_window();

            /* If lookahead < MIN_MATCH, ins_h is garbage, but this is
             * not important since only literal bytes will be emitted.
             */
            zip_ins_h = 0;
            for(j = 0; j < zip_MIN_MATCH - 1; j++) {
//      UPDATE_HASH(ins_h, window[j]);
                zip_ins_h = ((zip_ins_h << zip_H_SHIFT) ^ (zip_window[j] & 0xff)) & zip_HASH_MASK;
            }
        }

        /* ==========================================================================
         * Set match_start to the longest match starting at the given string and
         * return its length. Matches shorter or equal to prev_length are discarded,
         * in which case the result is equal to prev_length and match_start is
         * garbage.
         * IN assertions: cur_match is the head of the hash chain for the current
         *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
         */
        function zip_longest_match(cur_match) {
            var chain_length = zip_max_chain_length; // max hash chain length
            var scanp = zip_strstart; // current string
            var matchp;		// matched string
            var len;		// length of current match
            var best_len = zip_prev_length;	// best match length so far

            /* Stop when cur_match becomes <= limit. To simplify the code,
             * we prevent matches with the string of window index 0.
             */
            var limit = (zip_strstart > zip_MAX_DIST ? zip_strstart - zip_MAX_DIST : zip_NIL);

            var strendp = zip_strstart + zip_MAX_MATCH;
            var scan_end1 = zip_window[scanp + best_len - 1];
            var scan_end  = zip_window[scanp + best_len];

            /* Do not waste too much time if we already have a good match: */
            if(zip_prev_length >= zip_good_match)
                chain_length >>= 2;

//  Assert(encoder->strstart <= window_size-MIN_LOOKAHEAD, "insufficient lookahead");

            do {
//    Assert(cur_match < encoder->strstart, "no future");
                matchp = cur_match;

                /* Skip to next match if the match length cannot increase
                 * or if the match length is less than 2:
                 */
                if(zip_window[matchp + best_len]	!= scan_end  ||
                    zip_window[matchp + best_len - 1]	!= scan_end1 ||
                    zip_window[matchp]			!= zip_window[scanp] ||
                    zip_window[++matchp]			!= zip_window[scanp + 1]) {
                    continue;
                }

                /* The check at best_len-1 can be removed because it will be made
                 * again later. (This heuristic is not always a win.)
                 * It is not necessary to compare scan[2] and match[2] since they
                 * are always equal when the other bytes match, given that
                 * the hash keys are equal and that HASH_BITS >= 8.
                 */
                scanp += 2;
                matchp++;

                /* We check for insufficient lookahead only every 8th comparison;
                 * the 256th check will be made at strstart+258.
                 */
                do {
                } while(zip_window[++scanp] == zip_window[++matchp] &&
                zip_window[++scanp] == zip_window[++matchp] &&
                zip_window[++scanp] == zip_window[++matchp] &&
                zip_window[++scanp] == zip_window[++matchp] &&
                zip_window[++scanp] == zip_window[++matchp] &&
                zip_window[++scanp] == zip_window[++matchp] &&
                zip_window[++scanp] == zip_window[++matchp] &&
                zip_window[++scanp] == zip_window[++matchp] &&
                scanp < strendp);

                len = zip_MAX_MATCH - (strendp - scanp);
                scanp = strendp - zip_MAX_MATCH;

                if(len > best_len) {
                    zip_match_start = cur_match;
                    best_len = len;
                    if(zip_FULL_SEARCH) {
                        if(len >= zip_MAX_MATCH) break;
                    } else {
                        if(len >= zip_nice_match) break;
                    }

                    scan_end1  = zip_window[scanp + best_len-1];
                    scan_end   = zip_window[scanp + best_len];
                }
            } while((cur_match = zip_prev[cur_match & zip_WMASK]) > limit
            && --chain_length != 0);

            return best_len;
        }

        /* ==========================================================================
         * Fill the window when the lookahead becomes insufficient.
         * Updates strstart and lookahead, and sets eofile if end of input file.
         * IN assertion: lookahead < MIN_LOOKAHEAD && strstart + lookahead > 0
         * OUT assertions: at least one byte has been read, or eofile is set;
         *    file reads are performed for at least two bytes (required for the
         *    translate_eol option).
         */
        function zip_fill_window() {
            var n, m;

            // Amount of free space at the end of the window.
            var more = zip_window_size - zip_lookahead - zip_strstart;

            /* If the window is almost full and there is insufficient lookahead,
             * move the upper half to the lower one to make room in the upper half.
             */
            if(more == -1) {
                /* Very unlikely, but possible on 16 bit machine if strstart == 0
                 * and lookahead == 1 (input done one byte at time)
                 */
                more--;
            } else if(zip_strstart >= zip_WSIZE + zip_MAX_DIST) {
                /* By the IN assertion, the window is not empty so we can't confuse
                 * more == 0 with more == 64K on a 16 bit machine.
                 */
//	Assert(window_size == (ulg)2*WSIZE, "no sliding with BIG_MEM");

//	System.arraycopy(window, WSIZE, window, 0, WSIZE);
                for(n = 0; n < zip_WSIZE; n++)
                    zip_window[n] = zip_window[n + zip_WSIZE];

                zip_match_start -= zip_WSIZE;
                zip_strstart    -= zip_WSIZE; /* we now have strstart >= MAX_DIST: */
                zip_block_start -= zip_WSIZE;

                for(n = 0; n < zip_HASH_SIZE; n++) {
                    m = zip_head1(n);
                    zip_head2(n, m >= zip_WSIZE ? m - zip_WSIZE : zip_NIL);
                }
                for(n = 0; n < zip_WSIZE; n++) {
                    /* If n is not on any hash chain, prev[n] is garbage but
                     * its value will never be used.
                     */
                    m = zip_prev[n];
                    zip_prev[n] = (m >= zip_WSIZE ? m - zip_WSIZE : zip_NIL);
                }
                more += zip_WSIZE;
            }
            // At this point, more >= 2
            if(!zip_eofile) {
                n = zip_read_buff(zip_window, zip_strstart + zip_lookahead, more);
                if(n <= 0)
                    zip_eofile = true;
                else
                    zip_lookahead += n;
            }
        }

        /* ==========================================================================
         * Processes a new input file and return its compressed length. This
         * function does not perform lazy evaluationof matches and inserts
         * new strings in the dictionary only for unmatched strings or for short
         * matches. It is used only for the fast compression options.
         */
        function zip_deflate_fast() {
            while(zip_lookahead != 0 && zip_qhead == null) {
                var flush; // set if current block must be flushed

                /* Insert the string window[strstart .. strstart+2] in the
                 * dictionary, and set hash_head to the head of the hash chain:
                 */
                zip_INSERT_STRING();

                /* Find the longest match, discarding those <= prev_length.
                 * At this point we have always match_length < MIN_MATCH
                 */
                if(zip_hash_head != zip_NIL &&
                    zip_strstart - zip_hash_head <= zip_MAX_DIST) {
                    /* To simplify the code, we prevent matches with the string
                     * of window index 0 (in particular we have to avoid a match
                     * of the string with itself at the start of the input file).
                     */
                    zip_match_length = zip_longest_match(zip_hash_head);
                    /* longest_match() sets match_start */
                    if(zip_match_length > zip_lookahead)
                        zip_match_length = zip_lookahead;
                }
                if(zip_match_length >= zip_MIN_MATCH) {
//	    check_match(strstart, match_start, match_length);

                    flush = zip_ct_tally(zip_strstart - zip_match_start,
                        zip_match_length - zip_MIN_MATCH);
                    zip_lookahead -= zip_match_length;

                    /* Insert new strings in the hash table only if the match length
                     * is not too large. This saves time but degrades compression.
                     */
                    if(zip_match_length <= zip_max_lazy_match) {
                        zip_match_length--; // string at strstart already in hash table
                        do {
                            zip_strstart++;
                            zip_INSERT_STRING();
                            /* strstart never exceeds WSIZE-MAX_MATCH, so there are
                             * always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
                             * these bytes are garbage, but it does not matter since
                             * the next lookahead bytes will be emitted as literals.
                             */
                        } while(--zip_match_length != 0);
                        zip_strstart++;
                    } else {
                        zip_strstart += zip_match_length;
                        zip_match_length = 0;
                        zip_ins_h = zip_window[zip_strstart] & 0xff;
//		UPDATE_HASH(ins_h, window[strstart + 1]);
                        zip_ins_h = ((zip_ins_h<<zip_H_SHIFT) ^ (zip_window[zip_strstart + 1] & 0xff)) & zip_HASH_MASK;

//#if MIN_MATCH != 3
//		Call UPDATE_HASH() MIN_MATCH-3 more times
//#endif

                    }
                } else {
                    /* No match, output a literal byte */
                    flush = zip_ct_tally(0, zip_window[zip_strstart] & 0xff);
                    zip_lookahead--;
                    zip_strstart++;
                }
                if(flush) {
                    zip_flush_block(0);
                    zip_block_start = zip_strstart;
                }

                /* Make sure that we always have enough lookahead, except
                 * at the end of the input file. We need MAX_MATCH bytes
                 * for the next match, plus MIN_MATCH bytes to insert the
                 * string following the next match.
                 */
                while(zip_lookahead < zip_MIN_LOOKAHEAD && !zip_eofile)
                    zip_fill_window();
            }
        }

        function zip_deflate_better() {
            /* Process the input block. */
            while(zip_lookahead != 0 && zip_qhead == null) {
                /* Insert the string window[strstart .. strstart+2] in the
                 * dictionary, and set hash_head to the head of the hash chain:
                 */
                zip_INSERT_STRING();

                /* Find the longest match, discarding those <= prev_length.
                 */
                zip_prev_length = zip_match_length;
                zip_prev_match = zip_match_start;
                zip_match_length = zip_MIN_MATCH - 1;

                if(zip_hash_head != zip_NIL &&
                    zip_prev_length < zip_max_lazy_match &&
                    zip_strstart - zip_hash_head <= zip_MAX_DIST) {
                    /* To simplify the code, we prevent matches with the string
                     * of window index 0 (in particular we have to avoid a match
                     * of the string with itself at the start of the input file).
                     */
                    zip_match_length = zip_longest_match(zip_hash_head);
                    /* longest_match() sets match_start */
                    if(zip_match_length > zip_lookahead)
                        zip_match_length = zip_lookahead;

                    /* Ignore a length 3 match if it is too distant: */
                    if(zip_match_length == zip_MIN_MATCH &&
                        zip_strstart - zip_match_start > zip_TOO_FAR) {
                        /* If prev_match is also MIN_MATCH, match_start is garbage
                         * but we will ignore the current match anyway.
                         */
                        zip_match_length--;
                    }
                }
                /* If there was a match at the previous step and the current
                 * match is not better, output the previous match:
                 */
                if(zip_prev_length >= zip_MIN_MATCH &&
                    zip_match_length <= zip_prev_length) {
                    var flush; // set if current block must be flushed

//	    check_match(strstart - 1, prev_match, prev_length);
                    flush = zip_ct_tally(zip_strstart - 1 - zip_prev_match,
                        zip_prev_length - zip_MIN_MATCH);

                    /* Insert in hash table all strings up to the end of the match.
                     * strstart-1 and strstart are already inserted.
                     */
                    zip_lookahead -= zip_prev_length - 1;
                    zip_prev_length -= 2;
                    do {
                        zip_strstart++;
                        zip_INSERT_STRING();
                        /* strstart never exceeds WSIZE-MAX_MATCH, so there are
                         * always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
                         * these bytes are garbage, but it does not matter since the
                         * next lookahead bytes will always be emitted as literals.
                         */
                    } while(--zip_prev_length != 0);
                    zip_match_available = 0;
                    zip_match_length = zip_MIN_MATCH - 1;
                    zip_strstart++;
                    if(flush) {
                        zip_flush_block(0);
                        zip_block_start = zip_strstart;
                    }
                } else if(zip_match_available != 0) {
                    /* If there was no match at the previous position, output a
                     * single literal. If there was a match but the current match
                     * is longer, truncate the previous match to a single literal.
                     */
                    if(zip_ct_tally(0, zip_window[zip_strstart - 1] & 0xff)) {
                        zip_flush_block(0);
                        zip_block_start = zip_strstart;
                    }
                    zip_strstart++;
                    zip_lookahead--;
                } else {
                    /* There is no previous match to compare with, wait for
                     * the next step to decide.
                     */
                    zip_match_available = 1;
                    zip_strstart++;
                    zip_lookahead--;
                }

                /* Make sure that we always have enough lookahead, except
                 * at the end of the input file. We need MAX_MATCH bytes
                 * for the next match, plus MIN_MATCH bytes to insert the
                 * string following the next match.
                 */
                while(zip_lookahead < zip_MIN_LOOKAHEAD && !zip_eofile)
                    zip_fill_window();
            }
        }

        function zip_init_deflate() {
            if(zip_eofile)
                return;
            zip_bi_buf = 0;
            zip_bi_valid = 0;
            zip_ct_init();
            zip_lm_init();

            zip_qhead = null;
            zip_outcnt = 0;
            zip_outoff = 0;

            if(zip_compr_level <= 3)
            {
                zip_prev_length = zip_MIN_MATCH - 1;
                zip_match_length = 0;
            }
            else
            {
                zip_match_length = zip_MIN_MATCH - 1;
                zip_match_available = 0;
            }

            zip_complete = false;
        }

        /* ==========================================================================
         * Same as above, but achieves better compression. We use a lazy
         * evaluation for matches: a match is finally adopted only if there is
         * no better match at the next window position.
         */
        function zip_deflate_internal(buff, off, buff_size) {
            var n;

            if(!zip_initflag)
            {
                zip_init_deflate();
                zip_initflag = true;
                if(zip_lookahead == 0) { // empty
                    zip_complete = true;
                    return 0;
                }
            }

            if((n = zip_qcopy(buff, off, buff_size)) == buff_size)
                return buff_size;

            if(zip_complete)
                return n;

            if(zip_compr_level <= 3) // optimized for speed
                zip_deflate_fast();
            else
                zip_deflate_better();
            if(zip_lookahead == 0) {
                if(zip_match_available != 0)
                    zip_ct_tally(0, zip_window[zip_strstart - 1] & 0xff);
                zip_flush_block(1);
                zip_complete = true;
            }
            return n + zip_qcopy(buff, n + off, buff_size - n);
        }

        function zip_qcopy(buff, off, buff_size) {
            var n, i, j;

            n = 0;
            while(zip_qhead != null && n < buff_size)
            {
                i = buff_size - n;
                if(i > zip_qhead.len)
                    i = zip_qhead.len;
//      System.arraycopy(qhead.ptr, qhead.off, buff, off + n, i);
                for(j = 0; j < i; j++)
                    buff[off + n + j] = zip_qhead.ptr[zip_qhead.off + j];

                zip_qhead.off += i;
                zip_qhead.len -= i;
                n += i;
                if(zip_qhead.len == 0) {
                    var p;
                    p = zip_qhead;
                    zip_qhead = zip_qhead.next;
                    zip_reuse_queue(p);
                }
            }

            if(n == buff_size)
                return n;

            if(zip_outoff < zip_outcnt) {
                i = buff_size - n;
                if(i > zip_outcnt - zip_outoff)
                    i = zip_outcnt - zip_outoff;
                // System.arraycopy(outbuf, outoff, buff, off + n, i);
                for(j = 0; j < i; j++)
                    buff[off + n + j] = zip_outbuf[zip_outoff + j];
                zip_outoff += i;
                n += i;
                if(zip_outcnt == zip_outoff)
                    zip_outcnt = zip_outoff = 0;
            }
            return n;
        }

        /* ==========================================================================
         * Allocate the match buffer, initialize the various tables and save the
         * location of the internal file attribute (ascii/binary) and method
         * (DEFLATE/STORE).
         */
        function zip_ct_init() {
            var n;	// iterates over tree elements
            var bits;	// bit counter
            var length;	// length value
            var code;	// code value
            var dist;	// distance index

            if(zip_static_dtree[0].dl != 0) return; // ct_init already called

            zip_l_desc.dyn_tree		= zip_dyn_ltree;
            zip_l_desc.static_tree	= zip_static_ltree;
            zip_l_desc.extra_bits	= zip_extra_lbits;
            zip_l_desc.extra_base	= zip_LITERALS + 1;
            zip_l_desc.elems		= zip_L_CODES;
            zip_l_desc.max_length	= zip_MAX_BITS;
            zip_l_desc.max_code		= 0;

            zip_d_desc.dyn_tree		= zip_dyn_dtree;
            zip_d_desc.static_tree	= zip_static_dtree;
            zip_d_desc.extra_bits	= zip_extra_dbits;
            zip_d_desc.extra_base	= 0;
            zip_d_desc.elems		= zip_D_CODES;
            zip_d_desc.max_length	= zip_MAX_BITS;
            zip_d_desc.max_code		= 0;

            zip_bl_desc.dyn_tree	= zip_bl_tree;
            zip_bl_desc.static_tree	= null;
            zip_bl_desc.extra_bits	= zip_extra_blbits;
            zip_bl_desc.extra_base	= 0;
            zip_bl_desc.elems		= zip_BL_CODES;
            zip_bl_desc.max_length	= zip_MAX_BL_BITS;
            zip_bl_desc.max_code	= 0;

            // Initialize the mapping length (0..255) -> length code (0..28)
            length = 0;
            for(code = 0; code < zip_LENGTH_CODES-1; code++) {
                zip_base_length[code] = length;
                for(n = 0; n < (1<<zip_extra_lbits[code]); n++)
                    zip_length_code[length++] = code;
            }
            // Assert (length == 256, "ct_init: length != 256");

            /* Note that the length 255 (match length 258) can be represented
             * in two different ways: code 284 + 5 bits or code 285, so we
             * overwrite length_code[255] to use the best encoding:
             */
            zip_length_code[length-1] = code;

            /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
            dist = 0;
            for(code = 0 ; code < 16; code++) {
                zip_base_dist[code] = dist;
                for(n = 0; n < (1<<zip_extra_dbits[code]); n++) {
                    zip_dist_code[dist++] = code;
                }
            }
            // Assert (dist == 256, "ct_init: dist != 256");
            dist >>= 7; // from now on, all distances are divided by 128
            for( ; code < zip_D_CODES; code++) {
                zip_base_dist[code] = dist << 7;
                for(n = 0; n < (1<<(zip_extra_dbits[code]-7)); n++)
                    zip_dist_code[256 + dist++] = code;
            }
            // Assert (dist == 256, "ct_init: 256+dist != 512");

            // Construct the codes of the static literal tree
            for(bits = 0; bits <= zip_MAX_BITS; bits++)
                zip_bl_count[bits] = 0;
            n = 0;
            while(n <= 143) { zip_static_ltree[n++].dl = 8; zip_bl_count[8]++; }
            while(n <= 255) { zip_static_ltree[n++].dl = 9; zip_bl_count[9]++; }
            while(n <= 279) { zip_static_ltree[n++].dl = 7; zip_bl_count[7]++; }
            while(n <= 287) { zip_static_ltree[n++].dl = 8; zip_bl_count[8]++; }
            /* Codes 286 and 287 do not exist, but we must include them in the
             * tree construction to get a canonical Huffman tree (longest code
             * all ones)
             */
            zip_gen_codes(zip_static_ltree, zip_L_CODES + 1);

            /* The static distance tree is trivial: */
            for(n = 0; n < zip_D_CODES; n++) {
                zip_static_dtree[n].dl = 5;
                zip_static_dtree[n].fc = zip_bi_reverse(n, 5);
            }

            // Initialize the first block of the first file:
            zip_init_block();
        }

        /* ==========================================================================
         * Initialize a new block.
         */
        function zip_init_block() {
            var n; // iterates over tree elements

            // Initialize the trees.
            for(n = 0; n < zip_L_CODES;  n++) zip_dyn_ltree[n].fc = 0;
            for(n = 0; n < zip_D_CODES;  n++) zip_dyn_dtree[n].fc = 0;
            for(n = 0; n < zip_BL_CODES; n++) zip_bl_tree[n].fc = 0;

            zip_dyn_ltree[zip_END_BLOCK].fc = 1;
            zip_opt_len = zip_static_len = 0;
            zip_last_lit = zip_last_dist = zip_last_flags = 0;
            zip_flags = 0;
            zip_flag_bit = 1;
        }

        /* ==========================================================================
         * Restore the heap property by moving down the tree starting at node k,
         * exchanging a node with the smallest of its two sons if necessary, stopping
         * when the heap property is re-established (each father smaller than its
         * two sons).
         */
        function zip_pqdownheap(
            tree,	// the tree to restore
            k) {	// node to move down
            var v = zip_heap[k];
            var j = k << 1;	// left son of k

            while(j <= zip_heap_len) {
                // Set j to the smallest of the two sons:
                if(j < zip_heap_len &&
                    zip_SMALLER(tree, zip_heap[j + 1], zip_heap[j]))
                    j++;

                // Exit if v is smaller than both sons
                if(zip_SMALLER(tree, v, zip_heap[j]))
                    break;

                // Exchange v with the smallest son
                zip_heap[k] = zip_heap[j];
                k = j;

                // And continue down the tree, setting j to the left son of k
                j <<= 1;
            }
            zip_heap[k] = v;
        }

        /* ==========================================================================
         * Compute the optimal bit lengths for a tree and update the total bit length
         * for the current block.
         * IN assertion: the fields freq and dad are set, heap[heap_max] and
         *    above are the tree nodes sorted by increasing frequency.
         * OUT assertions: the field len is set to the optimal bit length, the
         *     array bl_count contains the frequencies for each bit length.
         *     The length opt_len is updated; static_len is also updated if stree is
         *     not null.
         */
        function zip_gen_bitlen(desc) { // the tree descriptor
            var tree		= desc.dyn_tree;
            var extra		= desc.extra_bits;
            var base		= desc.extra_base;
            var max_code	= desc.max_code;
            var max_length	= desc.max_length;
            var stree		= desc.static_tree;
            var h;		// heap index
            var n, m;		// iterate over the tree elements
            var bits;		// bit length
            var xbits;		// extra bits
            var f;		// frequency
            var overflow = 0;	// number of elements with bit length too large

            for(bits = 0; bits <= zip_MAX_BITS; bits++)
                zip_bl_count[bits] = 0;

            /* In a first pass, compute the optimal bit lengths (which may
             * overflow in the case of the bit length tree).
             */
            tree[zip_heap[zip_heap_max]].dl = 0; // root of the heap

            for(h = zip_heap_max + 1; h < zip_HEAP_SIZE; h++) {
                n = zip_heap[h];
                bits = tree[tree[n].dl].dl + 1;
                if(bits > max_length) {
                    bits = max_length;
                    overflow++;
                }
                tree[n].dl = bits;
                // We overwrite tree[n].dl which is no longer needed

                if(n > max_code)
                    continue; // not a leaf node

                zip_bl_count[bits]++;
                xbits = 0;
                if(n >= base)
                    xbits = extra[n - base];
                f = tree[n].fc;
                zip_opt_len += f * (bits + xbits);
                if(stree != null)
                    zip_static_len += f * (stree[n].dl + xbits);
            }
            if(overflow == 0)
                return;

            // This happens for example on obj2 and pic of the Calgary corpus

            // Find the first bit length which could increase:
            do {
                bits = max_length - 1;
                while(zip_bl_count[bits] == 0)
                    bits--;
                zip_bl_count[bits]--;		// move one leaf down the tree
                zip_bl_count[bits + 1] += 2;	// move one overflow item as its brother
                zip_bl_count[max_length]--;
                /* The brother of the overflow item also moves one step up,
                 * but this does not affect bl_count[max_length]
                 */
                overflow -= 2;
            } while(overflow > 0);

            /* Now recompute all bit lengths, scanning in increasing frequency.
             * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
             * lengths instead of fixing only the wrong ones. This idea is taken
             * from 'ar' written by Haruhiko Okumura.)
             */
            for(bits = max_length; bits != 0; bits--) {
                n = zip_bl_count[bits];
                while(n != 0) {
                    m = zip_heap[--h];
                    if(m > max_code)
                        continue;
                    if(tree[m].dl != bits) {
                        zip_opt_len += (bits - tree[m].dl) * tree[m].fc;
                        tree[m].fc = bits;
                    }
                    n--;
                }
            }
        }

        /* ==========================================================================
         * Generate the codes for a given tree and bit counts (which need not be
         * optimal).
         * IN assertion: the array bl_count contains the bit length statistics for
         * the given tree and the field len is set for all tree elements.
         * OUT assertion: the field code is set for all tree elements of non
         *     zero code length.
         */
        function zip_gen_codes(tree,	// the tree to decorate
                               max_code) {	// largest code with non zero frequency
            var next_code = new Array(zip_MAX_BITS+1); // next code value for each bit length
            var code = 0;		// running code value
            var bits;			// bit index
            var n;			// code index

            /* The distribution counts are first used to generate the code values
             * without bit reversal.
             */
            for(bits = 1; bits <= zip_MAX_BITS; bits++) {
                code = ((code + zip_bl_count[bits-1]) << 1);
                next_code[bits] = code;
            }

            /* Check that the bit counts in bl_count are consistent. The last code
             * must be all ones.
             */
//    Assert (code + encoder->bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
//	    "inconsistent bit counts");
//    Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

            for(n = 0; n <= max_code; n++) {
                var len = tree[n].dl;
                if(len == 0)
                    continue;
                // Now reverse the bits
                tree[n].fc = zip_bi_reverse(next_code[len]++, len);

//      Tracec(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
//	  n, (isgraph(n) ? n : ' '), len, tree[n].fc, next_code[len]-1));
            }
        }

        /* ==========================================================================
         * Construct one Huffman tree and assigns the code bit strings and lengths.
         * Update the total bit length for the current block.
         * IN assertion: the field freq is set for all tree elements.
         * OUT assertions: the fields len and code are set to the optimal bit length
         *     and corresponding code. The length opt_len is updated; static_len is
         *     also updated if stree is not null. The field max_code is set.
         */
        function zip_build_tree(desc) { // the tree descriptor
            var tree	= desc.dyn_tree;
            var stree	= desc.static_tree;
            var elems	= desc.elems;
            var n, m;		// iterate over heap elements
            var max_code = -1;	// largest code with non zero frequency
            var node = elems;	// next internal node of the tree

            /* Construct the initial heap, with least frequent element in
             * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
             * heap[0] is not used.
             */
            zip_heap_len = 0;
            zip_heap_max = zip_HEAP_SIZE;

            for(n = 0; n < elems; n++) {
                if(tree[n].fc != 0) {
                    zip_heap[++zip_heap_len] = max_code = n;
                    zip_depth[n] = 0;
                } else
                    tree[n].dl = 0;
            }

            /* The pkzip format requires that at least one distance code exists,
             * and that at least one bit should be sent even if there is only one
             * possible code. So to avoid special checks later on we force at least
             * two codes of non zero frequency.
             */
            while(zip_heap_len < 2) {
                var xnew = zip_heap[++zip_heap_len] = (max_code < 2 ? ++max_code : 0);
                tree[xnew].fc = 1;
                zip_depth[xnew] = 0;
                zip_opt_len--;
                if(stree != null)
                    zip_static_len -= stree[xnew].dl;
                // new is 0 or 1 so it does not have extra bits
            }
            desc.max_code = max_code;

            /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
             * establish sub-heaps of increasing lengths:
             */
            for(n = zip_heap_len >> 1; n >= 1; n--)
                zip_pqdownheap(tree, n);

            /* Construct the Huffman tree by repeatedly combining the least two
             * frequent nodes.
             */
            do {
                n = zip_heap[zip_SMALLEST];
                zip_heap[zip_SMALLEST] = zip_heap[zip_heap_len--];
                zip_pqdownheap(tree, zip_SMALLEST);

                m = zip_heap[zip_SMALLEST];  // m = node of next least frequency

                // keep the nodes sorted by frequency
                zip_heap[--zip_heap_max] = n;
                zip_heap[--zip_heap_max] = m;

                // Create a new node father of n and m
                tree[node].fc = tree[n].fc + tree[m].fc;
//	depth[node] = (char)(MAX(depth[n], depth[m]) + 1);
                if(zip_depth[n] > zip_depth[m] + 1)
                    zip_depth[node] = zip_depth[n];
                else
                    zip_depth[node] = zip_depth[m] + 1;
                tree[n].dl = tree[m].dl = node;

                // and insert the new node in the heap
                zip_heap[zip_SMALLEST] = node++;
                zip_pqdownheap(tree, zip_SMALLEST);

            } while(zip_heap_len >= 2);

            zip_heap[--zip_heap_max] = zip_heap[zip_SMALLEST];

            /* At this point, the fields freq and dad are set. We can now
             * generate the bit lengths.
             */
            zip_gen_bitlen(desc);

            // The field len is now set, we can generate the bit codes
            zip_gen_codes(tree, max_code);
        }

        /* ==========================================================================
         * Scan a literal or distance tree to determine the frequencies of the codes
         * in the bit length tree. Updates opt_len to take into account the repeat
         * counts. (The contribution of the bit length codes will be added later
         * during the construction of bl_tree.)
         */
        function zip_scan_tree(tree,// the tree to be scanned
                               max_code) {  // and its largest code of non zero frequency
            var n;			// iterates over all tree elements
            var prevlen = -1;		// last emitted length
            var curlen;			// length of current code
            var nextlen = tree[0].dl;	// length of next code
            var count = 0;		// repeat count of the current code
            var max_count = 7;		// max repeat count
            var min_count = 4;		// min repeat count

            if(nextlen == 0) {
                max_count = 138;
                min_count = 3;
            }
            tree[max_code + 1].dl = 0xffff; // guard

            for(n = 0; n <= max_code; n++) {
                curlen = nextlen;
                nextlen = tree[n + 1].dl;
                if(++count < max_count && curlen == nextlen)
                    continue;
                else if(count < min_count)
                    zip_bl_tree[curlen].fc += count;
                else if(curlen != 0) {
                    if(curlen != prevlen)
                        zip_bl_tree[curlen].fc++;
                    zip_bl_tree[zip_REP_3_6].fc++;
                } else if(count <= 10)
                    zip_bl_tree[zip_REPZ_3_10].fc++;
                else
                    zip_bl_tree[zip_REPZ_11_138].fc++;
                count = 0; prevlen = curlen;
                if(nextlen == 0) {
                    max_count = 138;
                    min_count = 3;
                } else if(curlen == nextlen) {
                    max_count = 6;
                    min_count = 3;
                } else {
                    max_count = 7;
                    min_count = 4;
                }
            }
        }

        /* ==========================================================================
         * Send a literal or distance tree in compressed form, using the codes in
         * bl_tree.
         */
        function zip_send_tree(tree, // the tree to be scanned
                               max_code) { // and its largest code of non zero frequency
            var n;			// iterates over all tree elements
            var prevlen = -1;		// last emitted length
            var curlen;			// length of current code
            var nextlen = tree[0].dl;	// length of next code
            var count = 0;		// repeat count of the current code
            var max_count = 7;		// max repeat count
            var min_count = 4;		// min repeat count

            /* tree[max_code+1].dl = -1; */  /* guard already set */
            if(nextlen == 0) {
                max_count = 138;
                min_count = 3;
            }

            for(n = 0; n <= max_code; n++) {
                curlen = nextlen;
                nextlen = tree[n+1].dl;
                if(++count < max_count && curlen == nextlen) {
                    continue;
                } else if(count < min_count) {
                    do { zip_SEND_CODE(curlen, zip_bl_tree); } while(--count != 0);
                } else if(curlen != 0) {
                    if(curlen != prevlen) {
                        zip_SEND_CODE(curlen, zip_bl_tree);
                        count--;
                    }
                    // Assert(count >= 3 && count <= 6, " 3_6?");
                    zip_SEND_CODE(zip_REP_3_6, zip_bl_tree);
                    zip_send_bits(count - 3, 2);
                } else if(count <= 10) {
                    zip_SEND_CODE(zip_REPZ_3_10, zip_bl_tree);
                    zip_send_bits(count-3, 3);
                } else {
                    zip_SEND_CODE(zip_REPZ_11_138, zip_bl_tree);
                    zip_send_bits(count-11, 7);
                }
                count = 0;
                prevlen = curlen;
                if(nextlen == 0) {
                    max_count = 138;
                    min_count = 3;
                } else if(curlen == nextlen) {
                    max_count = 6;
                    min_count = 3;
                } else {
                    max_count = 7;
                    min_count = 4;
                }
            }
        }

        /* ==========================================================================
         * Construct the Huffman tree for the bit lengths and return the index in
         * bl_order of the last bit length code to send.
         */
        function zip_build_bl_tree() {
            var max_blindex;  // index of last bit length code of non zero freq

            // Determine the bit length frequencies for literal and distance trees
            zip_scan_tree(zip_dyn_ltree, zip_l_desc.max_code);
            zip_scan_tree(zip_dyn_dtree, zip_d_desc.max_code);

            // Build the bit length tree:
            zip_build_tree(zip_bl_desc);
            /* opt_len now includes the length of the tree representations, except
             * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
             */

            /* Determine the number of bit length codes to send. The pkzip format
             * requires that at least 4 bit length codes be sent. (appnote.txt says
             * 3 but the actual value used is 4.)
             */
            for(max_blindex = zip_BL_CODES-1; max_blindex >= 3; max_blindex--) {
                if(zip_bl_tree[zip_bl_order[max_blindex]].dl != 0) break;
            }
            /* Update opt_len to include the bit length tree and counts */
            zip_opt_len += 3*(max_blindex+1) + 5+5+4;
//    Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
//	    encoder->opt_len, encoder->static_len));

            return max_blindex;
        }

        /* ==========================================================================
         * Send the header for a block using dynamic Huffman trees: the counts, the
         * lengths of the bit length codes, the literal tree and the distance tree.
         * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
         */
        function zip_send_all_trees(lcodes, dcodes, blcodes) { // number of codes for each tree
            var rank; // index in bl_order

//    Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
//    Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
//	    "too many codes");
//    Tracev((stderr, "\nbl counts: "));
            zip_send_bits(lcodes-257, 5); // not +255 as stated in appnote.txt
            zip_send_bits(dcodes-1,   5);
            zip_send_bits(blcodes-4,  4); // not -3 as stated in appnote.txt
            for(rank = 0; rank < blcodes; rank++) {
//      Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
                zip_send_bits(zip_bl_tree[zip_bl_order[rank]].dl, 3);
            }

            // send the literal tree
            zip_send_tree(zip_dyn_ltree,lcodes-1);

            // send the distance tree
            zip_send_tree(zip_dyn_dtree,dcodes-1);
        }

        /* ==========================================================================
         * Determine the best encoding for the current block: dynamic trees, static
         * trees or store, and output the encoded block to the zip file.
         */
        function zip_flush_block(eof) { // true if this is the last block for a file
            var opt_lenb, static_lenb; // opt_len and static_len in bytes
            var max_blindex;	// index of last bit length code of non zero freq
            var stored_len;	// length of input block

            stored_len = zip_strstart - zip_block_start;
            zip_flag_buf[zip_last_flags] = zip_flags; // Save the flags for the last 8 items

            // Construct the literal and distance trees
            zip_build_tree(zip_l_desc);
//    Tracev((stderr, "\nlit data: dyn %ld, stat %ld",
//	    encoder->opt_len, encoder->static_len));

            zip_build_tree(zip_d_desc);
//    Tracev((stderr, "\ndist data: dyn %ld, stat %ld",
//	    encoder->opt_len, encoder->static_len));
            /* At this point, opt_len and static_len are the total bit lengths of
             * the compressed block data, excluding the tree representations.
             */

            /* Build the bit length tree for the above two trees, and get the index
             * in bl_order of the last bit length code to send.
             */
            max_blindex = zip_build_bl_tree();

            // Determine the best encoding. Compute first the block length in bytes
            opt_lenb	= (zip_opt_len   +3+7)>>3;
            static_lenb = (zip_static_len+3+7)>>3;

//    Trace((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u dist %u ",
//	   opt_lenb, encoder->opt_len,
//	   static_lenb, encoder->static_len, stored_len,
//	   encoder->last_lit, encoder->last_dist));

            if(static_lenb <= opt_lenb)
                opt_lenb = static_lenb;
            if(stored_len + 4 <= opt_lenb // 4: two words for the lengths
                && zip_block_start >= 0) {
                var i;

                /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
                 * Otherwise we can't have processed more than WSIZE input bytes since
                 * the last block flush, because compression would have been
                 * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
                 * transform a block into a stored block.
                 */
                zip_send_bits((zip_STORED_BLOCK<<1)+eof, 3);  /* send block type */
                zip_bi_windup();		 /* align on byte boundary */
                zip_put_short(stored_len);
                zip_put_short(~stored_len);

                // copy block
                /*
                 p = &window[block_start];
                 for(i = 0; i < stored_len; i++)
                 put_byte(p[i]);
                 */
                for(i = 0; i < stored_len; i++)
                    zip_put_byte(zip_window[zip_block_start + i]);

            } else if(static_lenb == opt_lenb) {
                zip_send_bits((zip_STATIC_TREES<<1)+eof, 3);
                zip_compress_block(zip_static_ltree, zip_static_dtree);
            } else {
                zip_send_bits((zip_DYN_TREES<<1)+eof, 3);
                zip_send_all_trees(zip_l_desc.max_code+1,
                    zip_d_desc.max_code+1,
                    max_blindex+1);
                zip_compress_block(zip_dyn_ltree, zip_dyn_dtree);
            }

            zip_init_block();

            if(eof != 0)
                zip_bi_windup();
        }

        /* ==========================================================================
         * Save the match info and tally the frequency counts. Return true if
         * the current block must be flushed.
         */
        function zip_ct_tally(
            dist, // distance of matched string
            lc) { // match length-MIN_MATCH or unmatched char (if dist==0)
            zip_l_buf[zip_last_lit++] = lc;
            if(dist == 0) {
                // lc is the unmatched char
                zip_dyn_ltree[lc].fc++;
            } else {
                // Here, lc is the match length - MIN_MATCH
                dist--;		    // dist = match distance - 1
//      Assert((ush)dist < (ush)MAX_DIST &&
//	     (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
//	     (ush)D_CODE(dist) < (ush)D_CODES,  "ct_tally: bad match");

                zip_dyn_ltree[zip_length_code[lc]+zip_LITERALS+1].fc++;
                zip_dyn_dtree[zip_D_CODE(dist)].fc++;

                zip_d_buf[zip_last_dist++] = dist;
                zip_flags |= zip_flag_bit;
            }
            zip_flag_bit <<= 1;

            // Output the flags if they fill a byte
            if((zip_last_lit & 7) == 0) {
                zip_flag_buf[zip_last_flags++] = zip_flags;
                zip_flags = 0;
                zip_flag_bit = 1;
            }
            // Try to guess if it is profitable to stop the current block here
            if(zip_compr_level > 2 && (zip_last_lit & 0xfff) == 0) {
                // Compute an upper bound for the compressed length
                var out_length = zip_last_lit * 8;
                var in_length = zip_strstart - zip_block_start;
                var dcode;

                for(dcode = 0; dcode < zip_D_CODES; dcode++) {
                    out_length += zip_dyn_dtree[dcode].fc * (5 + zip_extra_dbits[dcode]);
                }
                out_length >>= 3;
//      Trace((stderr,"\nlast_lit %u, last_dist %u, in %ld, out ~%ld(%ld%%) ",
//	     encoder->last_lit, encoder->last_dist, in_length, out_length,
//	     100L - out_length*100L/in_length));
                if(zip_last_dist < parseInt(zip_last_lit/2) &&
                    out_length < parseInt(in_length/2))
                    return true;
            }
            return (zip_last_lit == zip_LIT_BUFSIZE-1 ||
            zip_last_dist == zip_DIST_BUFSIZE);
            /* We avoid equality with LIT_BUFSIZE because of wraparound at 64K
             * on 16 bit machines and because stored blocks are restricted to
             * 64K-1 bytes.
             */
        }

        /* ==========================================================================
         * Send the block data compressed using the given Huffman trees
         */
        function zip_compress_block(
            ltree,	// literal tree
            dtree) {	// distance tree
            var dist;		// distance of matched string
            var lc;		// match length or unmatched char (if dist == 0)
            var lx = 0;		// running index in l_buf
            var dx = 0;		// running index in d_buf
            var fx = 0;		// running index in flag_buf
            var flag = 0;	// current flags
            var code;		// the code to send
            var extra;		// number of extra bits to send

            if(zip_last_lit != 0) do {
                if((lx & 7) == 0)
                    flag = zip_flag_buf[fx++];
                lc = zip_l_buf[lx++] & 0xff;
                if((flag & 1) == 0) {
                    zip_SEND_CODE(lc, ltree); /* send a literal byte */
//	Tracecv(isgraph(lc), (stderr," '%c' ", lc));
                } else {
                    // Here, lc is the match length - MIN_MATCH
                    code = zip_length_code[lc];
                    zip_SEND_CODE(code+zip_LITERALS+1, ltree); // send the length code
                    extra = zip_extra_lbits[code];
                    if(extra != 0) {
                        lc -= zip_base_length[code];
                        zip_send_bits(lc, extra); // send the extra length bits
                    }
                    dist = zip_d_buf[dx++];
                    // Here, dist is the match distance - 1
                    code = zip_D_CODE(dist);
//	Assert (code < D_CODES, "bad d_code");

                    zip_SEND_CODE(code, dtree);	  // send the distance code
                    extra = zip_extra_dbits[code];
                    if(extra != 0) {
                        dist -= zip_base_dist[code];
                        zip_send_bits(dist, extra);   // send the extra distance bits
                    }
                } // literal or match pair ?
                flag >>= 1;
            } while(lx < zip_last_lit);

            zip_SEND_CODE(zip_END_BLOCK, ltree);
        }

        /* ==========================================================================
         * Send a value on a given number of bits.
         * IN assertion: length <= 16 and value fits in length bits.
         */
        var zip_Buf_size = 16; // bit size of bi_buf
        function zip_send_bits(
            value,	// value to send
            length) {	// number of bits
            /* If not enough room in bi_buf, use (valid) bits from bi_buf and
             * (16 - bi_valid) bits from value, leaving (width - (16-bi_valid))
             * unused bits in value.
             */
            if(zip_bi_valid > zip_Buf_size - length) {
                zip_bi_buf |= (value << zip_bi_valid);
                zip_put_short(zip_bi_buf);
                zip_bi_buf = (value >> (zip_Buf_size - zip_bi_valid));
                zip_bi_valid += length - zip_Buf_size;
            } else {
                zip_bi_buf |= value << zip_bi_valid;
                zip_bi_valid += length;
            }
        }

        /* ==========================================================================
         * Reverse the first len bits of a code, using straightforward code (a faster
         * method would use a table)
         * IN assertion: 1 <= len <= 15
         */
        function zip_bi_reverse(
            code,	// the value to invert
            len) {	// its bit length
            var res = 0;
            do {
                res |= code & 1;
                code >>= 1;
                res <<= 1;
            } while(--len > 0);
            return res >> 1;
        }

        /* ==========================================================================
         * Write out any remaining bits in an incomplete byte.
         */
        function zip_bi_windup() {
            if(zip_bi_valid > 8) {
                zip_put_short(zip_bi_buf);
            } else if(zip_bi_valid > 0) {
                zip_put_byte(zip_bi_buf);
            }
            zip_bi_buf = 0;
            zip_bi_valid = 0;
        }

        function zip_qoutbuf() {
            if(zip_outcnt != 0) {
                var q, i;
                q = zip_new_queue();
                if(zip_qhead == null)
                    zip_qhead = zip_qtail = q;
                else
                    zip_qtail = zip_qtail.next = q;
                q.len = zip_outcnt - zip_outoff;
//      System.arraycopy(zip_outbuf, zip_outoff, q.ptr, 0, q.len);
                for(i = 0; i < q.len; i++)
                    q.ptr[i] = zip_outbuf[zip_outoff + i];
                zip_outcnt = zip_outoff = 0;
            }
        }

        function zip_deflate(str, level) {
            var out, buff;
            var i, j;

            zip_deflate_data = str;
            zip_deflate_pos = 0;
            if(typeof level == "undefined")
                level = zip_DEFAULT_LEVEL;
            zip_deflate_start(level);

            buff = new Array(1024);
            out = "";
            while((i = zip_deflate_internal(buff, 0, buff.length)) > 0) {
                for(j = 0; j < i; j++)
                    out += String.fromCharCode(buff[j]);
            }
            zip_deflate_data = null; // G.C.
            return out;
        }

        function zip_deflate_array(str, level) {
            var out, buff;
            var i, j;

            zip_deflate_data = str;
            zip_deflate_pos = 0;
            if(typeof level == "undefined")
                level = zip_DEFAULT_LEVEL;
            zip_deflate_start(level);

            buff = new Array(1024);
            out = [];
            while((i = zip_deflate_internal(buff, 0, buff.length)) > 0) {
                for(j = 0; j < i; j++)
                    out[out.length] = String.fromCharCode(buff[j]);
            }
            zip_deflate_data = null; // G.C.
            return out;
        }

        packageRoot.zip_deflate = zip_deflate;
        packageRoot.zip_deflate_array = zip_deflate_array;
    })(exports);

    /**
     * zip_inflate module
     *
     * Interface
     *  zip_inflate(src): String to String
     *  zip_inflate_array(src): String to Array
     */
    (function(packageRoot){
        /* Copyright (C) 1999,2012 Masanao Izumo <iz@onicos.co.jp>
         * Version: 1.0.1
         * LastModified: Jun 29 2012
         */

        /* Interface:
         * data = zip_inflate(src);
         */

        /* constant parameters */
        var zip_WSIZE = 32768;		// Sliding Window size
        var zip_STORED_BLOCK = 0;
        var zip_STATIC_TREES = 1;
        var zip_DYN_TREES    = 2;

        /* for inflate */
        var zip_lbits = 9; 		// bits in base literal/length lookup table
        var zip_dbits = 6; 		// bits in base distance lookup table
        var zip_INBUFSIZ = 32768;	// Input buffer size
        var zip_INBUF_EXTRA = 64;	// Extra buffer

        /* variables (inflate) */
        var zip_slide;
        var zip_wp;			// current position in slide
        var zip_fixed_tl = null;	// inflate static
        var zip_fixed_td;		// inflate static
        var zip_fixed_bl, fixed_bd;	// inflate static
        var zip_fixed_bd;
        var zip_bit_buf;		// bit buffer
        var zip_bit_len;		// bits in bit buffer
        var zip_method;
        var zip_eof;
        var zip_copy_leng;
        var zip_copy_dist;
        var zip_tl, zip_td;	// literal/length and distance decoder tables
        var zip_bl, zip_bd;	// number of bits decoded by tl and td

        var zip_inflate_data;
        var zip_inflate_pos;


        /* constant tables (inflate) */
        var zip_MASK_BITS = [0x0000,
            0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f, 0x00ff,
            0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff];
// Tables for deflate from PKZIP's appnote.txt.
        var zip_cplens = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
            35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0];
        /* note: see note #13 above about the 258 in this list. */
        var zip_cplext = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
            3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99]; // 99==invalid
        var zip_cpdist = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
            257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
            8193, 12289, 16385, 24577];
        var zip_cpdext = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
            7, 7, 8, 8, 9, 9, 10, 10, 11, 11,
            12, 12, 13, 13];
        var zip_border = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
        /* objects (inflate) */

        function zip_HuftList() {
            this.next = null;
            this.list = null;
        }

        function Zip_HuftNode() {
            this.e = 0; // number of extra bits or operation
            this.b = 0; // number of bits in this code or subcode

            // union
            this.n = 0; // literal, length base, or distance base
            this.t = null; // (Zip_HuftNode) pointer to next level of table
        }

        function Zip_HuftBuild(b,	// code lengths in bits (all assumed <= BMAX)
                               n,	// number of codes (assumed <= N_MAX)
                               s,	// number of simple-valued codes (0..s-1)
                               d,	// list of base values for non-simple codes
                               e,	// list of extra bits for non-simple codes
                               mm	// maximum lookup bits
        ) {
            this.BMAX = 16;   // maximum bit length of any code
            this.N_MAX = 288; // maximum number of codes in any set
            this.status = 0;	// 0: success, 1: incomplete table, 2: bad input
            this.root = null;	// (zip_HuftList) starting table
            this.m = 0;		// maximum lookup bits, returns actual

            /* Given a list of code lengths and a maximum table size, make a set of
             tables to decode that set of codes.	Return zero on success, one if
             the given code set is incomplete (the tables are still built in this
             case), two if the input is invalid (all zero length codes or an
             oversubscribed set of lengths), and three if not enough memory.
             The code with value 256 is special, and the tables are constructed
             so that no bits beyond that code are fetched when that code is
             decoded. */
            {
                var a;			// counter for codes of length k
                var c = new Array(this.BMAX+1);	// bit length count table
                var el;			// length of EOB code (value 256)
                var f;			// i repeats in table every f entries
                var g;			// maximum code length
                var h;			// table level
                var i;			// counter, current code
                var j;			// counter
                var k;			// number of bits in current code
                var lx = new Array(this.BMAX+1);	// stack of bits per table
                var p;			// pointer into c[], b[], or v[]
                var pidx;		// index of p
                var q;			// (Zip_HuftNode) points to current table
                var r = new Zip_HuftNode(); // table entry for structure assignment
                var u = new Array(this.BMAX); // Zip_HuftNode[BMAX][]  table stack
                var v = new Array(this.N_MAX); // values in order of bit length
                var w;
                var x = new Array(this.BMAX+1);// bit offsets, then code stack
                var xp;			// pointer into x or c
                var y;			// number of dummy codes added
                var z;			// number of entries in current table
                var o;
                var tail;		// (zip_HuftList)

                tail = this.root = null;
                for(i = 0; i < c.length; i++)
                    c[i] = 0;
                for(i = 0; i < lx.length; i++)
                    lx[i] = 0;
                for(i = 0; i < u.length; i++)
                    u[i] = null;
                for(i = 0; i < v.length; i++)
                    v[i] = 0;
                for(i = 0; i < x.length; i++)
                    x[i] = 0;

                // Generate counts for each bit length
                el = n > 256 ? b[256] : this.BMAX; // set length of EOB code, if any
                p = b; pidx = 0;
                i = n;
                do {
                    c[p[pidx]]++;	// assume all entries <= BMAX
                    pidx++;
                } while(--i > 0);
                if(c[0] == n) {	// null input--all zero length codes
                    this.root = null;
                    this.m = 0;
                    this.status = 0;
                    return;
                }

                // Find minimum and maximum length, bound *m by those
                for(j = 1; j <= this.BMAX; j++)
                    if(c[j] != 0)
                        break;
                k = j;			// minimum code length
                if(mm < j)
                    mm = j;
                for(i = this.BMAX; i != 0; i--)
                    if(c[i] != 0)
                        break;
                g = i;			// maximum code length
                if(mm > i)
                    mm = i;

                // Adjust last length count to fill out codes, if needed
                for(y = 1 << j; j < i; j++, y <<= 1)
                    if((y -= c[j]) < 0) {
                        this.status = 2;	// bad input: more codes than bits
                        this.m = mm;
                        return;
                    }
                if((y -= c[i]) < 0) {
                    this.status = 2;
                    this.m = mm;
                    return;
                }
                c[i] += y;

                // Generate starting offsets into the value table for each length
                x[1] = j = 0;
                p = c;
                pidx = 1;
                xp = 2;
                while(--i > 0)		// note that i == g from above
                    x[xp++] = (j += p[pidx++]);

                // Make a table of values in order of bit lengths
                p = b; pidx = 0;
                i = 0;
                do {
                    if((j = p[pidx++]) != 0)
                        v[x[j]++] = i;
                } while(++i < n);
                n = x[g];			// set n to length of v

                // Generate the Huffman codes and for each, make the table entries
                x[0] = i = 0;		// first Huffman code is zero
                p = v; pidx = 0;		// grab values in bit order
                h = -1;			// no tables yet--level -1
                w = lx[0] = 0;		// no bits decoded yet
                q = null;			// ditto
                z = 0;			// ditto

                // go through the bit lengths (k already is bits in shortest code)
                for(; k <= g; k++) {
                    a = c[k];
                    while(a-- > 0) {
                        // here i is the Huffman code of length k bits for value p[pidx]
                        // make tables up to required level
                        while(k > w + lx[1 + h]) {
                            w += lx[1 + h]; // add bits already decoded
                            h++;

                            // compute minimum size table less than or equal to *m bits
                            z = (z = g - w) > mm ? mm : z; // upper limit
                            if((f = 1 << (j = k - w)) > a + 1) { // try a k-w bit table
                                // too few codes for k-w bit table
                                f -= a + 1;	// deduct codes from patterns left
                                xp = k;
                                while(++j < z) { // try smaller tables up to z bits
                                    if((f <<= 1) <= c[++xp])
                                        break;	// enough codes to use up j bits
                                    f -= c[xp];	// else deduct codes from patterns
                                }
                            }
                            if(w + j > el && w < el)
                                j = el - w;	// make EOB code end at table
                            z = 1 << j;	// table entries for j-bit table
                            lx[1 + h] = j; // set table size in stack

                            // allocate and link in new table
                            q = new Array(z);
                            for(o = 0; o < z; o++) {
                                q[o] = new Zip_HuftNode();
                            }

                            if(tail == null)
                                tail = this.root = new zip_HuftList();
                            else
                                tail = tail.next = new zip_HuftList();
                            tail.next = null;
                            tail.list = q;
                            u[h] = q;	// table starts after link

                            /* connect to last table, if there is one */
                            if(h > 0) {
                                x[h] = i;		// save pattern for backing up
                                r.b = lx[h];	// bits to dump before this table
                                r.e = 16 + j;	// bits in this table
                                r.t = q;		// pointer to this table
                                j = (i & ((1 << w) - 1)) >> (w - lx[h]);
                                u[h-1][j].e = r.e;
                                u[h-1][j].b = r.b;
                                u[h-1][j].n = r.n;
                                u[h-1][j].t = r.t;
                            }
                        }

                        // set up table entry in r
                        r.b = k - w;
                        if(pidx >= n)
                            r.e = 99;		// out of values--invalid code
                        else if(p[pidx] < s) {
                            r.e = (p[pidx] < 256 ? 16 : 15); // 256 is end-of-block code
                            r.n = p[pidx++];	// simple code is just the value
                        } else {
                            r.e = e[p[pidx] - s];	// non-simple--look up in lists
                            r.n = d[p[pidx++] - s];
                        }

                        // fill code-like entries with r //
                        f = 1 << (k - w);
                        for(j = i >> w; j < z; j += f) {
                            q[j].e = r.e;
                            q[j].b = r.b;
                            q[j].n = r.n;
                            q[j].t = r.t;
                        }

                        // backwards increment the k-bit code i
                        for(j = 1 << (k - 1); (i & j) != 0; j >>= 1)
                            i ^= j;
                        i ^= j;

                        // backup over finished tables
                        while((i & ((1 << w) - 1)) != x[h]) {
                            w -= lx[h];		// don't need to update q
                            h--;
                        }
                    }
                }

                /* return actual size of base table */
                this.m = lx[1];

                /* Return true (1) if we were given an incomplete table */
                this.status = ((y != 0 && g != 1) ? 1 : 0);
            } /* end of constructor */
        }


        /* routines (inflate) */

        function zip_GET_BYTE() {
            if(zip_inflate_data.length == zip_inflate_pos)
                return -1;
            return zip_inflate_data[zip_inflate_pos++] & 0xff;
        }

        function zip_NEEDBITS(n) {
            while(zip_bit_len < n) {
                zip_bit_buf |= zip_GET_BYTE() << zip_bit_len;
                zip_bit_len += 8;
            }
        }

        function zip_GETBITS(n) {
            return zip_bit_buf & zip_MASK_BITS[n];
        }

        function zip_DUMPBITS(n) {
            zip_bit_buf >>= n;
            zip_bit_len -= n;
        }

        function zip_inflate_codes(buff, off, size) {
            /* inflate (decompress) the codes in a deflated (compressed) block.
             Return an error code or zero if it all goes ok. */
            var e;		// table entry flag/number of extra bits
            var t;		// (Zip_HuftNode) pointer to table entry
            var n;

            if(size == 0)
                return 0;

            // inflate the coded data
            n = 0;
            for(;;) {			// do until end of block
                zip_NEEDBITS(zip_bl);
                t = zip_tl.list[zip_GETBITS(zip_bl)];
                e = t.e;
                while(e > 16) {
                    if(e == 99)
                        return -1;
                    zip_DUMPBITS(t.b);
                    e -= 16;
                    zip_NEEDBITS(e);
                    t = t.t[zip_GETBITS(e)];
                    e = t.e;
                }
                zip_DUMPBITS(t.b);

                if(e == 16) {		// then it's a literal
                    zip_wp &= zip_WSIZE - 1;
                    buff[off + n++] = zip_slide[zip_wp++] = t.n;
                    if(n == size)
                        return size;
                    continue;
                }

                // exit if end of block
                if(e == 15)
                    break;

                // it's an EOB or a length

                // get length of block to copy
                zip_NEEDBITS(e);
                zip_copy_leng = t.n + zip_GETBITS(e);
                zip_DUMPBITS(e);

                // decode distance of block to copy
                zip_NEEDBITS(zip_bd);
                t = zip_td.list[zip_GETBITS(zip_bd)];
                e = t.e;

                while(e > 16) {
                    if(e == 99)
                        return -1;
                    zip_DUMPBITS(t.b);
                    e -= 16;
                    zip_NEEDBITS(e);
                    t = t.t[zip_GETBITS(e)];
                    e = t.e;
                }
                zip_DUMPBITS(t.b);
                zip_NEEDBITS(e);
                zip_copy_dist = zip_wp - t.n - zip_GETBITS(e);
                zip_DUMPBITS(e);

                // do the copy
                while(zip_copy_leng > 0 && n < size) {
                    zip_copy_leng--;
                    zip_copy_dist &= zip_WSIZE - 1;
                    zip_wp &= zip_WSIZE - 1;
                    buff[off + n++] = zip_slide[zip_wp++]
                        = zip_slide[zip_copy_dist++];
                }

                if(n == size)
                    return size;
            }

            zip_method = -1; // done
            return n;
        }

        function zip_inflate_stored(buff, off, size) {
            /* "decompress" an inflated type 0 (stored) block. */
            var n;

            // go to byte boundary
            n = zip_bit_len & 7;
            zip_DUMPBITS(n);

            // get the length and its complement
            zip_NEEDBITS(16);
            n = zip_GETBITS(16);
            zip_DUMPBITS(16);
            zip_NEEDBITS(16);
            if(n != ((~zip_bit_buf) & 0xffff))
                return -1;			// error in compressed data
            zip_DUMPBITS(16);

            // read and output the compressed data
            zip_copy_leng = n;

            n = 0;
            while(zip_copy_leng > 0 && n < size) {
                zip_copy_leng--;
                zip_wp &= zip_WSIZE - 1;
                zip_NEEDBITS(8);
                buff[off + n++] = zip_slide[zip_wp++] =
                    zip_GETBITS(8);
                zip_DUMPBITS(8);
            }

            if(zip_copy_leng == 0)
                zip_method = -1; // done
            return n;
        }

        function zip_inflate_fixed(buff, off, size) {
            /* decompress an inflated type 1 (fixed Huffman codes) block.  We should
             either replace this with a custom decoder, or at least precompute the
             Huffman tables. */

            // if first time, set up tables for fixed blocks
            if(zip_fixed_tl == null) {
                var i;			// temporary variable
                var l = new Array(288);	// length list for huft_build
                var h;	// Zip_HuftBuild

                // literal table
                for(i = 0; i < 144; i++)
                    l[i] = 8;
                for(; i < 256; i++)
                    l[i] = 9;
                for(; i < 280; i++)
                    l[i] = 7;
                for(; i < 288; i++)	// make a complete, but wrong code set
                    l[i] = 8;
                zip_fixed_bl = 7;

                h = new Zip_HuftBuild(l, 288, 257, zip_cplens, zip_cplext,
                    zip_fixed_bl);
                if(h.status != 0) {
                    // alert("HufBuild error: "+h.status);
                    return -1;
                }
                zip_fixed_tl = h.root;
                zip_fixed_bl = h.m;

                // distance table
                for(i = 0; i < 30; i++)	// make an incomplete code set
                    l[i] = 5;
                zip_fixed_bd = 5;

                h = new Zip_HuftBuild(l, 30, 0, zip_cpdist, zip_cpdext, zip_fixed_bd);
                if(h.status > 1) {
                    zip_fixed_tl = null;
                    // alert("HufBuild error: "+h.status);
                    return -1;
                }
                zip_fixed_td = h.root;
                zip_fixed_bd = h.m;
            }

            zip_tl = zip_fixed_tl;
            zip_td = zip_fixed_td;
            zip_bl = zip_fixed_bl;
            zip_bd = zip_fixed_bd;
            return zip_inflate_codes(buff, off, size);
        }

        function zip_inflate_dynamic(buff, off, size) {
            // decompress an inflated type 2 (dynamic Huffman codes) block.
            var i;		// temporary variables
            var j;
            var l;		// last length
            var n;		// number of lengths to get
            var t;		// (Zip_HuftNode) literal/length code table
            var nb;		// number of bit length codes
            var nl;		// number of literal/length codes
            var nd;		// number of distance codes
            var ll = new Array(286+30); // literal/length and distance code lengths
            var h;		// (Zip_HuftBuild)

            for(i = 0; i < ll.length; i++)
                ll[i] = 0;

            // read in table lengths
            zip_NEEDBITS(5);
            nl = 257 + zip_GETBITS(5);	// number of literal/length codes
            zip_DUMPBITS(5);
            zip_NEEDBITS(5);
            nd = 1 + zip_GETBITS(5);	// number of distance codes
            zip_DUMPBITS(5);
            zip_NEEDBITS(4);
            nb = 4 + zip_GETBITS(4);	// number of bit length codes
            zip_DUMPBITS(4);
            if(nl > 286 || nd > 30)
                return -1;		// bad lengths

            // read in bit-length-code lengths
            for(j = 0; j < nb; j++)
            {
                zip_NEEDBITS(3);
                ll[zip_border[j]] = zip_GETBITS(3);
                zip_DUMPBITS(3);
            }
            for(; j < 19; j++)
                ll[zip_border[j]] = 0;

            // build decoding table for trees--single level, 7 bit lookup
            zip_bl = 7;
            h = new Zip_HuftBuild(ll, 19, 19, null, null, zip_bl);
            if(h.status != 0)
                return -1;	// incomplete code set

            zip_tl = h.root;
            zip_bl = h.m;

            // read in literal and distance code lengths
            n = nl + nd;
            i = l = 0;
            while(i < n) {
                zip_NEEDBITS(zip_bl);
                t = zip_tl.list[zip_GETBITS(zip_bl)];
                j = t.b;
                zip_DUMPBITS(j);
                j = t.n;
                if(j < 16)		// length of code in bits (0..15)
                    ll[i++] = l = j;	// save last length in l
                else if(j == 16) {	// repeat last length 3 to 6 times
                    zip_NEEDBITS(2);
                    j = 3 + zip_GETBITS(2);
                    zip_DUMPBITS(2);
                    if(i + j > n)
                        return -1;
                    while(j-- > 0)
                        ll[i++] = l;
                } else if(j == 17) {	// 3 to 10 zero length codes
                    zip_NEEDBITS(3);
                    j = 3 + zip_GETBITS(3);
                    zip_DUMPBITS(3);
                    if(i + j > n)
                        return -1;
                    while(j-- > 0)
                        ll[i++] = 0;
                    l = 0;
                } else {		// j == 18: 11 to 138 zero length codes
                    zip_NEEDBITS(7);
                    j = 11 + zip_GETBITS(7);
                    zip_DUMPBITS(7);
                    if(i + j > n)
                        return -1;
                    while(j-- > 0)
                        ll[i++] = 0;
                    l = 0;
                }
            }

            // build the decoding tables for literal/length and distance codes
            zip_bl = zip_lbits;
            h = new Zip_HuftBuild(ll, nl, 257, zip_cplens, zip_cplext, zip_bl);
            if(zip_bl == 0)	// no literals or lengths
                h.status = 1;
            if(h.status != 0) {
                //if(h.status == 1)
                //    ;// **incomplete literal tree**
                return -1;		// incomplete code set
            }
            zip_tl = h.root;
            zip_bl = h.m;

            for(i = 0; i < nd; i++)
                ll[i] = ll[i + nl];
            zip_bd = zip_dbits;
            h = new Zip_HuftBuild(ll, nd, 0, zip_cpdist, zip_cpdext, zip_bd);
            zip_td = h.root;
            zip_bd = h.m;

            if(zip_bd == 0 && nl > 257) {   // lengths but no distances
                // **incomplete distance tree**
                return -1;
            }

            //if(h.status == 1) {
            //    ;// **incomplete distance tree**
            //}
            if(h.status != 0)
                return -1;

            // decompress until an end-of-block code
            return zip_inflate_codes(buff, off, size);
        }

        function zip_inflate_start() {
            //var i;

            if(zip_slide == null)
                zip_slide = new Array(2 * zip_WSIZE);
            zip_wp = 0;
            zip_bit_buf = 0;
            zip_bit_len = 0;
            zip_method = -1;
            zip_eof = false;
            zip_copy_leng = zip_copy_dist = 0;
            zip_tl = null;
        }

        function zip_inflate_internal(buff, off, size) {
            // decompress an inflated entry
            var n, i;

            n = 0;
            while(n < size) {
                if(zip_eof && zip_method == -1)
                    return n;

                if(zip_copy_leng > 0) {
                    if(zip_method != zip_STORED_BLOCK) {
                        // STATIC_TREES or DYN_TREES
                        while(zip_copy_leng > 0 && n < size) {
                            zip_copy_leng--;
                            zip_copy_dist &= zip_WSIZE - 1;
                            zip_wp &= zip_WSIZE - 1;
                            buff[off + n++] = zip_slide[zip_wp++] =
                                zip_slide[zip_copy_dist++];
                        }
                    } else {
                        while(zip_copy_leng > 0 && n < size) {
                            zip_copy_leng--;
                            zip_wp &= zip_WSIZE - 1;
                            zip_NEEDBITS(8);
                            buff[off + n++] = zip_slide[zip_wp++] = zip_GETBITS(8);
                            zip_DUMPBITS(8);
                        }
                        if(zip_copy_leng == 0)
                            zip_method = -1; // done
                    }
                    if(n == size)
                        return n;
                }

                if(zip_method == -1) {
                    if(zip_eof)
                        break;

                    // read in last block bit
                    zip_NEEDBITS(1);
                    if(zip_GETBITS(1) != 0)
                        zip_eof = true;
                    zip_DUMPBITS(1);

                    // read in block type
                    zip_NEEDBITS(2);
                    zip_method = zip_GETBITS(2);
                    zip_DUMPBITS(2);
                    zip_tl = null;
                    zip_copy_leng = 0;
                }

                switch(zip_method) {
                    case 0: // zip_STORED_BLOCK
                        i = zip_inflate_stored(buff, off + n, size - n);
                        break;

                    case 1: // zip_STATIC_TREES
                        if(zip_tl != null)
                            i = zip_inflate_codes(buff, off + n, size - n);
                        else
                            i = zip_inflate_fixed(buff, off + n, size - n);
                        break;

                    case 2: // zip_DYN_TREES
                        if(zip_tl != null)
                            i = zip_inflate_codes(buff, off + n, size - n);
                        else
                            i = zip_inflate_dynamic(buff, off + n, size - n);
                        break;

                    default: // error
                        i = -1;
                        break;
                }

                if(i == -1) {
                    if(zip_eof)
                        return 0;
                    return -1;
                }
                n += i;
            }
            return n;
        }

        /*
         * Input:
         * ArrayBuffer
         * Array
         * String
         *
         * Output:
         * 'string': return string
         * 'array': return array
         */
        function zip_inflate(input, start, end, outputType) {
            var out, buff;
            var i, j;

            zip_inflate_start();
            zip_inflate_data = input;
            zip_inflate_pos = start || 0;
            var last_zip_inflate_pos = -1;

            if (typeof input == 'object') {
                if (input.byteLength) {
                    zip_inflate_data = new Uint8Array(input, 0, (end != undefined && start != undefined) ? end : input.byteLength);
                }

                zip_GET_BYTE = function() {
                    if(zip_inflate_data.length == zip_inflate_pos)
                        return -1;
                    return zip_inflate_data[zip_inflate_pos++] & 0xff;
                };
            //} else if (typeof input == 'string') {
            } else {
                //is string by default
                zip_GET_BYTE = function() {
                    if(zip_inflate_data.length == zip_inflate_pos)
                        return -1;
                    return zip_inflate_data.charCodeAt(zip_inflate_pos++) & 0xff;
                };
            }

            buff = new Array(1024);
            out = outputType == 'array' ? [] : "";
            var setter = function(v) {
                out += v;
            };
            if (outputType == 'array') {
                setter = function(v) {
                    out[out.length] = v;
                }
            }
            if (outputType == 'string') {
                setter = function(v) {
                    out += String.fromCharCode(v);
                };
            }
            while((i = zip_inflate_internal(buff, 0, buff.length)) > 0 &&
            last_zip_inflate_pos != zip_inflate_pos) {
                last_zip_inflate_pos = zip_inflate_pos;
                for (j = i + 1; --j;) {
                    setter(buff[i - j]);
                }
            }
            zip_inflate_data = null;
            return out;
        }

        packageRoot.zip_inflate = zip_inflate;
    })(exports);

    /**
     * Zip Interface
     */
    (function(packageRoot){
        'use strict';

        var crc32 = packageRoot.crc32,
        // magic numbers marking this file as GZIP
            ID1 = 0x1F,
            ID2 = 0x8B,
            compressionMethods = {
                'deflate': 8
            },
            possibleFlags = {
                'FTEXT': 0x01,
                'FHCRC': 0x02,
                'FEXTRA': 0x04,
                'FNAME': 0x08,
                'FCOMMENT': 0x10
            },
            osMap = {
                'fat': 0, // FAT file system (DOS, OS/2, NT) + PKZIPW 2.50 VFAT, NTFS
                'amiga': 1, // Amiga
                'vmz': 2, // VMS (VAX or Alpha AXP)
                'unix': 3, // Unix
                'vm/cms': 4, // VM/CMS
                'atari': 5, // Atari
                'hpfs': 6, // HPFS file system (OS/2, NT 3.x)
                'macintosh': 7, // Macintosh
                'z-system': 8, // Z-System
                'cplm': 9, // CP/M
                'tops-20': 10, // TOPS-20
                'ntfs': 11, // NTFS file system (NT)
                'qdos': 12, // SMS/QDOS
                'acorn': 13, // Acorn RISC OS
                'vfat': 14, // VFAT file system (Win95, NT)
                'vms': 15, // MVS (code also taken for PRIMOS)
                'beos': 16, // BeOS (BeBox or PowerMac)
                'tandem': 17, // Tandem/NSK
                'theos': 18 // THEOS
            },
            os = 'unix',
            DEFAULT_LEVEL = 6;

        /*
         * ZIPs a file in GZIP format. The format is as given by the spec, found at:
         * http://www.gzip.org/zlib/rfc-gzip.html
         *
         * Omitted parts in this implementation:
         */
        function zipString(data, options) {
            options = options || {};
            var flags = 0, level = options.level || DEFAULT_LEVEL, out = "";

            out += String.fromCharCode(ID1 & 0xff);
            out += String.fromCharCode(ID2 & 0xff);
            out += String.fromCharCode(compressionMethods['deflate'] & 0xff);

            if (options.name) {
                flags |= possibleFlags['FNAME'];
            }
            out += String.fromCharCode(flags & 0xff);

            var ts = options.timestamp || parseInt(Date.now() / 1000, 10);
            out += String.fromCharCode(ts & 0xff);
            out += String.fromCharCode((ts & 0xff00) >>> 8);
            out += String.fromCharCode((ts & 0xff0000) >>> 16);
            out += String.fromCharCode((ts & 0xff000000) >>> 24);

            if (level === 1) {
                out += String.fromCharCode(4);
            } else if (level === 9) {
                out += String.fromCharCode(2);
            } else {
                out += String.fromCharCode(0);
            }

            out += String.fromCharCode(osMap[os]);

            if (options.name) {
                var s = options.name.substring(options.name.lastIndexOf('/') + 1);
                var c = s.shift();
                while (c !== String.fromCharCode(0)) {
                    out += c;
                    c = s.shift();
                }
                out += String.fromCharCode(0);
            }

            out += packageRoot.zip_deflate(data, level);

            var cc = parseInt(crc32(data), 16);
            out += String.fromCharCode( cc & 0xff);
            out += String.fromCharCode((cc & 0xff00) >>> 8);
            out += String.fromCharCode((cc & 0xff0000) >>> 16);
            out += String.fromCharCode((cc & 0xff000000) >>> 24);

            cc = data.length;
            out += String.fromCharCode( cc & 0xff);
            out += String.fromCharCode((cc & 0xff00) >>> 8);
            out += String.fromCharCode((cc & 0xff0000) >>> 16);
            out += String.fromCharCode((cc & 0xff000000) >>> 24);

            return out;
        }

        /**
         * Unzip(inflate)
         * @param data
         * @param outputType: 'array' or 'string'
         * @param noCRC
         * @returns {*}
         */
        function unzip(data, outputType, noCRC) {
            var t, compressionMethod = "", flags,
                os, crc, size, res, p = 0;
            var type;

            var getByte, length;
            if (typeof data === 'object' && !data.byteLength && data.length > 0 && data.length < Math.pow(2, 53) - 1) {
                getByte = function() {
                    return data[p++];
                };
                type = 'array';
                length = data.length;
            //} else if (typeof data === 'string') {
            } else if (typeof data === 'object' && data.byteLength) {
                var int8 = new Uint8Array(data);
                getByte = function() {
                    return int8[p++];
                };
                type = 'arraybuffer';
                length = int8.length;
            } else {
                //type is string as default
                getByte = function() {
                    return data.charCodeAt(p++);
                };
                type = 'string';
                length = data.length;
            }

            if (getByte() !== ID1 || getByte() !== ID2) {
                throw "Not a GZIP file";
            }

            t = getByte();
            //var v = H.each(compressionMethods, function(v, k) {
            //    if (v === t) {
            //        compressionMethod = k;
            //        return v;
            //    }
            //}).values();
            //if (v.length === 0) {
            //    throw 'Unsupported compression method';
            //}
            if (t != compressionMethods.deflate) {
                throw 'Unsupported compression method';
            } else {
                compressionMethod = 'deflate';
            }

            flags = getByte();

            p += 5;

            t = getByte();
            //H.each(osMap, function(v, k) {
            //    if (t === v) {
            //        os = k;
            //    }
            //});

            if (flags & possibleFlags['FEXTRA']) {
                t = getByte() | (getByte() << 8);
                p += t;
            }

            if (flags & possibleFlags['FNAME']) {
                while (getByte() !== 0) {}
                p++;
            }

            if (flags & possibleFlags['FCOMMENT']) {
                while (getByte() !== 0) {}
                p++;
            }

            if (flags & possibleFlags['FHCRC']) {
                p += 2;
            }

            if (compressionMethod === "deflate") {
                res = packageRoot.zip_inflate(data, p, length - 8, outputType || 'string');

                p = length - 8;
            }

            if (!noCRC) {
                var crcs = [getByte(), getByte(), getByte(), getByte()];
                crc = crcs[0];
                crc |= (crcs[1] << 8);
                var n2 = crcs[2];
                n2 |= (crcs[3] << 8);
                if (n2 > 32768) {
                    crc = (((n2 - 32768) << 16) + crc) + 32768 * Math.pow(2, 16);
                } else {
                    crc += (n2 << 16);
                }
                if (crc !== parseInt(crc32(res), 16)) {
                    throw 'Checksum doesnt match';
                }
            } else {
                p += 4;
            }

            var ss = [getByte(), getByte(), getByte(), getByte()]; //no need to inc anymore
            size = ss[0];
            size |= (ss[1] << 8);
            n2 = ss[2];
            n2 |= (ss[3] << 8);
            if (n2 > 32768) {
                size = (((n2 - 32768) << 16) | size) + 32768 * Math.pow(2, 16);
            } else {
                size |= (n2 << 16);
            }
            if (size != (res.byteLength || res.length)) {
                throw 'Size of decompressed file not correct.';
            }

            return res;
        }

        packageRoot.zipStr = zipString;

        packageRoot.unzipStr = function(data, noCRC) {
            return unzip(data, 'string', noCRC);
        };

        packageRoot.unzipToArray = function(data, noCRC) {
            return unzip(data, 'array', noCRC);
        };

        packageRoot.unzip = unzip;

        packageRoot.getDefaultLevel = function() {
            return DEFAULT_LEVEL;
        }
    })(exports);

    exports.encodePassword = function(p) {
        var pass = exports.MD5(p);
        var pc = H.eachIndex(pass.length, function(i) {
            return pass[i];
        });

        for (var i = 0; i < 14; i++) {
            var c = pc[i];
            pc[i] = pc[pass.length - i - 1];
            pc[pass.length - i - 1] = c;
        }
        return pc.join().toUpperCase();
    };

    //fallback from arraybuffer to be impl.
    exports.fastUnzip = function(src, noCRC) {
        src = exports.base64decode(src, 'arraybuffer');
        src = exports.unzip(src, 'array', noCRC);
        src = exports.ba2ua(src);
        src = exports.a2s(src);
        //src = decodeCodePointsArray(src);
        //src = String.fromCharCode.apply(null, src);
        return src;
    };

    exports.ungzip = function(src, noCRC) {
        src = exports.base64decode(src);
        src = exports.unzipStr(src, noCRC);
        src = exports.s2uni(src);
        return src;
    };

    exports.gzip = function(data) {
        //data = exports.des(decryptKey, data, 0, 0);
        data = exports.zipStr(data);
        data = exports.base64encode(data);
        return data;
    };

    exports.decode = function(data) {
        //JDK PKCS5Padding, trailing (m - (l mod m)) bytes
        data.replace("\\\/", "\/");
        data = exports.base64decode(data);
        //guess encoding sequence
        var ID1 = 0x1F, ID2 = 0x8B;
        //note: there is no de-padding in des code above.
        if (data.charCodeAt(0) === ID1 && data.charCodeAt(1) === ID2) {
            //is gzipped
            data = exports.unzipStr(data);
            data = exports.des(exports.decryptKey || "IDS12345", data, 0, 0);

            //des depadding
            var p = data[data.length - 1].charCodeAt(0);
            data = data.substring(0, data.length - p);
        } else {
            data = exports.des(exports.decryptKey || "IDS12345", data, 0, 0);
            //depadding first
            var padding = data[data.length - 1].charCodeAt(0);
            data = data.substring(0, data.length - padding);
            if (data.charCodeAt(0) === ID1 && data.charCodeAt(1) === ID2) {
                //is gzipped
                // data = PAKO.unzipToString(data, 1);
                data = exports.unzipStr(data, 1);
            } else {
                console.error('Not a GZip File!');
            }
        }
        if (data) {
            data = exports.s2uni(data);
        }
        return data;
    };

    exports.deGZipRawData = function(result, callback){
        result = exports.base64decode(result);
        result = exports.unzipStr(result);
        result = utf82str(result);
        if (callback) callback(result);
        return result;
    };

    /*
     * Binds
     */
    if (typeof define === "function" && define.amd) {
        define("E", ['H'], function() {
            return E;
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exports;
    }

    root.E = root.encryption = exports;
}(this);