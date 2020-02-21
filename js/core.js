/*
    Core.js：前端交互逻辑
*/
function updateNodes() {
    notifyfeed = document.getElementById("notifyfeed")
    cover = document.getElementById("cover")
    title = document.getElementById("title")
    album = document.getElementById("album")
    infocontext = document.getElementById("info")
    cover = document.getElementById("cover")
    player = document.getElementById("player")
    download = document.getElementById("download")
    shareinput = document.getElementById("shareinput")
    action = document.getElementById("action")
    action.onclick = action_onclick
}

updateNodes()

function notify(message, level = "success") {
    notice = document.createElement('div')
    notice.className = "alert alert-" + level
    notice.innerHTML = '<a href="#" class="close" data-dismiss="alert">&times;</a>' + message
    notifyfeed.before(notice)
}

function getAPI(api) {
    apis = {
        "song": "api/song"
    }
    return document.location.toString() + apis[api]
}

function getSongInfo(id) {
    // 获取音乐信息
    msg = JSON.stringify({ "id": id })
    var r = new XMLHttpRequest();
    api = getAPI('song')
    r.open("POST", api, true);
    r.onreadystatechange = function () {
        if (r.readyState == XMLHttpRequest.DONE) {
            try {
                console.info({ 'url': api, 'received': r.responseText })
                info = JSON.parse(r.responseText)
                callback(info, r)
            } catch (error) {
                notify(error, 'danger')
            }

        }
    }
    r.send(msg);
}
function callback(info, r) {
    action.disabled = false
    if (r.status != 200) { notify(info['message'], 'danger'); return }
    console.log(info)
    if (info['cover'] != []) cover.src = info['cover']
    title.innerHTML = info['title']
    album.innerHTML = info['album']
    infocontext.innerHTML = '<a>音乐家：' + info['author'] + '</a></br>'
    infocontext.innerHTML += '<a>格式：' + info['data'][0]['type'] + '</a></br>'
    infocontext.innerHTML += '<a>文件大小：' + getFileSize(info['data'][0]['size']) + '</a></br></br>'
    infocontext.innerHTML += '<a style="font-size:small;opacity:0.5" href="https://music.163.com/#/song?id=' + info['data'][0]['id'] + '">网易云歌曲链接' + '</a></br>'
    infocontext.innerHTML += '<a style="font-size:small;opacity:0.5" href="https://music.163.com/#/album?id=' + info['album_id'] + '">网易云专辑链接' + '</a></br>'
    infocontext.innerHTML += '<a style="font-size:small;opacity:0.5" href="https://music.163.com/#/artist?id=' + info['artist_id'] + '">网易云歌手链接' + '</a></br>'
    infocontext.innerHTML += '<a style="color:#888;margin=top:30px">服务贡献者:<strong>' + info['contributer'] + '</strong>'
    infocontext.innerHTML += '<i style="color:#AAA;"> "' + info['contributer_message'] + '"</i></a></br>'
    infocontext.innerHTML += '<i style="color:#AAA;font-size:small;"> 在此之前，服务已被使用 <strong>' + info['counts'] + '</strong> 次</i>'
    download.href = info['data'][0]['url']
    player.src = download.href
    player.play()
}

const id_regex = /\d{5,}/gm
function action_onclick() {
    sharelink = shareinput.value
    if (!sharelink || sharelink.indexOf('playlist') != -1) notify("请输入<strong>歌曲</strong>链接", "danger")
    // 开始获取信息	
    id = id_regex.exec(sharelink)[0]
    getSongInfo(id)
    action.disabled = true
}

function getFileSize(fileByte) {
    // https://blog.csdn.net/silence_hgt/article/details/80943900
    var fileSizeByte = fileByte;
    var fileSizeMsg = "";
    if (fileSizeByte < 1048576) fileSizeMsg = (fileSizeByte / 1024).toFixed(2) + "KB";
    else if (fileSizeByte == 1048576) fileSizeMsg = "1MB";
    else if (fileSizeByte > 1048576 && fileSizeByte < 1073741824) fileSizeMsg = (fileSizeByte / (1024 * 1024)).toFixed(2) + "MB";
    else if (fileSizeByte > 1048576 && fileSizeByte == 1073741824) fileSizeMsg = "1GB";
    else if (fileSizeByte > 1073741824 && fileSizeByte < 1099511627776) fileSizeMsg = (fileSizeByte / (1024 * 1024 * 1024)).toFixed(2) + "GB";
    else fileSizeMsg = "文件超过1TB";
    return fileSizeMsg;
}
