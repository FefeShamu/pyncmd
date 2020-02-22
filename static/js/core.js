/*
    Core.js：Front-End Interface logic
*/
function updateNodes() {
    notifyfeed = document.getElementById("notifyfeed")
    cover = document.getElementById("cover")
    title = document.getElementById("title")
    album = document.getElementById("album")
    infocontext1 = document.getElementById("info1")
    infocontext2 = document.getElementById("info2")
    cover = document.getElementById("cover")
    player = document.getElementById("player")
    player.ontimeupdate = player_update
    download = document.getElementById("download")
	download_lrc_placeholder = document.getElementById("download_lrc_placeholder")
	download_lrc = document.getElementById("download_lrc")
	download_lrc.onclick = download_lrc_onclick
    shareinput = document.getElementById("shareinput")
    lyricsbox = document.getElementById('lyrics')
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

function convertFromTimestamp(timestamp){
	// this will covert LRC timestamp to seconds
	m = (t = timestamp.split(':'))[0] * 1; s = (u = t[1]).split('.')[0] * 1; ms = u.split('.')[1] * 1
	return (m * 60) + s + (ms / 1000)
}

function convertToTimestamp(timecode){
	// this will convert seconds back to LRC timestamp
	function pad(str,p,length,before=false){if(str.length<length){str = before ? p + str : str + p;return pad(str,p,length,before)}else{return str}}
	m = Math.floor(timecode / 60);s = Math.floor(timecode - m * 60);ms = Math.floor((timecode - m * 60 - s) * (10**3))
	return pad(m.toString(),'0',2) + ":" + pad(s.toString(),'0',2) + "." + pad(ms.toString(),'0',3,true)
}

lyrics = {}
const lrc_regex = /^(?:\[)(.*)(?:\])(.*)/gm;
function loadLRC(lrc, tlrc = '',split=' ') {
    // lrc:original lyrics
    // tlrc:translation
    if (!lrc) return
    // Clear old lyrics
    lyrics = {}
    function addMatches(lrc_string) {
        while ((match = lrc_regex.exec(lrc_string)) !== null) {
            if (match.index === lrc_regex.lastIndex) lrc_regex.lastIndex++
            // This is necessary to avoid infinite loops with zero-width matches
            timestamp = match[1]
            // match[1] contains the first capture group
			timestamp = convertFromTimestamp(timestamp)
            if (!lyrics[timestamp.toString()]) lyrics[timestamp.toString()] = ''
            lyrics[timestamp.toString()] += match[2] + split
            // Where match[2] contains the second capture group
        }
    }
    addMatches(lrc)
    addMatches(tlrc)
    console.info('Loaded lyrics:')
    console.table(lyrics)
}

function download_lrc_onclick(){
	// happens once button is clicked
	// this will covert the dictionary to standard LRC format
	lrc = ''
	for (key in lyrics){
		timestamp = convertToTimestamp(key)
		line = '[' + timestamp + ']' + lyrics[key]
		lrc += line + '\n'
	}
	blob = new Blob([lrc],{type:"text/plain;charset=utf-8"})
	url = window.URL.createObjectURL(blob)
	// uses the invisble placeholder to download
	download_lrc_placeholder.href = url
	download_lrc_placeholder.setAttribute('download','歌词.lrc')
	download_lrc_placeholder.click()
}

function FindClosestMatch(arr, i) {
    // finds closeset match to 'i' in array 'arr'
    // note that the match can't be larger than 'i'
    i = i * 1; dist = -Math.max(); t = 0
    for (a of arr) { a = a * 1; if (!((d = Math.abs(a - i)) > dist) && i > a) { dist = d; t = a } }
    return t
}

function rotate(deg = 0) {
    // rotate cover by degree
    cover.style.transform = 'rotate(' + deg + 'deg)'
}

function player_update() {
    // player update event,used to update lyrics
    // note that it's usually updated every ~250ms
    if (!lyrics) return
    tick = player.currentTime
    ticks = Object.keys(lyrics)
    matched = lyrics[FindClosestMatch(ticks, tick)]
    if (!matched) matched = ''
    // finds closest match of keys
    lyricsbox.innerHTML = '<a>' + matched + '</a>'
    // chages innerHTML
    rotate(tick * 5)
    // rotates the cover
}

function callback(info, r) {
    // called once XHR finishes
    // writes music info to the page,re-enable the action button
    action.disabled = false
    if (r.status != 200) { notify(info['message'], 'danger'); return }
    console.log(info)
    if (info['cover'] != []) cover.src = info['cover']
    title.innerHTML = info['title']
    album.innerHTML = info['album']
    // compose info box 1
    infocontext1.innerHTML = '<a>音乐家：' + info['author'] + '</a></br>'
    infocontext1.innerHTML += '<a>格式：' + info['data'][0]['type'] + '</a></br>'
    infocontext1.innerHTML += '<a>文件大小：' + getFileSize(info['data'][0]['size']) + '</a>'
    //compose info box 2
    infocontext2.innerHTML = '<a style="font-size:small;opacity:0.5" href="https://music.163.com/#/song?id=' + info['data'][0]['id'] + '">网易云歌曲链接' + '</a></br>'
    infocontext2.innerHTML += '<a style="font-size:small;opacity:0.5" href="https://music.163.com/#/album?id=' + info['album_id'] + '">网易云专辑链接' + '</a></br>'
    infocontext2.innerHTML += '<a style="font-size:small;opacity:0.5" href="https://music.163.com/#/artist?id=' + info['artist_id'] + '">网易云歌手链接' + '</a></br>'
    infocontext2.innerHTML += '<a style="color:#888;margin=top:30px">服务贡献者:<strong>' + info['contributer'] + '</strong>'
    infocontext2.innerHTML += '<i style="color:#AAA;"> "' + info['contributer_message'] + '"</i></a></br>'
    infocontext2.innerHTML += '<i style="color:#AAA;font-size:small;"> 在此之前，服务已被使用 <strong>' + info['counts'] + '</strong> 次</i>'
    download.href = info['data'][0]['url']
    // load lyrics if exsitsts																			
    if (!info['lyrics']['nolyric'])
        loadLRC(info['lyrics']['lrc']['lyric'], info['lyrics']['tlyric']['lyric'])
    else
        lyrics = { '0': '<i>无歌词</i>' }
    // starts playing once loaded
    player.src = download.href
    player.play()
}

const id_regex = /\d{5,}/gm
function action_onclick() {
    // action button click event
    // once clicked,the button will become disabled until the XHR is finished
    sharelink = shareinput.value
    if (!sharelink || sharelink.indexOf('playlist') != -1) notify("请输入<strong>歌曲</strong>链接", "danger")
    id = id_regex.exec(sharelink)[0]
    // extract ID using regex
    getSongInfo(id)
    action.disabled = true
}

function getFileSize(fileByte) {
    // snippet from:https://blog.csdn.net/silence_hgt/article/details/80943900
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
