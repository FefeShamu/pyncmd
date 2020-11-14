/*
    Core.js：Front-End Interface logic
    pieced this crap together while I was still new to both python & js,didn't even know what Promise is...
    A lot of callbacks are involved,performance will be sucky for sure...

    XXX : Rewrite & cleanup
*/

/* Initalizing */
params = urlParams()

function initFFTWindow() {
    // initalizing visualizer
    if (!window.AudioContext) return
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

    ffta_init(analyzer, peakmeter, peakmeter.offsetWidth, peakmeter.offsetHeight, ffta_settings)
}

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
    download_mv = document.getElementById('download-mv')
    mv_player = document.getElementById('mv-player')
    mv_title = document.getElementById('mv-title')
    mv_dismiss = document.getElementById('mv-dismiss')
    player.onended = function () {
        // queue the next song
        next_song.click()
    }

    download_placeholder = document.getElementById("download-placeholder")

    download_audio = document.getElementById("download-audio")
    download_audio.onclick = function () {
        // happens once Download Audio button is clicked
        // this will start to download audio file of currently playing song
        try {
            setDownload(player.src, "".concat(musicinfo.name, ".").concat(audioinfo["data"][0]["type"]))
        } catch (e) {
            notify(e, "danger");

        }
    }

    download_lrc = document.getElementById("download-lrc")
    download_lrc.onclick = function () {
        // happens once Download Lyrics button is clicked
        // this will covert the dictionary to standard LRC format
        try {
            var lrc = ''
            for (index in Object.keys(lyrics)) {
                key = Object.keys(lyrics)[index]
                timestamp = convertToTimestamp(key)
                line = '[' + timestamp + ']' + lyrics[key].join('\t')
                lrc += line + '\n'
            }
            var blob = new Blob([lrc], { type: "text/plain;charset=utf-8" })
            setDownload(blob, musicinfo.name + '.lrc')
        } catch (e) {
            notify(e, "danger");
        }
    }

    download_mv.onclick = function () {
        try {
            mv_title.innerHTML = "MV - " + musicinfo.name
            mv_title.href = "https://music.163.com/#/mv?id=" + mvinfo.data.id;
            mv_player.src = mvinfo.data.url;
            mv_player.play();
            player.pause();
        } catch (e) {
            mv_player.src = "";
            mv_title.innerHTML = musicinfo.name + " - 无 MV"
        }

    }

    mv_dismiss.onclick = function () {
        mv_player.pause()
        player.play()
    }

    playqueue_view = document.getElementById("playqueue")
    shareinput = document.getElementById("shareinput")
    lyricsbox = document.getElementById('lyricsbox')

    action = document.getElementById("action")
    action.onclick = action_onclick

    prev_song = document.getElementById('prev-song')
    prev_song.onclick = function () { playqueue_playhead -= 1; playqueue_playhead_onchage() }

    next_song = document.getElementById('next-song')
    next_song.onclick = function () { playqueue_playhead += 1; playqueue_playhead_onchage() }

    initFFTWindow()
    qualitySelector = document.getElementById('quality-selector')
    player.crossOrigin = "anonymous";

} updateNodes()
/***************************/

/* Front-end related calls */

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
        m.forEach(function (match, groupIndex) { ids.push(match) });
    }
    // extract ID using regex
    if (sharelink.indexOf('list') != -1) {
        // inputed playlist URL
        if (ids.length > 1) { notify('<strong>歌单</strong>ID只能输入一个!', 'warning'); }
        performRequest(ids[0], ['playlist'])
        shareinput.value = "playlist:".concat(ids[0]);

    } else if (sharelink.indexOf('album') != -1) {
        // inputed album URL
        if (ids.length > 1) { notify('<strong>专辑</strong>ID只能输入一个!', 'warning'); }
        performRequest(ids[0], ['album'])
        shareinput.value = "album:".concat(ids[0]);
    } else {
        // anything else (containting any 5+ digit numbers)
        // will be treated as song IDs
        id_string = ''; ids.filter(function (id) { id_string += id + ' ' })
        shareinput.value = "song:".concat(id_string);
        load_ids(ids)
    }
    action.disabled = true
    setTimeout(function () { action.disabled = false; if (!player.duration) next_song.click() }, 1000)
    // re-activate after 1s
}

function player_setPlay(t) {
    t = !!t ? t : 1000
    setTimeout(function () {
        var p = player.play()
        if (!!p) {
            p.then(function () {
                console.log('Playback inialized')
            }).catch(function (e) {
                console.log(e + '...Retrying playback in ' + t + 'ms')
                player_setPlay(t)
            })
        }
    }, t)
}

function lyricsbox_update(lyrics_timestamp) {
    // updates lyrics via timestamp
    var matched = lyrics[lyrics_timestamp]
    if (!!matched) {
        var lyrics_html = ''
        for (match in matched) {
            lyrics_html += '<a class="lyric sub-lyric-' + match + '"/>'
            lyrics_html += matched[match] + '</a>\n'
        }
        // find closest matched lyrics via timestamp
        if (lyricsbox.innerHTML == lyrics_html) return
        // lyrics not chaged,return
        lyricsbox.innerHTML = lyrics_html
        // updates lyrics
        lyricsbox.updated_timestamp = lyrics_timestamp
    } else {
        lyricsbox.innerHTML = ''
    }
}

function player_update() {
    // player update event,used to update lyrics and some other things
    if (typeof lyrics == "undefined") { return }
    if (!lyrics) { lyricsbox.innerHTML = '纯音乐 / 无歌词'; return }
    var lyrics_timestamp = findClosestLesserMatch(Object.keys(lyrics), player.currentTime)

    if (!lyricsbox.updated_timestamp || lyricsbox.updated_timestamp != lyrics_timestamp) lyricsbox_update(lyrics_timestamp)

    var pagetitle = "".concat(musicinfo.name, " - ").concat(concatDictsByKey(musicinfo.ar, "name", " / "));

    if (document.title != pagetitle) document.title = pagetitle
    // update title if not already
}
setInterval(player_update, 500)
// runs every x-ms

function setDownload(src, saveAs) {
    function getBlob(url, notifier) {
        return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.onprogress = function (e) {
                try {
                    if (notifier.className == 'removed') reject('已取消下载')
                    notifier.innerHTML = '下载中 ...' + src.substr(-16) +
                        '<progress class="download-progress" max="' + e.total + '" value="' + e.loaded + '"></progress>'
                } catch (error) {
                    reject(error + ' (' + xhr.status + ')')
                }
            }
            xhr.onloadend = function () {
                if (xhr.status == 200 || xhr.status == 206) {
                    resolve(xhr.response);
                } else {
                    reject(xhr.status)
                }
            };
            xhr.send();
        });
    }
    if (typeof src == 'object') {
        // assuming it's a blob
        if (window.navigator.msSaveOrOpenBlob) {
            //ie11
            window.navigator.msSaveOrOpenBlob(src, saveAs)
        } else {
            download_placeholder.href = window.URL.createObjectURL(src)
            download_placeholder.setAttribute('download', saveAs)
            download_placeholder.click()
        }
    } else {
        // create the blob,then call us when it finishes
        var notifier = notify('下载中' + '<a href="' + src + '">...' + src.substr(-16) + '</a>' + '')
        getBlob(src, notifier).then(function (blob) {
            setDownload(blob, saveAs)
            notifier.innerHTML = '下载完成' + '<a href="' + src + '">...' + src.substr(-16) + '</a>' + ' (保存为 ' + saveAs + ')'
        }).catch(function (err) {
            notify('<b>下载失败</b>' + '<a href="' + src + '">...' + src.substr(-16) + '</a></br>' + err, 'danger')
        })
    }

}

function notify(message, level) {
    var notice = document.createElement('div')
    notice.className = "notice alert alert-" + (!!level ? level : 'success')
    notice.onclick = function () {
        setTimeout(function () {
            if (notice.className == 'removed') return
            notice.remove()
            notice.className = 'removed'
        }, 200)
        notice.style.opacity = 0
        notice.style.height = 0
        notice.style.padding = 0
        // to animate the leaving animation
    }
    console.error(message)
    notice.innerHTML = message
    notifyfeed.appendChild(notice)
    scrollTo(0, 0)
    return notice
}
/***************************/

/* Networking / Callback related calls */
ws = new WebSocket(wsUri)
ws.onopen = function (evt) {
    ws.send(returnCitySN.cip);
    var f = () => { performRequest('', ["contribution"]) };
    f(); setInterval(f, 1000);
    if (!!params['notlrc'] && params['notlrc'] == 1) {
        parse_tlryics = false
    }
    if (!!params['quality']) {
        playback_quality = params['quality']
    }
    if (!!params['?']) {
        /* Parsing url params */
        shareinput.value = params['?']
        setTimeout(action_onclick(),100)
    }
}
// From now on,we will pull `contribution` message every 10s as our hearbeat
ws.onclose = function (evt) { onClose(evt) };
ws.onerror = function (evt) { notify(evt) };

function performRequest() {
    var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var requirements = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var override = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
    var extra = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

    var msg = JSON.stringify({ "id": id, "requirements": requirements, "extras": extra })

    ws.onmessage = function (evt) {
        try {
            var info = JSON.parse(evt.data)
            for (var i in info.requirements) {
                requirement = info.requirements[i]
                eval('callback_' + requirement + '(info=info,override=override)');
            }
            // reflect the callback using eval
        } catch (error) {
            notify(error, 'danger')
        }
    }
    ws.send(msg);
}

function _callback(target) {
    // callback funtion wrapper
    return function (info, override) {
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
        notify(
            "歌曲(id:"
                .concat(audioinfo.data[0].id, ")音频解析失败(")
                .concat(audioinfo.message, ")"),
            "warning"
        );
        if (playqueue.length > 1) {
            notify("即将跳过本歌曲", 'warning')
            setTimeout(function () { next_song.click() }, 1000)
            // skips to next song when fails and more songs are available
        }
    } else {
        player.src = audioinfo['data'][0]['url']
    }
}
callback_audio = _callback(callback_audio)

function picUrl(musicinfo) {
    if (musicinfo.al.id) {
        return musicinfo.al.picUrl
    } else {
        if (!!musicinfo.pc) { // it's for the colud-drive's music library
            return 'http://music.163.com/api/img/blur/' + musicinfo.pc.cid
        }
    }
}

function albumName(musicinfo) {
    if (musicinfo.al.id) {
        return musicinfo.al.name
    } else {
        if (!!musicinfo.pc) {
            return musicinfo.pc.alb
        } else {
            return 'Unknown'
        }
    }
}

function artists(musicinfo) {
    if (musicinfo.ar[0].id) {
        return musicinfo.ar
    } else {
        if (!!musicinfo.pc) {
            return [{ id: 0, name: musicinfo.pc.ar }]
        } else {
            return 'Unknown'
        }
    }
}

function callback_info(info) {
    // callback to process requirements['info']    
    musicinfo = info.info
    if (musicinfo) musicinfo = musicinfo.songs[0]; else return
    console.log({ 'Info callback': musicinfo })
    if (!musicinfo) {
        notify(
            "解析 (ID:".concat(info.required_id, ") 失败"),
            "warning"
        );
        return
    }

    cover.src = picUrl(musicinfo)

    title.innerHTML = '<a href="https://music.163.com/#/song?id='
        .concat(musicinfo.id, '">')
        .concat(musicinfo.name, "</a>");
    album.innerHTML = '<a href="https://music.163.com/#/album?id='
        .concat(musicinfo.al.id, '" style="color:gray">')
        .concat(albumName(musicinfo), "</a>");
    // compose info box 1

    infocontext1.innerHTML = '音乐家：'
    function addArtist(ar) {
        infocontext1.innerHTML += ""
            .concat('<a class="artist" href="https://music.163.com/#/artist?id=')
            .concat(ar.id, '" style="color:gray">')
            .concat(ar.name, "</a>");
    }
    var ars = artists(musicinfo)
    for (index in ars) {
        addArtist(ars[index])
    }
    if (!!audioinfo.data) {
        // these will only be added if audioinfo is available
        infocontext1.innerHTML += '</br><i style="color:#AAA;font-size:small;"> 音频信息 '
            .concat(hrsify(audioinfo["data"][0]["size"]), " / ")
            .concat(audioinfo["data"][0]["type"], " </i></br>");

    }
    if (!!musicinfo.mv) {
        // mv is presnet,perform such request
        performRequest(musicinfo.mv, ['mv'])
        download_mv.firstElementChild.firstElementChild.setAttribute('fill', '#007bff')
        download_mv.disabled = false
    } else {
        download_mv.firstElementChild.firstElementChild.setAttribute('fill', '#cccccc')
        download_mv.disabled = true
    }
}
callback_info = _callback(callback_info)
parse_tlryics = true
function callback_lyrics(info) {
    // callback to process requirements['lyrics']	
    lyricsinfo = info.lyrics
    console.log({ 'Lyrics callback': lyricsinfo })
    if (!!lyricsinfo.nolyric || !!lyricsinfo.uncollected)
        parseLryics()
    else
        if (parse_tlryics) parseLryics(lyricsinfo.lrc.lyric, lyricsinfo.romalrc.lyric, lyricsinfo.tlyric.lyric)
        else parseLryics(lyricsinfo.lrc.lyric, lyricsinfo.romalrc.lyric)
}
callback_lyrics = _callback(callback_lyrics)

function callback_contribution(info) {
    // callback to process requirements['contribution']
    contributioninfo = info.contribution
    // console.log({ 'Contribution callback': contributioninfo })
    // compose infobox 2
    infocontext2.innerHTML = '<a style="color:#888;margin=top:30px">服务贡献者:<strong> '.concat(
        contributioninfo.contributer,
        " </strong>"
    );
    infocontext2.innerHTML += '<i style="color:#AAA;"> '.concat(
        contributioninfo.contributer_message,
        " </i></a></br>"
    );
    infocontext2.innerHTML += '<i style="color:#AAA;font-size:small;"> 现有  <strong> '.concat(
        contributioninfo.count,
        " </strong> 人正在同时使用 </i>"
    );

}
callback_contribution = _callback(callback_contribution)

function callback_playlist(info) {
    // callback to process playlists
    playlistinfo = info.playlist
    console.log({ 'Playlistinfo callback': playlistinfo })
    // once playlist is loaded,appends them to the end of the list
    for (index in playlistinfo.playlist.tracks) {
        item = playlistinfo.playlist.tracks[index]
        playqueue.push(item)
    }
    playqueue_update()
}
callback_playlist = _callback(callback_playlist)

function callback_album(info) {
    // callback to process albums
    albuminfo = info.album
    console.log({ 'Albuminfo callback': albuminfo })
    // once album is loaded,appends them to the end of the list
    for (index in albuminfo.songs) {
        playqueue.push(albuminfo.songs[index])
    }
    playqueue_update()
}
callback_album = _callback(callback_album)

function callback_mv(info) {
    // callback to process albums
    mvinfo = info.mv
    console.log({ 'MVInfo callback': mvinfo })

}
callback_mv = _callback(callback_mv)
/***************************/

/* Utilities */
function urlParams() {
    dict_params = {}
    if (location.href.indexOf('?') == -1) return dict_params
    // returns none if no '?' symbol was found
    query = location.href.substr(location.href.indexOf('?') + 1)

    dict_params['?'] = query
    params = query.split('&')
    for (index in params) {
        param = params[index]
        dict_params[param.split('=')[0]] = param.split('=')[1]
    }
    console.log('Decoded URL params', dict_params)
    return dict_params
}

function concatDictsByKey(dicts, key, split) {
    str = ''
    for (index in dicts) {
        dict = dicts[index]
        str += dict[key] + split
    }
    return str.substr(0, str.length - split.length)
}

function convertFromTimestamp(timestamp) {
    // this will covert LRC timestamp to seconds
    try {
        var mm = timestamp.split(':')[0]
        var ss = timestamp.split(':')[1]
        var xx = ss.split('.')[1]
        ss = ss.split('.')[0]
        return (mm * 60) + ss * 1 + (xx * Math.pow(0.1, xx.length))
    } catch (error) {
        console.error(error)
        return 0
    }
}

function convertToTimestamp(timecode) {
    // this will convert seconds back to LRC timestamp
    function pad(str, p, length) { if (str.length < length) { str = p + str; return pad(str, p, length) } else { return str } }
    var m = Math.floor(timecode / 60); s = Math.floor(timecode - m * 60); ms = Math.floor((timecode - m * 60 - s) * 1000)
    return pad(m.toString(), '0', 2) + ":" + pad(s.toString(), '0', 2) + "." + pad(ms.toString(), '0', 3, true)
}

function parseLryics(lrc, tlrc) {
    // lrc:original lyrics
    // tlrc:translation
    const lrc_regex = /^(?:\[)(.*)(?:\])(.*)/gm;
    lyrics = { '0': ['<i>' + "".concat(musicinfo.name, " - ").concat(concatDictsByKey(musicinfo.ar, "name", " / "))] }
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
    for (arg of arguments) addMatches(arg)
    console.log({ 'Translated Lyrics': lyrics })
    return lyrics
}

function findClosestLesserMatch(arr, i) {
    // finds closeset match to 'i' in array 'arr'
    // note that the match can't be larger than 'i'
    var i = i * 1; var dist = -Math.max(); var t = 0
    for (index in arr) { a = arr[index] * 1; if (!((d = Math.abs(a - i)) > dist) && i > a) { dist = d; t = a } }
    return t
}

function hrsify(fileByte) {
    // Human-Readable-Size-ify byte length
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
/***************************/

/* Play queueing calls */
playqueue = []
// the queue which is to be played and displayed

_generateNodeID = 0
function generateNodeID() { _generateNodeID += 1; return 'element' + _generateNodeID }

nodes_initialized = false
function nodes_append(song) {
    if (!nodes_initialized) { playqueue_view.innerHTML = '</br>'; nodes_initialized = true }
    // clear if not cleared since page is loaded
    var mediabox = document.createElement('li')
    mediabox.className = 'media'
    mediabox.style = 'padding:2px'
    mediabox.id = generateNodeID()
    /* CREATE MEDIABOX */
    var covernode = document.createElement('img')
    covernode.className = 'd-flex mr-3 rounded covernode'
    covernode.src = picUrl(song)
    /* CREATE COVER */
    var mediabody = document.createElement('div')
    mediabody.className = 'media-body'
    /* CREATE MEDIABODY */
    var mediatitle = document.createElement('h5')
    mediatitle.className = 'mt-0'
    mediatitle.innerHTML = "<a>".concat(song.name, "</a>");

    mediatitle.style = 'cursor:pointer;color:#007bff'
    mediatitle.onclick = playqueue_item_onclick
    /* CREATE TITLE */
    var meidainfo = document.createElement('p')
    meidainfo.innerHTML = albumName(song) + ' - ' + concatDictsByKey(artists(song), 'name', ' / ') + (!!song.mv ? '  <i class="fas fa-film" style="float:right;"></i><a>     </a>' : '')
    var closebutton = document.createElement('a')
    closebutton.className = 'close'
    closebutton.onclick = playqueue_item_remove_onclick
    closebutton.style = 'cursor:pointer'
    closebutton.innerHTML = '&times;'
    /* CREATE INFO */
    mediabody.appendChild(closebutton); mediabody.appendChild(mediatitle); mediabody.appendChild(meidainfo);
    mediabox.appendChild(covernode); mediabox.appendChild(mediabody);
    playqueue_view.appendChild(mediabox)
    return mediabox
}

function playqueue_update() {
    // process every item inside playqueue,and add nodes
    if (!playqueue) return
    for (index in playqueue) {
        song = playqueue[index]
        if (!song.node) {
            song.node = nodes_append(song)
            // add node if not already
        }
        song.node.style.color = 'black'
        // revert color chages
        if (playqueue.indexOf(song) == playqueue_playhead) song.node.style.color = '#80abd9'
        // apply color to the current playing one 
    }
}

function playqueue_locate_by_id(id, keep) {
    if (keep == undefined) keep = true
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

playqueue_playhead = -1; playback_quality = 'standard'
function playqueue_playhead_onchage() {
    // plays song on list indexed by playhead
    if (playqueue.length <= playqueue_playhead || playqueue_playhead < 0) playqueue_playhead = 0
    if (!playqueue) return
    console.log('Playhead seeking at index of ' + playqueue_playhead)
    var song = playqueue[playqueue_playhead]
    lyrics = {}; mvinfo = {}; audioinfo = {}; musicinfo = {}
    // clear old info
    try {
        performRequest(song.id, ['contribution', 'audio', 'info', 'lyrics'], '', { 'audio': { 'quality': playback_quality } })
    } catch (error) {
        notify(error, 'warning')
    }

    playqueue_update()
    player_setPlay()
    player_update()
}

function playqueue_item_onclick(caller) {
    // on item remove button click:removes the item
    var main_block = caller.target.parentElement.parentElement.parentElement
    // locate the parent player block,then delete it
    song = playqueue_locate_by_id(main_block.id)

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

function load_ids(playids) {
    // process id in playids,one at a time
    for (index in playids) {
        id = playids[index]
        musicinfo_override = function (info) {
            // once loaded,push to the playqueue            
            musicinfo = info.info
            if (musicinfo) musicinfo = musicinfo.songs[0]; else return
            if (!!musicinfo) {
                playqueue.push(musicinfo)
                console.log({ 'Info Override': musicinfo })
                playqueue_update()
            }
        }
        performRequest(id, ['info'], musicinfo_override)
    }
}
