const id_regex = /\d{5,}/gm;
function request(url){
    return fetch(endpoint + url) // endpoint should be backslashed
}
var vue = new Vue({
    el: '#app',
    vuetify: new Vuetify(
        {
            theme : { dark : true }
        }
    ),
    data: () => ({
        newURL: '',

        currentAudio: null,
        currentTrack: null,
        currentMV   : null,
        playlist: [],

        loading: false,
        loadingRecessive: false,
        loadInfo: 'Please stand by',

        existTracks: [],
        trackConflictDialog: false,

        lastError: null,
        error: false,

        currentTime: 0,
        duration: 0,

        player: document.getElementById('player'),

        currentLyrics: [],
        matchedIndex: 0,
        parsedLyrics: null,

        searchResults: null,
        queryString: null,

        config: {
            bitrate: 320000,
            debounce: 500,
            showLyrics: true,
            disableFFT: false,
            showFFTFps: false,
            fftFPS: 60,
        },

        snackBar: false,
        snackMessage: null,
        snackTimeout: 1500,

        server: null,
        
        requests: [],
        globalRequests: [],

        bufferedPlaylist: [],

        userPlaylist:[],
        globalPlaylist:[],

        shuffleMode:'repeat',
        shuffleModes:['repeat','repeat-once'],
    }),
    watch: {
        config: {
            deep: true,
            handler(config) {
                _.minFrameTime  = (config.fftFPS <= 0 ? 0 : 1000 / config.fftFPS);
                _.showFPS = config.showFFTFps
                _.disable = config.disableFFT
            }
        },
        currentTrack: (track, old_) => {
            document.title = `${track.name} - ${track.ar.map(f=>f.name).join(' / ')}`
            window.history.pushState("", document.title, `?trackId=${track.id}`)
        },
        currentLyrics: (new_, old_) => {
            if (!new_) return
            try {
                vue.parsedLyrics = parseLryics(new_.lrc.lyric, new_.romalrc.lyric, new_.tlyric.lyric)
                console.log('[lyrics] parsed', vue.parsedLyrics)
            } catch {
                vue.parsedLyrics = null
                vue.matchedIndex = 0
            }

        },
        queryString: (new_, old_) => {
            if (vue.queryTimeout)
                clearTimeout(vue.queryTimeout)
            vue.queryTimeout = setTimeout(() => {
                // querying the result                    
                if (!vue.queryString) return
                vue.loadingRecessive = true
                console.log('[search] searching', vue.queryString)
                request('cloudsearch/GetSearchResult?' + new URLSearchParams(Object.assign({
                    keyword: vue.queryString
                }))).then(response => response.json()).then(
                    data => {
                        vue.loadingRecessive = false
                        if (!data.result || !data.result.songs) return
                        console.log('[search] results', data.result.songs)
                        vue.searchResults = data.result.songs
                    }).catch(err => {
                    vue.loadingRecessive = false
                })
            }, vue.config.debounce)
        }
    },
    methods: {          
        toTimestamp:convertToTimestamp, 
        set:(...args)=>{
            return vue.$set(...args)
        }, 
        bufferTrackDetails: (trackIds) => {
            console.log(`[track] requesting info for id ${trackIds}`)
            var song_ids = 'song_ids=' + trackIds.join('&song_ids=')
            return request('track/GetTrackDetail?'+song_ids).then(response => response.json()).then(data => {
                console.log(`[track] requested info for id ${trackIds}`)        
                vue.bufferedPlaylist = data        
            })
        },
        setPlay: (evt) => {
            if (!evt) return
            vue.currentTrack = evt
            vue.loadInfo = 'requesting track audio'
            vue.loading = true
            request('track/GetTrackAudio?' + new URLSearchParams({
                    song_ids: evt.id,
                    bitrate: vue.config.bitrate
                }))
                .then(response => response.json()).then(data => {
                    var track = data.data[0]
                    console.log(`[track] audio requested. bitrate is ${track.br}`, track)                    
                    vue.currentLyrics = null
                    vue.currentAudio = track
                    // setup the player
                    vue.player.src = track.url
                    vue.player.play()
                    vue.loading = false
                }).catch(err => {
                    vue.loading = false
                    vue.lastError = err
                    vue.error = true
                }).then(data => {
                    request('track/GetTrackLyrics?' + new URLSearchParams(Object.assign({
                        song_id: evt.id
                    }))).then(response => response.json()).then(
                        data => {
                            console.log(`[lyrics] lyrics requested for ${evt.id}`, data)
                            vue.currentLyrics = data
                        }
                    )
                }).then(data => {
                    if (!!!evt.mv) return
                    request('video/GetMVResource?' + new URLSearchParams(Object.assign({
                        mv_id : evt.mv
                    }))).then(response => response.json()).then(
                        data => {
                            console.log(`[mv] mv requested for ${evt.id}`, data)
                            vue.currentMV = data
                        }
                    )
                })
        },
        seekTrack: (pos) => {
            vue.player.currentTime = pos
        },
        opearteTrack: (dir) => {
            var index = vue.playlist.indexOf(vue.currentTrack)
            var delta = 0
            var operation = {
                forward: () => delta = 1,
                pause: () => {
                    if (vue.player.paused) vue.player.play()
                    else vue.player.pause()
                    return true
                },
                rewind: () => delta = -1,
            } [dir]()
            if (operation === true) return
            if (vue.shuffleMode == 'repeat') index += delta
            if (vue.shuffleMode == 'repeat-once') index = index            
            index = index % vue.playlist.length            
            if (vue.currentTrack.id == vue.playlist[index].id){
                // not changing,replay current track
                vue.player.currentTime = 0
                return vue.player.play()
            }
            vue.currentTrack = vue.playlist[index]
            vue.setPlay(vue.currentTrack)
        },
        addTrack: (url) => {
            var route, params, m
            var ids = []
            while ((m = id_regex.exec(url)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === id_regex.lastIndex) id_regex.lastIndex++
                m.forEach(function (match, groupIndex) {
                    ids.push(match)
                });
            }
            var match = ids
            if (!match) {
                vue.lastError = 'No applicable IDs found'
                vue.error = true
            }
            match = match[0]
            // parsing ids,only picking up first match
            route = 'track/GetTrackDetail'
            params = {
                song_ids: match
            }
            if (check_arg(url, 'list')) {
                route = 'playlist/GetPlaylistInfo'
                params = {
                    playlist_id: match
                }
            } else if (check_arg(url, 'album')) {
                route = 'album/GetAlbumInfo'
                params = {
                    album_id: match
                }
            }            
            console.log(`[multi] adding ${match} ${route}`)
            vue.loadInfo = 'requesting tracks'
            vue.loading = true;
            var trackCallback = data => {
                var newTracks, existTracks;
                newTracks = data.songs.filter(track => !vue.playlist.map(track => track.id)
                    .includes(track.id))
                if (newTracks.length != data.songs.length)
                    existTracks = data.songs.filter(track => vue.playlist.map(track => track.id)
                        .includes(track.id))
                vue.existTracks = existTracks
                if (existTracks) vue.trackConflictDialog = true
                vue.playlist.push(...newTracks)
                if (!vue.currentTrack) vue.setPlay(vue.playlist[0])
                vue.loading = false
            }
            request(`${route}?` + new URLSearchParams(params)).then(response => response.json())
                .then(data => {
                    if (data.playlist) { // workaround for incomplete playlists
                        var song_ids = data.playlist.trackIds.map(track => track.id);
                        song_ids = 'song_ids=' + song_ids.join('&song_ids=')                        
                        console.log('[multi] multi-track requesting track/GetTrackDetail?' + song_ids)
                        request('track/GetTrackDetail?' + song_ids).then(response => response.json()).then(trackCallback)
                    } else {
                        trackCallback(data)
                    }
                }).catch(error => {
                    vue.lastError = error
                    vue.loading = false
                    vue.error = true
                })
        },
        timestampAt: index => Object.keys(vue.parsedLyrics)[index],
        lyricsAt: index => vue.parsedLyrics[vue.timestampAt(index)],
        downloadTrack: track => {
            console.log(`[download] ${track.url}`)
            vue.openWindow(track.url)
        },
        getLyricsPrecentage : (getDelta) => {
            var played = vue.currentTime-vue.timestampAt(vue.matchedIndex - 1)
            var total  = vue.timestampAt(vue.matchedIndex) - vue.timestampAt(vue.matchedIndex - 1)
            var precentage = (played/total)
            var val = vue.matchedIndex >= 1 ? (getDelta ? precentage - lastPrecentage : precentage) : 0
            lastPrecentage = precentage
            return val
        },
        redirectTo : (url) => {
            window.location.href = url
        },
        openWindow : (url) => {
            window.open(url)
        }
    }
})
var lastPrecentage = 0;

vue.player.onended = () => {
    vue.opearteTrack('forward')
}
var lastScrolled = 0;
vue.player.ontimeupdate = () => {
    vue.duration = vue.player.duration
    vue.currentTime = vue.player.currentTime
    if (vue.parsedLyrics) {
        vue.matchedIndex = search(vue.currentTime, Object.keys(vue.parsedLyrics))
        if (lastScrolled != vue.matchedIndex) {
            var el = document.getElementById('lyric-view-' + vue.timestampAt(vue.matchedIndex - 1))
            if (el) el.scrollIntoView({
                block: 'center',
                behavior:'smooth'
            })
            lastScrolled = vue.matchedIndex;
        }
    }
}

window.addEventListener('load', (event) => {
    var query = document.location.href.indexOf('?')
    if (query > 0) vue.addTrack(document.location.href.substr(query))
},false);

vue.player.crossOrigin = "anonymous"