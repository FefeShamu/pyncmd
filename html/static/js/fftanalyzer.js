/*
    FFT Frequency bar view

    refernced:https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
*/
function ffta_init(analyserNode, canvasElement, w, h, settings) {
    _ = settings

    WIDTH = w;
    HEIGHT = h;
    canvasElement.width = w;
    canvasElement.height = h;

    canvasCtx = canvasElement.getContext('2d');
    analyser = analyserNode;
    analyser.fftSize = settings.fftSize;
    bufferLength = analyser.frequencyBinCount;
    canvasCtx.fillStyle = 'rgb(0,0,0)'
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    requestAnimationFrame(ffta_draw);
}
tickdelta = Date.now();
bufferLength = 0;
function draw_bars(dataArray){
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    var barWidth = WIDTH / bufferLength * 2.5 - _.spacing; // subtract SPACING to compansate the spacing error
    var barHeight;
    var x = 0;
    for (var i = 0; i < bufferLength; i++) {        
        var barHeight = HEIGHT * (dataArray[i]**2 / 255**2) * _.ratio            
        canvasCtx.fillStyle = _.fillstyle[1];
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth + _.spacing; // drawing the bars
    }
}
xpos=0;xdelta=-1;seq_time=10 * 1000;
function draw_specturm(dataArray){
    xpos += xdelta; xpos = xpos % WIDTH;    
    for (var i = 0; i < bufferLength; i++) {        
        var vi= i;
        var v = 255 * (Math.pow(dataArray[vi],3) / Math.pow(255,3))
        var style = 'rgb(' + v + ',' + v + ',' +v + ')'
        var y=HEIGHT * (1 - vi / bufferLength)
        canvasCtx.fillStyle = style
        canvasCtx.fillRect(xpos,y, xdelta, 1);
    }    

}
function ffta_draw() {
    if (typeof canvasCtx == 'undefined')return
    // browser does not support canvas,no further drawing calls will be processed
    if (!bufferLength || !!_.disable){
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        return
    }
    dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    draw_specturm(dataArray);
    if (_.showFPS) {
        
        canvasCtx.font = "30px Consolas"
        canvasCtx.fillStyle = 'rgb(0,0,0)'
        canvasCtx.fillRect(20,20,30 * 10,30)
        canvasCtx.fillStyle = 'rgb(0,255,0)'
        canvasCtx.fillText(
            (1000 / (Date.now() - tickdelta)).toFixed(0).toString() + ' FPS    ', 20, 50
        )
    }
    xdelta = WIDTH * ((Date.now() - tickdelta) / seq_time)
    tickdelta = Date.now()
    requestAnimationFrame(ffta_draw);
}
