/*
    Core.js：Front-End Interface logic

*/
function updateNodes() {
    notifyfeed = document.getElementById("notifyfeed")
    cover = document.getElementById("cover")
    cover.style.width = screen.height * 0.1 > screen.width * 0.1 ? screen.height * 0.1 : screen.width * 0.1 + "px"
    title = document.getElementById("title")
    album = document.getElementById("album")
    infocontext1 = document.getElementById("info1")
    infocontext2 = document.getElementById("info2")
    cover = document.getElementById("cover")
    player = document.getElementById("player")
    player.ontimeupdate = player_update
    player.onended = player_ended
    download = document.getElementById("download")
    download_lrc_placeholder = document.getElementById("download-lrc-placeholder")
    download_lrc = document.getElementById("download-lrc")
    download_lrc.onclick = download_lrc_onclick
    playqueue_view = document.getElementById("playqueue")
    shareinput = document.getElementById("shareinput")
    lyricsbox = document.getElementById('lyrics')
    action = document.getElementById("action")
    action.onclick = action_onclick
    prev_song = document.getElementById('prev-song')
    prev_song.onclick = playqueue_play_prev
    next_song = document.getElementById('next-song')
    next_song.onclick = playqueue_play_next
    window.onload = ()=>{
        performRequest(`Connected from ${returnCitySN.cip}`,['contribution'])
    }
    peakmeter = document.getElementById('peak-meter')
    audioCtx = new window.AudioContext()
    audioSrc = audioCtx.createMediaElementSource(player)
    audioSrc.connect(audioCtx.destination)
    meterNode = webAudioPeakMeter.createMeterNode(audioSrc, audioCtx);
    webAudioPeakMeter.createMeter(peakmeter, meterNode, {});
    player.addEventListener('play', function() {
        audioCtx.resume();
    });
    player.crossOrigin = "anonymous";
	qualitySelector = document.getElementById('quality-selector')
}
updateNodes()

function notify(message, level = "success") {
    notice = document.createElement('div')
    notice.className = "alert alert-" + level
    notice.innerHTML = '<a href="#" class="close" data-dismiss="alert">&times;</a>' + message
    notifyfeed.before(notice)
    scrollTo(0,0)
}

function getAPI(api) {
    apis = {
        "song": "api/song"
    }
    // removes anomalous chars,then concat the api
    return `${location.origin}${location.pathname}${apis[api]}`
}

function performRequest(id = 0, requirements = [],override = '',extra={}) {
    msg = JSON.stringify({ "id": id, "requirements": requirements,"extras":extra })
    var r = new XMLHttpRequest();
    api = getAPI('song')
    r.open("POST", api, true);
    r.onreadystatechange = () => {
        if (r.readyState == XMLHttpRequest.DONE) {
            try {
                info = JSON.parse(r.responseText)
                for (requirement of info.requirements) {                    
                    eval('callback_' + requirement + '(info=info,r,override=override)');
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
function parseLryics(lrc, tlrc = '', split = ' / ') {
    // lrc:original lyrics
    // tlrc:translation
    // split:splting char between lrc & tlrc
    if (!lrc) return
    // Clear old lyrics
    lyrics = {}
    function addMatches(lrc_string) {
        while ((match = lrc_regex.exec(lrc_string)) !== null) {
            if (match.index === lrc_regex.lastIndex) lrc_regex.lastIndex++
            // This is necessary to avoid infinite loops with zero-width matches
            timestamp = match[1]
            if (timestamp.indexOf('.') == -1) timestamp += '.000'
            // Pad with 0ms if no milliseconds is defined
            // match[1] contains the first capture group
            timestamp = convertFromTimestamp(timestamp)
            if (!lyrics[timestamp.toString()]) lyrics[timestamp.toString()] = ''
            lyrics[timestamp.toString()] += !!lyrics[timestamp.toString()] ? split + match[2] : match[2]
            // Where match[2] contains the second capture group
        }
    }
    addMatches(lrc)
    addMatches(tlrc)
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
    download_lrc_placeholder.setAttribute('download', musicinfo.title + '.lrc')
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
    cover.style.transform = 'rotate(' + deg + 'deg)'
}

function player_update() {
    // player update event,used to update lyrics
    // note that it's usually updated every ~250ms
    if (!lyrics) return
    lyricsbox.style.webkitAnimationPlayState  = player.paused ? 'paused' : 'running'    
    tick = player.currentTime;ticks = Object.keys(lyrics)
    lyrics_timestamp = findClosestMatch(ticks, tick)
    matched = lyrics[lyrics_timestamp]

    if (!matched) {
        matched = ''
    } else {
        next_tick = ticks.indexOf(lyrics_timestamp.toString()) + 1
        next_stamp = ticks[next_tick]
        lyrics_duration = (next_stamp - lyrics_timestamp).toFixed(3) 
        if (lyrics_duration != lyricsbox.duration){            
            lyricsbox.duration = lyrics_duration
            ani = lyricsbox.animate(
                [
                  { transform: 'translateY(0)','opacity':0.2},
                  { transform: 'translateY(-20%)','opacity':1 }   
                ], {
                  easing: 'linear',
                  duration: lyricsbox.duration  * 1000
                });
            ani.play()            
        }
       
    }
    // finds closest match of keys
    lyricsbox.innerHTML = '<a>' + matched + '</a>'
    // chages innerHTML
    rotate(tick * 5)
    // rotates the cover
}

function player_ended() {
    // playback ended,try next song if possible
    player.src = ''
    playqueue_play_next()
}

function _callback(target) {
    // callback funtion wrapper
    return function (info, r, override='') {
        if (r.status != 200) { notify(info.message, 'danger'); return }
        // server-side error message,notabliy dangerous and should be alerted to the user
        target(info, r, override)
        // execute function to be wrapped if message is valid
    }
}

audioinfo = {}
function callback_audio(info, r, override = '') {
    // callback to process requriements['audio']
    audioinfo = info.audio
    console.log({ 'Audio callback': audioinfo })
    function display_audioinfo(audioinfo) {
        if (audioinfo.message != 'success'){
            // error on netease's API side.
            notify(`歌曲(id:${audioinfo.data[0].id})音频解析失败（${audioinfo.message}）`,'warning')
        } else {
            download.href = audioinfo['data'][0]['url']
            player.src = download.href
            player.play()
        }
    }
    target = (!!override) ? override : display_audioinfo
    target(audioinfo)
}
callback_audio = _callback(callback_audio)

musicinfo = {}
function callback_info(info, r, override = '') {
    // callback to process requirements['info']
    musicinfo = info.info
    console.log({ 'Info callback': musicinfo })
    function display_musicinfo(musicinfo) {
        if (info.cover != []) cover.src = musicinfo.cover
        title.innerHTML = `<a href="https://music.163.com/#/song?id=${musicinfo.song_id}">${musicinfo.title}</a>`
        album.innerHTML = `<a href="https://music.163.com/#/album?id=${musicinfo.album_id}" style="color:gray">${musicinfo.album}</a>`
        // compose info box 1
        infocontext1.innerHTML =  `音乐家：<a href="https://music.163.com/#/artist?id=${musicinfo.artist_id}">${musicinfo.author}</a></br>`
        if(!!audioinfo['data']){
            // these will only be added if audioinfo is available
            infocontext1.innerHTML += `<a>格式：${audioinfo['data'][0]['type']} </a></br>`
            infocontext1.innerHTML += `<a>文件大小：${getFileSize(audioinfo['data'][0]['size'])} </a>`
            download.setAttribute('download', `${musicinfo.title}.${audioinfo['data'][0]['type']}`)
        }

    }
    target = (!!override) ? override : display_musicinfo
    target(musicinfo)
}
callback_info = _callback(callback_info)

lyricsinfo = {}
function callback_lyrics(info, r, override = '') {
    // callback to process requirements['lyrics']	
    lyricsinfo = info.lyrics
    console.log({ 'Lyrics callback': lyricsinfo })
    function display_lyrics(lyricsinfo) {
        if (!!lyricsinfo.nolyric || !!lyricsinfo.uncollected)
            lyrics = { '0': '<i>无歌词</i>' }
        else
            parseLryics(lyricsinfo.lrc.lyric, lyricsinfo.tlyric.lyric)
    }
    target = (!!override) ? override : display_lyrics
    target(lyricsinfo)
}
callback_lyrics = _callback(callback_lyrics)

contributioninfo = {}
function callback_contribution(info, r, override = '') {
    // callback to process requirements['contribution']
    contributioninfo = info.contribution
    console.log({ 'Contribution callback': contributioninfo })
    function display_contribution(contributioninfo) {
        // compose infobox 2
        infocontext2.innerHTML = `<a style="color:#888;margin=top:30px">服务贡献者:<strong> ${contributioninfo.contributer} </strong>`
        infocontext2.innerHTML += `<i style="color:#AAA;"> ${contributioninfo.contributer_message} </i></a></br>`
        infocontext2.innerHTML += `<i style="color:#AAA;font-size:small;"> 该服务已被使用 <strong> ${contributioninfo.count} </strong> 次</i>`
    }
    target = (!!override) ? override : display_contribution
    target(contributioninfo)
}

playlistinfo = {}
function callback_playlist(info, r, override = '') {
    // callback to process playlists
    playlistinfo = info.playlist
    console.log({ 'Playlistinfo callback': playlistinfo })
    function load_playlist() {
        // once playlist is loaded,appends them to the end of the list
        for (item of playlistinfo.playlist.tracks) {
            playqueue.push({
                'song_id': item['id'],
                'title': item['name'],
                'cover': item['al']['picUrl'],
                'author': item['ar'][0]['name'],
                'album': item['al']['name'],
                'album_id': item['al']['id'],
                'artist_id': item['ar'][0]['id']
            })
        }
        process_playqueue()
    }
    target = (!!override) ? override : load_playlist
    target(playlistinfo)
}

albuminfo = {}
function callback_album(info, r, override = '') {
    // callback to process albums
    albuminfo = info.album
    console.log({ 'Albuminfo callback': albuminfo })
    function load_album() {
        // once album is loaded,appends them to the end of the list
        for (item of albuminfo.songlist) {
            playqueue.push({
                'song_id': item['id'],
                'title': item['name'],
                'cover': item['album']['picUrl'],
                'author': item['artists'][0]['name'],
                'album': item['album']['name'],
                'album_id': item['album']['id'],
                'artist_id': item['artists'][0]['id']
            })
        }
        process_playqueue()
    }
    target = (!!override) ? override : load_album
    target(albuminfo)
}


playqueue = []
// the queue which is to be played and displayed
function process_playids(playids) {
    // process id in playids,one at a time
    for (id of playids) {
        musicinfo_override = function (musicinfo) {
            // once loaded,push to the playqueue
            playqueue.push(musicinfo)                 
            process_playqueue()
        }
        performRequest(id,['info'],musicinfo_override)
    }    
}

function* generateID() {i = 0; while (true) { i += 1; yield ('element' + i) }}
IDGenerator = generateID();

init_clear=false
function display_song_in_list(song) {
    if (!init_clear) { playqueue_view.innerHTML = '</br>'; init_clear = true }
    // clear if not cleared since page is loaded
    var mediabox = document.createElement('li')
    with (mediabox) {
        className = 'media'
        style = 'padding:2px'
        id = IDGenerator.next()['value']
    }
    /* CREATE MEDIABOX */
    var covernode = document.createElement('img')
    with (covernode) {
        className = 'd-flex mr-3 rounded'
        style = 'width:80px'
        src = song.cover
    }
    /* CREATE COVER */
    var mediabody = document.createElement('div')
    mediabody.className = 'media-body'
    /* CREATE MEDIABODY */
    var mediatitle = document.createElement('h5')
    with (mediatitle) {
        className = 'mt-0'
        innerHTML = song.title
        style = 'cursor:pointer;color:#007bff'
        onclick = playqueue_item_onclick
    }
    /* CREATE TITLE */
    var meidainfo = document.createElement('p')
    meidainfo.innerHTML = song.album + '-' + song.author
    var closebutton = document.createElement('a')
    with (closebutton) {
        className = 'close'
        onclick = playqueue_item_remove_onclick
        style = 'cursor:pointer'
        innerHTML = '&times;'
    }
    /* CREATE INFO */
    mediabody.appendChild(closebutton); mediabody.appendChild(mediatitle); mediabody.appendChild(meidainfo);
    mediabox.appendChild(covernode); mediabox.appendChild(mediabody)
    playqueue_view.appendChild(mediabox)
    return mediabox
}

function process_playqueue() {
    // process every item inside playqueue,and add nodes
    if (!playqueue) return
    for (song of playqueue) {
        if (!song.node) {
            song.node = display_song_in_list(song)
            // add node if not already
        }
        song.node.style.color = 'black'
        // revert color chages
        if (playqueue.indexOf(song) == playqueue_playhead) song.node.style.color = '#80abd9'
        // apply color to the current playing one 
        song.id = song.node.id
    }
}
function playqueue_locate_by_id(id, keep = true) { result = playqueue.filter(function (x) { return x.id == id ? keep : !keep }); return !keep ? result : result[0] }
function playqueue_remove_by_id(id) {
    item = playqueue_locate_by_id(id, true)
    item.node.remove()
    playqueue = playqueue_locate_by_id(id, false)
    // removes the item,and it's node
}
function playqueue_pop() {
    // 'pops' last item,then delete it
    if (!playqueue) return
    song = playqueue.pop()
    song.node.remove()
    return song
}
playqueue_playhead = -1;playback_quality = 'lossless'
function playqueue_playhead_onchage() {
    // plays song on list indexed by playhead
    if (playqueue.length <= playqueue_playhead || playqueue_playhead < 0) playqueue_playhead = 0
    if (!playqueue) return
    console.log(`Playhead seeking at index of ${playqueue_playhead}`)
    song = playqueue[playqueue_playhead]
    performRequest(song.song_id,['contribution', 'audio', 'info', 'lyrics'],'',{'audio':{'quality':playback_quality}})
    process_playqueue()
}
function playqueue_play_prev() {
    // previous song
    playqueue_playhead -= 1
    playqueue_playhead_onchage()
}
function playqueue_play_next() {
    // next song
    playqueue_playhead += 1
    playqueue_playhead_onchage()
}
function playqueue_item_onclick(caller) {
    // on item remove button click:removes the item
    block = caller.target.parentElement.parentElement
    // locate the parent player block,then delete it
    song = playqueue_locate_by_id(block.id)
    playqueue_playhead = playqueue.indexOf(song) - 1
    // goes one song before it
    playqueue_play_next()
    // plays the song
}
function playqueue_item_remove_onclick(caller) {
    // on item remove button click:removes the item
    block = caller.target.parentElement.parentElement
    // locate the parent player block,then delete it
    playqueue_remove_by_id(block.id)
    // removes item
}
const id_regex = /\d{5,}/gm
// match any continous 5+ digit numbers
function action_onclick() {
    // action button click event
    // once clicked,the button will become disabled until the XHR is finished
    sharelink = shareinput.value.toLowerCase()
    if (!sharelink) {notify("请输入<strong>歌曲、歌单或专辑</strong>链接", "danger");return}
    ids = []
    while ((m = id_regex.exec(sharelink)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === id_regex.lastIndex)id_regex.lastIndex++
        m.forEach((match, groupIndex) => {ids.push(match)});        
    }
    // extract ID using regex
    if (sharelink.indexOf('playlist') != -1) {
        // inputed playlist URL
        if(ids.length>1){notify('<strong>歌单</strong>ID只能输入一个!','warning');return}
        performRequest(ids[0],['playlist'])
        shareinput.value = `playlist:${ids[0]}`

    } else if (sharelink.indexOf('album') != -1) {
            // inputed album URL
            if(ids.length>1){notify('<strong>专辑</strong>ID只能输入一个!','warning');return}
            performRequest(ids[0],['album'])
            shareinput.value = `album:${ids[0]}`    
    } else {
        // anything else (containting any 5+ digit numbers)
        // will be treated as song IDs
        id_string = '';ids.filter((id) => {id_string += id + ' '})
        shareinput.value = `song:${id_string}`
        process_playids(ids)
    }
    action.disabled = true
    setTimeout(()=>{action.disabled = false;if (!player.duration) playqueue_play_next()},1000)
    // re-activate after 1s
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
