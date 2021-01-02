const id_regex = /\d{5,}/gm;
var vue = new Vue({
    el: '#app',
    vuetify: new Vuetify(),
    data: () => ({
        newURL: '',

        currentAudio: null,
        currentTrack: null,
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
            showFFTFps: false
        },

        snackBar: false,
        snackMessage: null,
        snackTimeout: 1500,

        server: null,
        requestCount: 0
    }),
    watch: {
        config: {
            deep: true,
            handler(config) {
                _.showFPS = config.showFFTFps
                _.disable = config.disableFFT
            }
        },
        currentTrack: (track, old_) => {
            document.title = `${track.name} - ${track.ar.map(f=>f.name).join(' / ')}`
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
                fetch('pyncm/cloudsearch/GetSearchResult?' + new URLSearchParams(Object.assign({
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
        updateStats: () => {
            fetch('stats/requests').then(response => response.json())
                .then(data => {
                    vue.requestCount = data
                })
        },
        setPlay: (evt) => {
            if (!evt) return
            vue.currentTrack = evt
            vue.loadInfo = 'Fetching track audio'
            vue.loading = true
            fetch('pyncm/track/GetTrackAudio?' + new URLSearchParams({
                    song_ids: evt.id,
                    bitrate: vue.config.bitrate
                }))
                .then(response => response.json()).then(data => {
                    var track = data.data[0]
                    console.log(`[track] audio fetched. bitrate is ${track.br}`, track)
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
                    fetch('pyncm/track/GetTrackLyrics?' + new URLSearchParams(Object.assign({
                        song_id: evt.id
                    }))).then(response => response.json()).then(
                        data => {
                            console.log(`[lyrics] lyrics fetched for ${evt.id}`, data)
                            vue.currentLyrics = data
                        }
                    )
                })
        },
        seekTrack: (pos) => {
            vue.player.currentTime = pos
        },
        opearteTrack: (dir) => {
            var index = vue.playlist.indexOf(vue.currentTrack)
            var operation = {
                forward: () => index++,
                pause: () => {
                    if (vue.player.paused) vue.player.play()
                    else vue.player.pause()
                    return true
                },
                rewind: () => index--,
            } [dir]()
            if (operation === true) return
            index = index % vue.playlist.length
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
            vue.loadInfo = 'Fetching tracks'
            vue.loading = true;
            fetch(`pyncm/${route}?` + new URLSearchParams(params)).then(response => response.json())
                .then(data => {
                    var newTracks, existTracks;
                    if (data.playlist) data.songs = data.playlist.tracks
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
                }).catch(error => {
                    vue.lastError = error
                    vue.loading = false
                    vue.error = true
                })
        },
        lyricsAt: index => vue.parsedLyrics[Object.keys(vue.parsedLyrics)[index]],
        downloadTrack: track => {
            console.log(`[download] ${track.url}`)
            window.open(track.url)
        }
    }
})
vue.player.onended = () => {
    vue.opearteTrack('forward')
}
vue.player.ontimeupdate = () => {
    vue.duration = vue.player.duration
    vue.currentTime = vue.player.currentTime
    if (vue.parsedLyrics) vue.matchedIndex = search(vue.currentTime, Object.keys(vue.parsedLyrics))
}
vue.player.crossOrigin = "anonymous"
fetch('stats/server').then(response => response.json())
    .then(data => {
        vue.server = data
    })