/*
    FFT Frequency bar view

    refernced:https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
*/
function ffta_init(analyserNode, canvasElement, w, h, settings) {
    WIDTH = w;
    HEIGHT = h;
    canvasElement.width = w;
    canvasElement.height = h;
    fillStyle = settings.fillstyle;
    SPACING = settings.spacing;
    RATIO = settings.ratio;
    FORCE = settings.force;
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

function ffta_draw() {
    requestAnimationFrame(ffta_draw);
    if (!!!bufferLength) return;
    var dataArray = new Uint8Array(bufferLength);
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    analyser.getByteFrequencyData(dataArray);
    var barWidth = WIDTH / bufferLength * 2.5 - SPACING; // subtract SPACING to compansate the spacing error

    var barHeight;
    var x = 0;

    for (var i = 0; i < bufferLength; i++) {
        var barHeight = HEIGHT * (dataArray[i] / 255) * RATIO;
        if (!peak[i]) peak[i] = {
            'val': 0,
            'vel': 0
        };

        if (!peak[i].val || peak[i].val < barHeight && barHeight != 0) {
            peak[i].vel = (barHeight - peak[i].val) * FORCE;
            peak[i].val = barHeight;
        } // reset force once peak was reached            


        peak[i].vel -= 0.1;
        peak[i].vel = clamp(peak[i].vel, 5, -5); // linear accleation curve within range of (-5,5) with step of 0.1

        canvasCtx.fillStyle = fillStyle[1];
        var thresholdBarHeight = peak[i].val + 5;
        canvasCtx.fillRect(x, HEIGHT - thresholdBarHeight, barWidth, thresholdBarHeight);
        canvasCtx.fillStyle = fillStyle[0];
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth + SPACING; // drawing the bars
    }

    ftta_applyForce();
}

function ftta_applyForce() {
    peak = peak.map(function (a) {
        return {
            'val': a.val + a.vel,
            'vel': a.vel
        };
    });
}

requestAnimationFrame(ffta_draw);