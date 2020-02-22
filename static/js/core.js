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
	playqueue_view = document.getElementById("playqueue")
    shareinput = document.getElementById("shareinput")
    lyricsbox = document.getElementById('lyrics')
    action = document.getElementById("action")
    action.onclick = action_onclick
	window.onload = function(){
		performRequest('',requirements=['contribution'])
	}
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

function performRequest(id=0,requirements=['contribution','audio','info','lyrics'],override='') {
    msg = JSON.stringify({ "id": id,"requirements":requirements })
    var r = new XMLHttpRequest();
    api = getAPI('song')
    r.open("POST", api, true);
    r.onreadystatechange = function () {
        if (r.readyState == XMLHttpRequest.DONE) {
            try {
                info = JSON.parse(r.responseText)
				console.table(info)
                for(requirement of requirements){
					eval('callback_' + requirement + '(info,r,override)');
				}
				// reflect the callback using eval
            } catch (error) {
                notify(error, 'danger')
            }

        }
    }
    r.send(msg);
}

function convertFromTimestamp(timestamp) {
    // this will covert LRC timestamp to seconds
    m = (t = timestamp.split(':'))[0] * 1; s = (u = t[1]).split('.')[0] * 1; ms = u.split('.')[1] * 1
    return (m * 60) + s + (ms / 1000)
}

function convertToTimestamp(timecode) {
    // this will convert seconds back to LRC timestamp
    function pad(str, p, length, before = false) { if (str.length < length) { str = before ? p + str : str + p; return pad(str, p, length, before) } else { return str } }
    m = Math.floor(timecode / 60); s = Math.floor(timecode - m * 60); ms = Math.floor((timecode - m * 60 - s) * (10 ** 3))
    return pad(m.toString(), '0', 2) + ":" + pad(s.toString(), '0', 2) + "." + pad(ms.toString(), '0', 3, true)
}

lyrics = {}
const lrc_regex = /^(?:\[)(.*)(?:\])(.*)/gm;
function loadLRC(lrc, tlrc = '', split = ' ') {
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

function download_lrc_onclick() {
    // happens once button is clicked
    // this will covert the dictionary to standard LRC format
    lrc = ''
    for (key in lyrics) {
        timestamp = convertToTimestamp(key)
        line = '[' + timestamp + ']' + lyrics[key]
        lrc += line + '\n'
    }
    blob = new Blob([lrc], { type: "text/plain;charset=utf-8" })
    url = window.URL.createObjectURL(blob)
    // uses the invisble placeholder to download
    download_lrc_placeholder.href = url
    download_lrc_placeholder.setAttribute('download', musicinfo['title'] + '.lrc')
    download_lrc_placeholder.click()
}

function findClosestMatch(arr, i) {
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
    matched = lyrics[findClosestMatch(ticks, tick)]
    if (!matched) matched = ''
    // finds closest match of keys
    lyricsbox.innerHTML = '<a>' + matched + '</a>'
    // chages innerHTML
    rotate(tick * 5)
    // rotates the cover
}

function _callback(target) {
	// callback funtion wrapper
	// note that in JS,you can't use '@decorators' on functions
	// the function-elevation rendered it useless,so keep in mind
	return function(info,r,override=''){
      if (r.status != 200) { notify(info['message'], 'danger'); return }
	  // error message
	target(info,r,override)
	  // execute function to be wrapped
	}
}

audioinfo = {}
function callback_audio(info,r,override = ''){
	// callback to process requriements['audio']
	audioinfo = info['audio']
	console.info({'Audio callback:':audioinfo})
	function display_audioinfo(audioinfo){
        infocontext1.innerHTML += '<a>格式：' + audioinfo['data'][0]['type'] + '</a></br>'
        infocontext1.innerHTML += '<a>文件大小：' + getFileSize(audioinfo['data'][0]['size']) + '</a>'
        download.href = audioinfo['data'][0]['url']
        player.src = download.href
        player.play()
	}
	target = (!!override) ? override : display_audioinfo
	target(audioinfo)
}
callback_audio = _callback(callback_audio)

musicinfo = {}
function callback_info(info,r,override = ''){
	// callback to process requirements['info']
	musicinfo = info['info']
	console.info({'Info callback:':musicinfo})
	function display_musicinfo(musicinfo){
        if (info['cover'] != []) cover.src = musicinfo['cover']
        title.innerHTML = musicinfo['title']
        album.innerHTML = musicinfo['album']
        // compose info box 1
        infocontext1.innerHTML = '<a>音乐家：' + musicinfo['author'] + '</a></br>'
        //compose info box 2	
        infocontext2.innerHTML += '<a style="font-size:small;opacity:0.5" href="https://music.163.com/#/album?id=' + musicinfo['album_id'] + '">网易云专辑链接' + '</a></br>'
        infocontext2.innerHTML += '<a style="font-size:small;opacity:0.5" href="https://music.163.com/#/artist?id=' + musicinfo['artist_id'] + '">网易云歌手链接' + '</a></br>'
        download.setAttribute('download', musicinfo['title'] + '.' + audioinfo['data'][0]['type'])
	}
	target = (!!override) ? override : display_musicinfo
	target(musicinfo)
}
callback_info = _callback(callback_info)

lyricsinfo = {}
function callback_lyrics(info,r,override = ''){
    // callback to process requirements['lyrics']	
	lyricsinfo = info['lyrics']
	console.info({'Lyrics callback:':lyricsinfo})
	function display_lyrics(lyricsinfo){
        if (!!lyricsinfo['nolyric'] || !!lyricsinfo['uncollected'])
            lyrics = { '0': '<i>无歌词</i>' }        
        else
            loadLRC(lyricsinfo['lrc']['lyric'], lyricsinfo['tlyric']['lyric'])
	}
	target = (!!override) ? override : display_lyrics
	target(lyricsinfo)
}
callback_lyrics = _callback(callback_lyrics)

contributioninfo = {}
function callback_contribution(info,r,override = ''){
	// callback to process requirements['contribution']
    contributioninfo = info['contribution']
    console.info({'Contribution callback:':contributioninfo})
	function display_contribution(contributioninfo){
        infocontext2.innerHTML = '<a style="color:#888;margin=top:30px">服务贡献者:<strong>' + contributioninfo['contributer'] + '</strong>'
        infocontext2.innerHTML += '<i style="color:#AAA;"> "' + contributioninfo['contributer_message'] + '"</i></a></br>'
        infocontext2.innerHTML += '<i style="color:#AAA;font-size:small;"> 在此之前，服务已被使用 <strong>' + contributioninfo['counts'] + '</strong> 次</i>'
	}
	target = (!!override) ? override : display_contribution
	target(contributioninfo)
}

playlist = []
// the list of IDs to be loaded by process_playlist to playqueue
playqueue = []
// the queue which is to be played and displayed
function process_playlist(){
	id = playlist.pop()
	musicinfo_override = function (musicinfo){
		// once loaded,push to the playqueue
		playqueue.push(musicinfo)
		process_playqueue()
		action.disabled = false
	}
	performRequest(id,requirements=['info'],override=musicinfo_override)
	// only load info onto playqueue
}

function *generateID(){
	i=0;while(true){i += 1;yield ('element' + i)}
}
IDGenerator = generateID();init_clear = false
function display_song_in_list(song){
	if(!init_clear){playqueue_view.innerHTML='</br>';init_clear=true}
    var mediabox = document.createElement('li')
    with(mediabox){
        className = 'media'
        id = IDGenerator.next()['value']
    }
    /* CREATE MEDIABOX */
    var covernode = document.createElement('img')
    with(covernode){
        className = 'd-flex mr-3'
		style = 'width:80px'
        src = song['cover']
    }
    /* CREATE COVER */		
    var mediabody = document.createElement('div')
    mediabody.className = 'media-body'
    /* CREATE MEDIABODY */
    var mediatitle = document.createElement('h5')
    with(mediatitle){
        className = 'mt-0'
        innerHTML = song['title']
		style = 'cursor:pointer;color:#007bff'
		onclick = playqueue_item_onclick
    }
    /* CREATE TITLE */		
    var meidainfo = document.createElement('p')
    meidainfo.innerHTML = song['album'] + '-' + song['author']
    /* CREATE INFO */
    mediabody.appendChild(mediatitle);mediabody.appendChild(meidainfo)
    mediabox.appendChild(covernode);mediabox.append(mediabody)
    playqueue_view.appendChild(mediabox)
    return mediabox
}

function process_playqueue(){
	// process every item
	for (i=0;i<playqueue.length;i++){
		// add into view
		song = playqueue[i]
		if(!song['node']){
            song['node'] = display_song_in_list(song)
			// add node if not already
			song['id'] = song['node'].id
		}
	}
}
function playqueue_locate_by_id(id,keep=true){return playqueue.filter(function(x){return x['id']==id ? keep : !keep})[0]}
function playqueue_remove_by_id(id){
	item = playqueue_locate_by_id(id,true)
	item.node.remove()
	playqueue = playqueue_locate_by_id(id,false)
	// removes the item,and it's node
}
function playqueue_pop(){
	// 'pops' last item,then delete it
	song = playqueue.pop()
	playqueue_remove_by_id(song['id'])
	return song
}
function playqueue_play_next(){
	// plays next song on list
	song = playqueue_pop()
	performRequest(song['id'],requirements=['audio','info','lyrics'])
}
function playqueue_item_onclick(caller){
	// on item click:removes the item,and plays it
	block = caller.target.parentElement.parentElement
	// locate the parent player block,then delete it
	song = playqueue_locate_by_id(block.id)
	console.log({'Playing':song})
	performRequest(song['id'],requirements=['audio','info','lyrics'])
	// perform play request
	playqueue_remove_by_id(block.id)
	// removes item
}
const id_regex = /\d{5,}/gm
function action_onclick() {
    // action button click event
    // once clicked,the button will become disabled until the XHR is finished
    sharelink = shareinput.value
    if (!sharelink || sharelink.indexOf('playlist') != -1) notify("请输入<strong>歌曲</strong>链接", "danger")
    id = id_regex.exec(sharelink)[0]
    // extract ID using regex
	action.disabled = true
    playlist.push(id)
	process_playlist()
	// add to the playlist
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
