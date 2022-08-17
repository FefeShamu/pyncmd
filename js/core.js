const host = location.origin == "file://" || location.hostname === "localhost" || location.hostname === "127.0.0.1" ? 'https://pyncmd.vercel.app' : '';
const id_regex = /\d{5,}/gm;
var vue = new Vue({
    el: '#app',
    vuetify: new Vuetify(
        {
            theme : { dark : true }
        }
    ),
    data: () => ({
        host : host,
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

        player: null,
        vplayer : null,

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
            useIP: 'client',
            romaConventionUseHepburnOrKunreiOrPassport:'hepburn'
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

        checkOriginal:true,
        checkRoma:true,
        checkTranslate:true,

        lrcOriginal: null,
        lrcRomaOriginal: null,
        lrcTranslate: null,
        lrcTokens: null,
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
                vue.lrcOriginal = parseLryics(new_.lrc.lyric)
                vue.lrcRomaOriginal = parseLryics(new_.romalrc.lyric)
                vue.lrcTranslate = parseLryics(new_.tlyric.lyric)
                console.log('[lyrics] parsed lrc',vue.lrcOriginal,vue.lrcRomaOriginal,vue.lrcTranslate)
                function tokenizerCallback(token){
                    console.log('[lyrics] tokenized parsed lyrics',token.data)
                    vue.lrcTokens = token.data
                }
                // For all these cases, original MUST be present
                // if both romaji and translation are present, it should be japanese
                // kakasi can help us tokenize them
                let exist = object => Object.keys(object).length > 0;
                if (exist(vue.lrcRomaOriginal) && exist(vue.lrcTranslate)){                    
                    vue.kakasi(Object.values(vue.lrcOriginal)).then(response => response.json())
                    .then(data => tokenizerCallback(data))          
                }
                else {
                    // if only original and romaji are present (or only original), assume the provided romaji (or nothing)
                    // matches the original character by character
                    let lrcOriginal  = Object.entries(vue.lrcOriginal) 
                    let romaOriginal = Object.values(vue.lrcRomaOriginal)
                    let tokens = {}                    
                    for (var no=0;no<lrcOriginal.length;no++){
                        let [timestamp,lrcLine] = lrcOriginal[no]    
                        timestamp = parseFloat(timestamp)
                        romaLine = search(timestamp,Object.keys(vue.lrcRomaOriginal))
                        romaLine = romaOriginal[romaLine]                        
                        romaLine = romaLine ? romaLine.split(' ') : []
                        lineTokens = []
                        for (var i=0,romaIndex=0;i<lrcLine.length;i++){
                            if (lrcLine.charAt(i) != ' '){
                                roma = romaLine[romaIndex] ? romaLine[romaIndex] : ''    
                                char = lrcLine.charAt(i)
                                romaIndex++
                            } else {
                                roma = ' '
                                char = roma
                            }
                            token = {"orig":char,"hepburn":roma,"kunrei":roma,"passport":roma}
                            // don't really know what scheme netease used to convert non-japanese words to romaji
                            // assign those to all of the convention names for convenience's sake
                            lineTokens.push(token)                            
                        }
                        tokens[no] = lineTokens
                    }
                    tokenizerCallback({'data':tokens}) 
                }         
            } catch {
                vue.lrcOriginal = null
                vue.lrcRomaOriginal = null
                vue.lrcTranslate = null
                vue.lrcTokens = null

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
                vue.request(new URLSearchParams(Object.assign({
                    module:'cloudsearch',
                    method:'GetSearchResult',

                    keyword: vue.queryString
                }))).then(response => response.json()).then(
                    data => {
                        if (data.server) vue.server = data.server
                        if (data.result && !data.songs) data.songs = data.result.songs
                        vue.loadingRecessive = false
                        if (!data.songs) return
                        console.log('[search] results', data.songs)
                        vue.searchResults = data.songs
                    }).catch(err => {
                    vue.loadingRecessive = false
                })
            }, vue.config.debounce)
        }
    },
    methods: {
        kakasi(lines){
            console.log('[kakasi] tokenizing lines',lines)
            return fetch(`${host}/api/kakasi?content=${lines.join('|')}`)
        },
        request(query){
            return fetch(`${host}/api/pyncm?withIP=${vue.config.useIP}&${query}`)
        },  
        toTimestamp:convertToTimestamp, 
        set:(...args)=>{
            return vue.$set(...args)
        }, 
        bufferTrackDetails: (trackIds) => {
            console.log(`[track] requesting info for id ${trackIds}`)
            var song_ids = 'song_ids=' + trackIds.join('&song_ids=')
            return vue.request('module=track&method=GetTrackDetail&'+song_ids).then(response => response.json()).then(data => {
                if (data.server) vue.server = data.server
                console.log(`[track] requested info for id ${trackIds}`)        
                vue.bufferedPlaylist = data        
            })
        },
        setBackgroundVideo: (url) => {            
            vue.loadInfo = 'loading resources'      
            vue.loading=true
            setTimeout(()=>vue.loading=false,500)
            vue.vplayer.src = url      
        },
        setPlay: (evt) => {
            if (!evt) return
            vue.currentTrack = evt
            vue.currentMV = null
            vue.vplayer.src = ''
            vue.loadInfo = 'requesting track audio'
            vue.loading = true
            vue.request(new URLSearchParams({
                    module:'track',
                    method:'GetTrackAudio',

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
                    vue.request(new URLSearchParams(Object.assign({
                        module:'track',
                        method:'GetTrackLyrics',

                        song_id: evt.id
                    }))).then(response => response.json()).then(
                        data => {
                            console.log(`[lyrics] lyrics requested for ${evt.id}`, data)
                            vue.currentLyrics = data                            
                        }
                    )
                }).then(data => {
                    if (!!!evt.mv) return
                    vue.request(new URLSearchParams(Object.assign({
                        module:'video',
                        method:'GetMVResource',

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
            route = 'module=track&method=GetTrackDetail'
            params = {
                song_ids: match
            }
            if (check_arg(url, 'list')) {
                route = 'module=playlist&method=GetPlaylistInfo'
                params = {
                    playlist_id: match
                }
            } else if (check_arg(url, 'album')) {
                route = 'module=album&method=GetAlbumInfo'
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
            vue.request(route + '&' + new URLSearchParams(params)).then(response => response.json())
                .then(data => {
                    if (data.server) vue.server = data.server
                    if (data.playlist) { // workaround for incomplete playlists
                        var song_ids = data.playlist.trackIds.map(track => track.id);
                        song_ids = 'song_ids=' + song_ids.join('&song_ids=')                        
                        console.log('[multi] multi-track requesting track/GetTrackDetail?' + song_ids)
                        vue.request('module=track&method=GetTrackDetail&' + song_ids).then(response => response.json()).then(trackCallback)
                    } else {
                        trackCallback(data)
                    }
                }).catch(error => {
                    vue.lastError = error
                    vue.loading = false
                    vue.error = true
                })
        },
        timestampAt: index => Object.keys(vue.lrcOriginal)[index],
        lyricsAt: index => vue.parsedLyrics[vue.timestampAt(index)],
        downloadTrack: track => {
            console.log(`[download] ${track.url}`)
            vue.openWindow(track.url)
        },
        getLyricsPrecentage : (getDelta) => {
            var played = vue.currentTime-vue.timestampAt(vue.matchedIndex)
            var total  = vue.timestampAt(vue.matchedIndex + 1) - vue.timestampAt(vue.matchedIndex)
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

vue.player = document.getElementById('player')
vue.vplayer = document.getElementById('vplayer')

var lastPrecentage = 0;

vue.player.onended = () => {
    vue.opearteTrack('forward')
    vue.vplayer.src = ''
}
var lastScrolled = 0;
vue.player.ontimeupdate = () => {
    vue.duration = vue.player.duration
    vue.currentTime = vue.player.currentTime
    
    if (vue.player.paused)
        vue.vplayer.pause()
    else if (vue.vplayer.paused && vue.vplayer.networkState == 1)
        vue.vplayer.play()
    if (vue.vplayer.src){
        if (Math.abs(vue.vplayer.currentTime - vue.player.currentTime) >= 5) 
            vue.vplayer.currentTime = vue.player.currentTime        
    }
    if (vue.lrcOriginal) {
        vue.matchedIndex = Math.max(search(vue.currentTime, Object.keys(vue.lrcOriginal)) - 1,0)
        if (lastScrolled != vue.matchedIndex) {
            var el = document.getElementById('lyric-view-' + vue.timestampAt(vue.matchedIndex))
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

