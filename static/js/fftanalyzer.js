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
    peak = [{
        'val': 0,
        'vel': 0
    }];
}

function clamp(val, max, min) {
    return (val > max ? max : val) < min ? min : val > max ? max : val;
}

bufferLength = 0;
tick = Date.now();
function ffta_draw() {
    var tickdelta = (Date.now() - tick).toString()
    tick = Date.now()

    requestAnimationFrame(ffta_draw);
    if (!bufferLength) return;
    var dataArray = new Uint8Array(bufferLength);
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    analyser.getByteFrequencyData(dataArray);
    var barWidth = WIDTH / bufferLength * 2.5 - _.spacing; // subtract SPACING to compansate the spacing error

    var barHeight;
    var x = 0;

    for (var i = 0; i < bufferLength; i++) {
        var barHeight = HEIGHT * (dataArray[i] / 255) * _.ratio;
        if (!peak[i]) peak[i] = {
            'val': 0,
            'vel': 0
        };

        if (!peak[i].val || peak[i].val < barHeight && barHeight != 0) {
            peak[i].vel = (barHeight - peak[i].val) * _.force;
            peak[i].val = barHeight;
        } // reset force once peak was reached    

        peak[i].vel = clamp(peak[i].vel, 2, -5); // linear accleation curve within range of (-5,2) with step of 0.1
        peak[i].vel -= 0.1;
        peak[i].val = peak[i].val + peak[i].vel
        // apply velocity
        if (!_.noPeaks) {
            canvasCtx.fillStyle = _.fillstyle[1];
            var thresholdBarHeight = peak[i].val + 5;
            canvasCtx.fillRect(x, HEIGHT - thresholdBarHeight, barWidth, thresholdBarHeight);
        }
        canvasCtx.fillStyle = _.fillstyle[0];
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth + _.spacing; // drawing the bars
    }

    if (_.showFPS) {
        canvasCtx.fillStyle = 'rgb(255,255,0)'
        canvasCtx.font = "30px Arial"
        canvasCtx.fillText(
            (1000 / tickdelta).toFixed(0).toString() + ' FPS', 10, 50
        )
    }
}

requestAnimationFrame(ffta_draw);