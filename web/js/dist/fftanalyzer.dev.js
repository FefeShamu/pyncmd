"use strict";

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
  var v = Math.sqrt(db_v) / Math.sqrt(255) * 144;
  var h = HEIGHT >> 1;

  for (var i = 0; i <= h; i++) {
    var v1 = v * (h - i) / h;
    var style = 'rgb(' + v1 + ',' + v1 + ',' + v1 + ')';
    canvasCtx.fillStyle = style;
    canvasCtx.fillRect(0, i, WIDTH, 1);
    canvasCtx.fillRect(0, HEIGHT - i, WIDTH, 1);
  }

  lastv = avg;
}

function ffta_draw() {
  if (typeof canvasCtx == 'undefined') return;

  if (!bufferLength || _.disable) {
    canvasCtx.fillStyle = 'rgb(0,0,0)';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  } else {
    dataArray = new Uint8Array(bufferLength);
    run_sequence();

    if (_.showFPS) {
      text((1000 / updateFrameTime).toFixed(0).toString() + ' FPS    ');
    }

    xdelta = WIDTH * (updateFrameTime / seq_time);
  }
}

var updateFrameTick = Date.now();
var updateFrameTime = 0;

function update() {
  updateFrameTime = Date.now() - updateFrameTick;

  if (updateFrameTime >= _.minFrameTime) {
    ffta_draw();
    updateFrameTick = Date.now();
  }

  requestAnimationFrame(update);
}