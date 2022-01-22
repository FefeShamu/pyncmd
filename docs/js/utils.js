function check_arg() {
    var target = arguments[0];

    for (var i = 1; i < arguments.length; i++) {
        if (target.search(arguments[i]) >= 0) return arguments[i];
    }

    return undefined;
}

function search(val, src, l, r) {
    if (r == undefined) {
        l = 0;
        r = src.length;
    }
    var pivot = l + r >> 1;
    if (l >= r || pivot == l || pivot == r) return pivot;
    var in_between = (pivot <= 0 || src[pivot - 1] <= val) && val <= src[pivot];
    if (in_between)
        if (src[pivot] == val) return pivot;
        else if (src[pivot - 1] == val) return pivot - 1;
    else return pivot;
    if (src[pivot] < val) return search(val, src, pivot, r);
    else return search(val, src, l, pivot);
}

function convertFromTimestamp(timestamp) {
    // this will covert LRC timestamp to seconds
    try {
        var mm = timestamp.split(':')[0];
        var ss = timestamp.split(':')[1];
        var xx = ss.split('.')[1];
        ss = ss.split('.')[0];
        return (mm * 60 + ss * 1 + xx * Math.pow(0.1, xx.length)).toFixed(2); // ignore higher percision
    } catch (error) {    
        return 0;
    }
}

function convertToTimestamp(timecode) {
    var mm = Math.floor(timecode / 60).toString().padStart(2,'0')
    var ss = Math.floor(timecode - mm * 60).toString().padStart(2,'0')
    var xx = Math.floor((timecode - mm * 60 - ss) * 100).toString().padStart(2,'0')
    // preserve 2 digits for hundredth-of-a-second
    
    return `${mm}:${ss}.${xx}`
}

function parseLryics(lrcs) {
    var lrc_regex = /^(?:\[)(.*)(?:\])(.*)/gm;
    var lyrics = {};
    var arg; // stub for babel
    function addMatches(lrc_string) {
        var match;
        while ((match = lrc_regex.exec(lrc_string)) !== null) {
            if (match.index === lrc_regex.lastIndex) lrc_regex.lastIndex++; // This is necessary to avoid infinite loops with zero-width matches

            var timestamp = match[1];
            if (timestamp.indexOf('.') == -1) timestamp += '.000'; // Pad with 0ms if no milliseconds is defined
            timestamp = convertFromTimestamp(timestamp);
            if (!lyrics[timestamp.toString()]) {
                lyrics[timestamp.toString()] = [match[2]];
            } else {
                lyrics[timestamp.toString()].push(match[2]);
            } 
        }
    }
    for (var lrc of arguments) addMatches(lrc)
    return lyrics
}

var bufferLength, canvasCtx, dataArray, analyser, _;
var WIDTH, HEIGHT;

function setup(analyserNode, canvasElement, w, h, settings) {
  _ = settings;
  WIDTH = w;
  HEIGHT = h;
  canvasElement.width = w;
  canvasElement.height = h;
  canvasCtx = canvasElement.getContext('2d');
  analyser = analyserNode;
  analyser.fftSize = settings.fftSize;
  bufferLength = analyser.frequencyBinCount;
  canvasCtx.fillStyle = 'rgb(0,0,0)';
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
}

function run_sequence() {
  _.sequence();
}

function text(s) {
  canvasCtx.font = "30px Consolas";
  canvasCtx.fillStyle = 'rgb(0,0,0)';
  canvasCtx.fillRect(20, 20, 30 * 10, 30);
  canvasCtx.fillStyle = 'rgb(0,255,0)';
  canvasCtx.fillText(s, 20, 50);
}

function draw_bars() {
  // classic flashy bars
  analyser.getByteFrequencyData(dataArray);
  var barWidth = WIDTH / bufferLength * 2.5 - _.spacing; // subtract SPACING to compansate the spacing error

  var barHeight;
  var x = 0;

  for (var i = 0; i < bufferLength; i++) {
    var barHeight = HEIGHT * (Math.pow(dataArray[i], 2) / Math.pow(255, 2)) * _.ratio;

    canvasCtx.fillStyle = _.barStyle[i % _.barStyle.length];
    canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
    x += barWidth + _.spacing; // drawing the bars
  }
}

var xpos = 0;
var xdelta = -1;
var seq_time = 10 * 1000;

function draw_specturm() {
  // fft specturm view
  analyser.getByteFrequencyData(dataArray);
  xpos += xdelta;
  xpos = xpos % WIDTH;

  for (var i = 0; i < bufferLength; i++) {
    var vi = i;
    var v = 255 * (Math.pow(dataArray[vi], 2) / Math.pow(255, 2));
    var style = 'rgb(' + v + ',' + v + ',' + v + ')';
    var y = HEIGHT * (1 - vi / bufferLength);
    canvasCtx.fillStyle = style;
    canvasCtx.fillRect(xpos, y, xdelta + 1, HEIGHT / bufferLength + 1);
  }
}

var lastv = 0;
var db_v = 0;

function draw_bass_response() {
  // flashy background
  analyser.getByteFrequencyData(dataArray);
  var avg = 0;
  var l = Math.floor(_.range_l * bufferLength);
  var r = Math.floor(_.range_r * bufferLength - 1);

  for (var i = l; i < r; i++) {
    avg += dataArray[i];
  }

  avg = avg / (r - l + 1);
  if (avg - lastv > _.threshold) db_v += _.apush;
  db_v *= _.accel;
  var v = Math.sqrt(db_v) / 16;
  var g = canvasCtx.createLinearGradient(WIDTH / 2, 0 , WIDTH / 2, HEIGHT)
  g.addColorStop(1-v, "black")
  g.addColorStop(1, "#aaaaaa")

  canvasCtx.fillStyle = g
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

  lastv = avg;
}
var updateFrameTick = window.performance.now();
function ffta_draw() {
  var updateFrameTime = window.performance.now() - updateFrameTick
  if (typeof canvasCtx == 'undefined') return

  if (!bufferLength || _.disable) {
    canvasCtx.fillStyle = 'rgb(0,0,0)'
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  } else {
    dataArray = new Uint8Array(bufferLength);
    run_sequence();
    if (_.showFPS) {
      text((1000 / updateFrameTime).toFixed(0).toString() + ' FPS    ');
    }
    xdelta = WIDTH * (updateFrameTime / seq_time);
  }
  updateFrameTick = window.performance.now()
}


function update() {  
  ffta_draw()
  setTimeout(function(){
    requestAnimationFrame(update);
  },_.minFrameTime);  
}

var ffta_settings = {
  'barStyle': ['#e2f1f8', '#e2f1f8', '#e2f1f8', '#b0bec5', '#b0bec5', '#b0bec5', '#808e95', '#808e95'],
  'spacing': 2,
  'ratio': 0.7,
  'fftSize': 512,
  'threshold': 3,
  'range_l': 0,
  'range_r': 0.3,
  'accel': 0.95,
  'apush': 30,
  'sequence': () => {
      draw_bass_response()
      draw_bars();
  },
  'disable':false,
  'showFPS':false,
  'minFrameTime':1000/60,
}

function fftInit() {
  var peakmeter = document.getElementById('visualizer')
  var audioCtx = new window.AudioContext()
  // connecting the analyzer    
  var source = audioCtx.createMediaElementSource(vue.player)
  source.connect(audioCtx.destination)
  var analyzer = audioCtx.createAnalyser()
  source.connect(analyzer)
  vue.player.addEventListener('play', function () {
      audioCtx.resume();
  });
  setup(analyzer, peakmeter, 320, 180, ffta_settings)
  update()
  console.log('[fft] initialized with settings ', ffta_settings)
}