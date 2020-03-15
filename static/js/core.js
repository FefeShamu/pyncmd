/*
    Core.js：Front-End Interface logic
*/
function updateNodes() {
    notifyfeed = document.getElementById("notifyfeed")
    cover = document.getElementById("cover")
    cover.style.width = (window.innerWidth > window.innerHeight ? window.innerWidth : window.innerHeight) * 0.1 + 'px'
    title = document.getElementById("title")
    album = document.getElementById("album")
    infocontext1 = document.getElementById("info1")
    infocontext2 = document.getElementById("info2")
    cover = document.getElementById("cover")
    player = document.getElementById("player")
    player.ontimeupdate = player_update
    player.onended = () => {
        // queue the next song
        next_song.click()
    }

    download_placeholder = document.getElementById("download-placeholder")

    download_audio = document.getElementById("download-audio")
    download_audio.onclick = () => {
        // happens once Download Audio button is clicked
        // this will start to download audio file of currently playing song
        try {
            setDownload(player.src, `${musicinfo.name}.${audioinfo['data'][0]['type']}`)
        } catch (e) {
            notify(`${e}:缺失音频信息`, 'danger')
        }
    }

    download_lrc = document.getElementById("download-lrc")
    download_lrc.onclick = () => {
        // happens once Download Lyrics button is clicked
        // this will covert the dictionary to standard LRC format
        try {
            var lrc = ''
            for (key in lyrics) {
                timestamp = convertToTimestamp(key)
                line = '[' + timestamp + ']' + lyrics[key].join('\t')
                lrc += line + '\n'
            }
            var blob = new Blob([lrc], { type: "text/plain;charset=utf-8" })
            var url = window.URL.createObjectURL(blob)
            // uses the invisble placeholder to download
            setDownload(url, musicinfo.name + '.lrc')
        } catch (e) {
            notify(`${e}:缺失歌词信息`, 'danger')
        }
    }

    download_mv = document.getElementById("download-mv")
    download_mv.onclick = () => {
        try {
            setDownload(mvinfo.data.url, `MV - ${musicinfo.name}.mp4`)
        } catch (e) {
            notify(`${e}:缺失 MV 信息`, 'danger')
        }
    }

    playqueue_view = document.getElementById("playqueue")
    shareinput = document.getElementById("shareinput")
    lyricsbox = document.getElementById('lyricsbox')

    action = document.getElementById("action")
    action.onclick = action_onclick

    prev_song = document.getElementById('prev-song')
    prev_song.onclick = () => { playqueue_playhead -= 1; playqueue_playhead_onchage() }

    next_song = document.getElementById('next-song')
    next_song.onclick = () => { playqueue_playhead += 1; playqueue_playhead_onchage() }


    qualitySelector = document.getElementById('quality-selector')

    window.onload = () => {
        performRequest(`Connected from ${returnCitySN.cip}`, ['contribution'])
    }
    // initalizing visualizer
    peakmeter = document.getElementById('peak-meter')
    audioCtx = new window.AudioContext()
    // connecting the analyzer
    var source = audioCtx.createMediaElementSource(player)
    source.connect(audioCtx.destination)
    var analyzer = audioCtx.createAnalyser()
    source.connect(analyzer)
    // in case audioCtx don't get actived if user dind't interact
    // with the page
    player.addEventListener('play', function () {
        audioCtx.resume();
    });

    ffta_init(analyzer, peakmeter, peakmeter.offsetWidth, peakmeter.offsetHeight)
    player.crossOrigin = "anonymous";


}
updateNodes()

function setDownload(href, saveAs) {
    download_placeholder.href = href
    download_placeholder.setAttribute('download', saveAs)
    download_placeholder.click()
}

function notify(message, level = "success") {
    var notice = document.createElement('div')
    notice.className = "alert alert-" + level
    notice.innerHTML = '<a href="#" class="close" data-dismiss="alert">&times;</a>' + message
    notifyfeed.before(notice)
    scrollTo(0, 0)
}

function getAPI(api) {
    var apis = {
        "song": "api/song"
    }
    // removes anomalous chars,then concat the api
    return `${location.origin}${location.pathname}${apis[api]}`
}

function performRequest(id = 0, requirements = [], override = '', extra = {}) {
    var msg = JSON.stringify({ "id": id, "requirements": requirements, "extras": extra })
    var r = new XMLHttpRequest();
    var api = getAPI('song')
    r.open("POST", api, true);
    r.onreadystatechange = () => {
        if (r.readyState == XMLHttpRequest.DONE) {
            try {
                var info = JSON.parse(r.responseText)
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

function concatDictsByKey(dicts, key, split) {
    str = ''
    for (dict of dicts) str += dict[key] + split
    return str.substr(0, str.length - split.length)
}

function convertFromTimestamp(timestamp) {
    // this will covert LRC timestamp to seconds
    try {
        var m = (t = timestamp.split(':'))[0] * 1; s = (u = t[1]).split('.')[0] * 1; ms = u.split('.')[1] * 1
        return (m * 60) + s + (ms / 1000)
    } catch (error) {
        return 0
    }
}

function convertToTimestamp(timecode) {
    // this will convert seconds back to LRC timestamp
    function pad(str, p, length, before = false) { if (str.length < length) { str = before ? p + str : str + p; return pad(str, p, length, before) } else { return str } }
    var m = Math.floor(timecode / 60); s = Math.floor(timecode - m * 60); ms = Math.floor((timecode - m * 60 - s) * (10 ** 3))
    return pad(m.toString(), '0', 2) + ":" + pad(s.toString(), '0', 2) + "." + pad(ms.toString(), '0', 3, true)
}

function parseLryics(lrc, tlrc = '') {
    // lrc:original lyrics
    // tlrc:translation
    const lrc_regex = /^(?:\[)(.*)(?:\])(.*)/gm;
    if (!lrc) return
    // Clear old lyrics
    lyrics = {}
    // not a local variable
    function addMatches(lrc_string) {
        while ((match = lrc_regex.exec(lrc_string)) !== null) {
            if (match.index === lrc_regex.lastIndex) lrc_regex.lastIndex++
            // This is necessary to avoid infinite loops with zero-width matches
            timestamp = match[1]
            if (timestamp.indexOf('.') == -1) timestamp += '.000'
            // Pad with 0ms if no milliseconds is defined
            // match[1] contains the first capture group
            timestamp = convertFromTimestamp(timestamp)
            if (!lyrics[timestamp.toString()]) {
                lyrics[timestamp.toString()] = [match[2]]
            } else {
                lyrics[timestamp.toString()].push(match[2])
            }
            // Where match[2] contains the second capture group
        }
    }
    addMatches(lrc)
    addMatches(tlrc)
    console.table(lyrics)
    return lyrics
}

function download_lrc_onclick() {

}

function findClosestMatch(arr, i) {
    // finds closeset match to 'i' in array 'arr'
    // note that the match can't be larger than 'i'
    var i = i * 1; var dist = -Math.max(); var t = 0
    for (a of arr) { a = a * 1; if (!((d = Math.abs(a - i)) > dist) && i > a) { dist = d; t = a } }
    return t
}

function rotate(deg = 0) {
    cover.style.transform = 'rotate(' + deg + 'deg)'
}

function player_setPlay(t = 1000) {
    setTimeout(() => {
        try {
            player.play()
        } catch (e) {
            setPlay()
        }
    }, t)
}

function player_update() {
    // player update event,used to update lyrics
    // note that it's usually updated every ~250ms
    if (!lyrics) { lyricsbox.innerHTML = '纯音乐 / 无歌词'; return }
    var tick = player.currentTime; var ticks = Object.keys(lyrics)
    var lyrics_timestamp = findClosestMatch(ticks, tick)
    var matched = lyrics[lyrics_timestamp]
    var pagetitle = `${musicinfo.name} - ${concatDictsByKey(musicinfo.ar, 'name', ' / ')}`
    if (document.title != pagetitle) document.title = pagetitle
    // update title if not already
    if (!matched) {
        lyricsbox.innerHTML = '纯音乐 / 无歌词'
    } else {
        // if match found,updates the lyrics
        // and plays animation for the time between this and the next lyrics
        lyrics_html = '<a class="lyrics">' + matched.join('\n') + '</a>'
        if (lyricsbox.innerHTML != lyrics_html) {
            // lyrics chaged
            lyricsbox.innerHTML = lyrics_html
            // updates lyrics
            var lyrics_duration = (ticks[ticks.indexOf(lyrics_timestamp.toString()) + 1] - lyrics_timestamp).toFixed(3)
            // caculates duration for the animation in seconds
            lyricsbox.animate(
                [
                    { transform: 'translateY(-20%)', 'opacity': 0.2, 'offset': 0 },
                    { transform: 'translateY(0%)', 'opacity': 1, 'offset': 0.6 },
                    { transform: 'translateY(0%)', 'opacity': 1, 'offset': 1 }
                ], {
                easing: 'ease-out',
                duration: lyrics_duration * 1000
            }).play()
        }

    }

    rotate(tick * 5)
    // rotates the cover

}


function _callback(target) {
    // callback funtion wrapper
    return function (info, r, override = '') {
        if (r.status != 200) { notify(info.message, 'danger'); return }
        // server-side error message,notabliy dangerous and should be alerted to the user
        if (!!override) { override(info) } else { target(info) }
        // execute function to be wrapped if message is valid

    }
}

function callback_audio(info) {
    // callback to process requriements['audio']
    audioinfo = info.audio
    console.log({ 'Audio callback': audioinfo })
    if (audioinfo.message != 'success') {
        // error on netease's API side.
        notify(`歌曲(id:${audioinfo.data[0].id})音频解析失败（${audioinfo.message}）`, 'warning')
    } else {
        player.src = audioinfo['data'][0]['url']
    }
}
callback_audio = _callback(callback_audio)

function callback_info(info) {
    // callback to process requirements['info']
    musicinfo = info.info.songs[0]
    console.log({ 'Info callback': musicinfo })
    if (!musicinfo) {
        notify(`解析歌曲 (ID:${info.required_id}) 失败`, 'warning')
        return
    }
    // extra error checks
    if (info.cover != []) cover.src = musicinfo.al.picUrl
    title.innerHTML = `<a href="https://music.163.com/#/song?id=${musicinfo.id}">${musicinfo.name}</a>`
    album.innerHTML = `<a href="https://music.163.com/#/album?id=${musicinfo.al.id}" style="color:gray">${musicinfo.al.name}</a>`
    // compose info box 1
    infocontext1.innerHTML = '音乐家：'
    function addArtist(ar, head = '<a> / </a>') { infocontext1.innerHTML += `${head}<a href="https://music.163.com/#/artist?id=${ar.id}" style="color:gray">${ar.name}</a>` }
    addArtist(musicinfo.ar[0], head = '')
    for (ar of musicinfo.ar.slice(1)) addArtist(ar)
    if (!!audioinfo.data) {
        // these will only be added if audioinfo is available
        infocontext1.innerHTML += `</br><i style="color:#AAA;font-size:small;">音频信息：${getFileSize(audioinfo['data'][0]['size'])} / ${audioinfo['data'][0]['type']} </i></br>`
    }
    if (!!musicinfo.mv) {
        // mv is presnet,perform such request
        performRequest(musicinfo.mv, ['mv'])
    }
}
callback_info = _callback(callback_info)

function callback_lyrics(info) {
    // callback to process requirements['lyrics']	
    lyricsinfo = info.lyrics
    console.log({ 'Lyrics callback': lyricsinfo })
    if (!!lyricsinfo.nolyric || !!lyricsinfo.uncollected)
        lyrics = { '0': ['<i>纯音乐 / 无歌词</i>'] }
    else
        parseLryics(lyricsinfo.lrc.lyric, lyricsinfo.tlyric.lyric)
}
callback_lyrics = _callback(callback_lyrics)

function callback_contribution(info) {
    // callback to process requirements['contribution']
    contributioninfo = info.contribution
    console.log({ 'Contribution callback': contributioninfo })
    // compose infobox 2
    infocontext2.innerHTML = `<a style="color:#888;margin=top:30px">服务贡献者:<strong> ${contributioninfo.contributer} </strong>`
    infocontext2.innerHTML += `<i style="color:#AAA;"> ${contributioninfo.contributer_message} </i></a></br>`
    infocontext2.innerHTML += `<i style="color:#AAA;font-size:small;"> 该服务已被使用 <strong> ${contributioninfo.count} </strong> 次</i>`
}
callback_contribution = _callback(callback_contribution)

function callback_playlist(info) {
    // callback to process playlists
    playlistinfo = info.playlist
    console.log({ 'Playlistinfo callback': playlistinfo })
    // once playlist is loaded,appends them to the end of the list
    for (item of playlistinfo.playlist.tracks) {
        playqueue.push({
            'id': item['id'],
            'name': item['name'],
            'al': item['al'],
            'ar': item['ar']
        })
    }
    process_playqueue()
}
callback_playlist = _callback(callback_playlist)

function callback_album(info) {
    // callback to process albums
    albuminfo = info.album
    console.log({ 'Albuminfo callback': albuminfo })
    // once album is loaded,appends them to the end of the list
    for (item of albuminfo.songlist) {
        playqueue.push({
            'id': item.id,
            'name': item.name,
            'al': item.album,
            'ar': item.artists
        })
    }
    process_playqueue()
}
callback_album = _callback(callback_album)

function callback_mv(info) {
    // callback to process albums
    mvinfo = info.mv
    console.log({ 'MVInfo callback': mvinfo })

}
callback_mv = _callback(callback_mv)



playqueue = []
// the queue which is to be played and displayed
function process_playids(playids) {
    // process id in playids,one at a time
    for (id of playids) {
        musicinfo_override = function (info) {
            // once loaded,push to the playqueue
            musicinfo = info.info.songs[0]
            if (!!musicinfo) {
                playqueue.push(musicinfo)
                console.log({ 'Info Override': musicinfo })
                process_playqueue()
            }
        }
        performRequest(id, ['info'], musicinfo_override)
    }
}

function* generateID() { var i = 0; while (true) { i += 1; yield ('element' + i) } }
IDGenerator = generateID();

init_clear = false
function append_node(song) {
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
        src = song.al.picUrl
    }
    /* CREATE COVER */
    var mediabody = document.createElement('div')
    mediabody.className = 'media-body'
    /* CREATE MEDIABODY */
    var mediatitle = document.createElement('h5')
    with (mediatitle) {
        className = 'mt-0'
        innerHTML = song.name
        style = 'cursor:pointer;color:#007bff'
        onclick = playqueue_item_onclick
    }
    /* CREATE TITLE */
    var meidainfo = document.createElement('p')
    meidainfo.innerHTML = song.al.name + ' - ' + concatDictsByKey(song.ar, 'name', ' / ')
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
            song.node = append_node(song)
            // add node if not already
        }
        song.node.style.color = 'black'
        // revert color chages
        if (playqueue.indexOf(song) == playqueue_playhead) song.node.style.color = '#80abd9'
        // apply color to the current playing one 
    }
}

function playqueue_locate_by_id(id, keep = true) {
    var result = playqueue.filter(function (x) { return x.node.id == id ? keep : !keep })
    return !keep ? result : result[0]
}

function playqueue_remove_by_id(id) {
    var item = playqueue_locate_by_id(id, true)
    item.node.remove()
    playqueue = playqueue_locate_by_id(id, false)
    // removes the item,and it's node
}

function playqueue_pop() {
    // 'pops' last item,then delete it
    if (!playqueue) return
    var song = playqueue.pop()
    song.node.remove()
    return song
}

playqueue_playhead = -1; playback_quality = 'lossless'
function playqueue_playhead_onchage() {
    // plays song on list indexed by playhead
    if (playqueue.length <= playqueue_playhead || playqueue_playhead < 0) playqueue_playhead = 0
    if (!playqueue) return
    console.log(`Playhead seeking at index of ${playqueue_playhead}`)
    var song = playqueue[playqueue_playhead]
    performRequest(song.id, ['contribution', 'audio', 'info', 'lyrics'], '', { 'audio': { 'quality': playback_quality } })
    process_playqueue()
    lyrics = {}
    // clear lyrics & set to play after 1s
    player_setPlay()
}

function playqueue_item_onclick(caller) {
    // on item remove button click:removes the item
    var block = caller.target.parentElement.parentElement
    // locate the parent player block,then delete it
    song = playqueue_locate_by_id(block.id)

    playqueue_playhead = playqueue.indexOf(song) - 1
    // goes one song before it
    next_song.click()
    // plays the song
}

function playqueue_item_remove_onclick(caller) {
    // on item remove button click:removes the item
    var block = caller.target.parentElement.parentElement
    // locate the parent player block,then delete it
    playqueue_remove_by_id(block.id)
    // removes item
}

function action_onclick() {
    // action button click event
    // once clicked,the button will become disabled until the XHR is finished
    var sharelink = shareinput.value.toLowerCase()
    if (!sharelink) { notify("请输入<strong>歌曲、歌单或专辑</strong>链接", "danger"); return }
    ids = []
    const id_regex = /\d{5,}/gm
    // match any continous 5+ digit numbers
    while ((m = id_regex.exec(sharelink)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === id_regex.lastIndex) id_regex.lastIndex++
        m.forEach((match, groupIndex) => { ids.push(match) });
    }
    // extract ID using regex
    if (sharelink.indexOf('list') != -1) {
        // inputed playlist URL
        if (ids.length > 1) { notify('<strong>歌单</strong>ID只能输入一个!', 'warning');  }
        performRequest(ids[0], ['playlist'])
        shareinput.value = `playlist:${ids[0]}`

    } else if (sharelink.indexOf('album') != -1) {
        // inputed album URL
        if (ids.length > 1) { notify('<strong>专辑</strong>ID只能输入一个!', 'warning'); }
        performRequest(ids[0], ['album'])
        shareinput.value = `album:${ids[0]}`
    } else {
        // anything else (containting any 5+ digit numbers)
        // will be treated as song IDs
        id_string = ''; ids.filter((id) => { id_string += id + ' ' })
        shareinput.value = `song:${id_string}`
        process_playids(ids)
    }
    action.disabled = true
    setTimeout(() => { action.disabled = false; if (!player.duration) next_song.click() }, 1000)
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
