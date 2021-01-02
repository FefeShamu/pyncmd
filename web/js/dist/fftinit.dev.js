"use strict";

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
  'sequence': function sequence() {
    draw_bass_response();
    draw_bars();
  }
};
var peakmeter = document.getElementById('visualizer');
var audioCtx = new window.AudioContext(); // connecting the analyzer    

var source = audioCtx.createMediaElementSource(vue.player);
source.connect(audioCtx.destination);
var analyzer = audioCtx.createAnalyser();
source.connect(analyzer);
vue.player.addEventListener('play', function () {
  audioCtx.resume();
});
ffta_init(analyzer, peakmeter, peakmeter.offsetWidth, peakmeter.offsetHeight, ffta_settings);
requestAnimationFrame(ffta_draw);