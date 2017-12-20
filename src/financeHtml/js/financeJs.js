var financeStr = sessionStorage.getItem("selectFinance");
var invoiceStr = sessionStorage.getItem("selectInvoice");
var invoice = JSON.parse(invoiceStr);
var financeAddOrChange = 0;
var invoiceAddOrChange = 0;
function getLocalTimeWithNoHour(nS) {
    da = new Date(nS);
    var year = da.getFullYear();
    var month = da.getMonth()+1;
    if(month < 10) {
        month = "0" + month;
    }
    var date = da.getDate();
    if(date < 10) {
        date = "0" + date;
    }
    return [year,month,date].join('-');
}

// function getWitdhAndHeight(url) {
//
//     var realWidth;//真实的宽度
//     var realHeight;//真实的高度
//     var imgtemp = new Image();//创建一个image对象
//     imgtemp.src = url;
//     imgtemp.onload = function () {//图片加载完成后执行
//         var _stemp = this;//将当前指针复制给新的变量，不然会导致变量共用
//         realWidth = this.width;
//         realHeight = this.height;
//         return [realWidth, realHeight];
//     }
// }

function GetQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)","i");
    var r = window.location.search.substr(1).match(reg);
    if (r!=null) return unescape(r[2]); return null;
}
function isUndefined(value){
    //获得undefined，保证它没有被重新赋值
    var undefined = void(0);
    return value === undefined;
}

function getTimeWithDateString(dateStr) {
    var date = new Date(dateStr);
    var time = date.getTime();
    return time;
}

function getLocalTime(nS) {
    return new Date(parseInt(nS)).toLocaleString().replace(/年|月/g, "-").replace(/日/g, " ");
}


function unique(arr){
// 遍历arr，把元素分别放入tmp数组(不存在才放)
    var tmp = new Array();
    for(var i in arr){
//该元素在tmp内部不存在才允许追加
        if(tmp.indexOf(arr[i])==-1){
            tmp.push(arr[i]);
        }
    }
    return tmp;
}
