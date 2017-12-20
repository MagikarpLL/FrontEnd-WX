/**
 * Created by jliu on 2017/8/18.
 */
;(function(root) {
    if (typeof module !== 'undefined' && module.exports) {
        root = GLOBAL;
    }

    var Operator = {};
    Operator.getInstance = function (obj) {
        if(!this.instance){

        }
    }

}).call(this);

function getTimeWithDateString(dateStr) {
    // var date = new Date(dateStr);
    // var time = date.getTime();
    // return time;
    var newstr = dateStr.replace(/-/g,'/');
    var date =  new Date(newstr);
    var time_str = date.getTime().toString();
    return time_str;
}

function getCurrentStratDate() {
    var start=new Date();
    start.setHours(0);
    start.setMinutes(0);
    start.setSeconds(0);
    start.setMilliseconds(0);
    var todayStartTime=Date.parse(start);
    return todayStartTime;
}

function getCurrentEndDate() {
    var end=new Date();
    end.setHours(23);
    end.setMinutes(59);
    end.setSeconds(59);
    end.setMilliseconds(59);
    var todayEndTime=Date.parse(end);
    return todayEndTime;
}

function add0(m){return m<10?'0'+m:m }
function format(shijianchuo)
{
//shijianchuo是整数，否则要parseInt转换
    var time = new Date(shijianchuo);
    var y = time.getFullYear();
    var m = time.getMonth()+1;
    var d = time.getDate();
    var h = time.getHours();
    var mm = time.getMinutes();
    var s = time.getSeconds();
    return y+'-'+add0(m)+'-'+add0(d)+' '+add0(h)+':'+add0(mm);
}

function formatNoHour(shijianchuo)
{
//shijianchuo是整数，否则要parseInt转换
    var time = new Date(shijianchuo);
    var y = time.getFullYear();
    var m = time.getMonth()+1;
    var d = time.getDate();
    var h = time.getHours();
    var mm = time.getMinutes();
    var s = time.getSeconds();
    return y+add0(m)+add0(d);
}