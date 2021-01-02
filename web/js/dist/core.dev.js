"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var id_regex = /\d{5,}/gm;
var vue = new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  data: function data() {
    return {
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
        showLyrics: true
      }
    };
  },
  watch: {
    currentTrack: function currentTrack(track, old_) {
      document.title = "".concat(track.name, " - ").concat(track.ar.map(function (f) {
        return f.name;
      }).join(' / '));
    },
    currentLyrics: function currentLyrics(new_, old_) {
      if (!new_) return;

      try {
        vue.parsedLyrics = parseLryics(new_.lrc.lyric, new_.romalrc.lyric, new_.tlyric.lyric);
        console.log('[lyrics] parsed', vue.parsedLyrics);
      } catch (_unused) {
        vue.parsedLyrics = null;
        vue.matchedIndex = 0;
      }
    },
    queryString: function queryString(new_, old_) {
      if (vue.queryTimeout) clearTimeout(vue.queryTimeout);
      vue.queryTimeout = setTimeout(function () {
        // querying the result                    
        if (!vue.queryString) return;
        vue.loadingRecessive = true;
        console.log('[search] searching', vue.queryString);
        fetch('pyncm/cloudsearch/GetSearchResult?' + new URLSearchParams(Object.assign({
          keyword: vue.queryString
        }))).then(function (response) {
          return response.json();
        }).then(function (data) {
          vue.loadingRecessive = false;
          if (!data.result || !data.result.songs) return;
          console.log('[search] results', data.result.songs);
          vue.searchResults = data.result.songs;
        })["catch"](function (err) {
          vue.loadingRecessive = false;
        });
      }, vue.config.debounce);
    }
  },
  methods: {
    setPlay: function setPlay(evt) {
      if (!evt) return;
      vue.currentTrack = evt;
      vue.loadInfo = 'Fetching track audio';
      vue.loading = true;
      fetch('pyncm/track/GetTrackAudio?' + new URLSearchParams({
        song_ids: evt.id,
        bitrate: vue.config.bitrate
      })).then(function (response) {
        return response.json();
      }).then(function (data) {
        var track = data.data[0];
        console.log("[track] audio fetched. bitrate is ".concat(track.br), track);
        vue.currentLyrics = null;
        vue.currentAudio = track; // setup the player

        vue.player.src = track.url;
        vue.player.play();
        vue.loading = false;
      })["catch"](function (err) {
        vue.loading = false;
        vue.lastError = err;
        vue.error = true;
      }).then(function (data) {
        fetch('pyncm/track/GetTrackLyrics?' + new URLSearchParams(Object.assign({
          song_id: evt.id
        }))).then(function (response) {
          return response.json();
        }).then(function (data) {
          console.log("[lyrics] lyrics fetched for ".concat(evt.id), data);
          vue.currentLyrics = data;
        });
      });
    },
    seekTrack: function seekTrack(pos) {
      vue.player.currentTime = pos;
    },
    opearteTrack: function opearteTrack(dir) {
      var index = vue.playlist.indexOf(vue.currentTrack);
      var operation = {
        forward: function forward() {
          return index++;
        },
        pause: function pause() {
          if (vue.player.paused) vue.player.play();else vue.player.pause();
          return true;
        },
        rewind: function rewind() {
          return index--;
        }
      }[dir]();
      if (operation) return;
      index = index % vue.playlist.length;
      vue.currentTrack = vue.playlist[index];
      vue.setPlay(vue.currentTrack);
    },
    addTrack: function addTrack(url) {
      var route, params, m;
      var ids = [];

      while ((m = id_regex.exec(url)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === id_regex.lastIndex) id_regex.lastIndex++;
        m.forEach(function (match, groupIndex) {
          ids.push(match);
        });
      }

      var match = ids;

      if (!match) {
        vue.lastError = 'No applicable IDs found';
        vue.error = true;
      }

      match = match[0]; // parsing ids,only picking up first match

      route = 'track/GetTrackDetail';
      params = {
        song_ids: match
      };

      if (check_arg(url, 'list')) {
        route = 'playlist/GetPlaylistInfo';
        params = {
          playlist_id: match
        };
      } else if (check_arg(url, 'album')) {
        route = 'album/GetAlbumInfo';
        params = {
          album_id: match
        };
      }

      console.log("[multi] adding ".concat(match, " ").concat(route));
      vue.loadInfo = 'Fetching tracks';
      vue.loading = true;
      fetch("pyncm/".concat(route, "?") + new URLSearchParams(params)).then(function (response) {
        return response.json();
      }).then(function (data) {
        var _vue$playlist;

        var newTracks, existTracks;
        if (data.playlist) data.songs = data.playlist.tracks;
        newTracks = data.songs.filter(function (track) {
          return !vue.playlist.map(function (track) {
            return track.id;
          }).includes(track.id);
        });
        if (newTracks.length != data.songs.length) existTracks = data.songs.filter(function (track) {
          return vue.playlist.map(function (track) {
            return track.id;
          }).includes(track.id);
        });
        vue.existTracks = existTracks;
        if (existTracks) vue.trackConflictDialog = true;

        (_vue$playlist = vue.playlist).push.apply(_vue$playlist, _toConsumableArray(newTracks));

        if (!vue.currentTrack) vue.setPlay(vue.playlist[0]);
        vue.loading = false;
      })["catch"](function (error) {
        vue.lastError = error;
        vue.loading = false;
        vue.error = true;
      });
    },
    lyricsAt: function lyricsAt(index) {
      return vue.parsedLyrics[Object.keys(vue.parsedLyrics)[index]];
    },
    downloadTrack: function downloadTrack(track) {
      console.log("[download] ".concat(track.url));
      window.open(track.url);
    }
  }
});

vue.player.onended = function () {
  vue.opearteTrack('forward');
};

vue.player.ontimeupdate = function () {
  vue.duration = vue.player.duration;
  vue.currentTime = vue.player.currentTime;
  if (vue.parsedLyrics) vue.matchedIndex = search(vue.currentTime, Object.keys(vue.parsedLyrics));
};

vue.player.crossOrigin = "anonymous";