function ffta_init(analyserNode, canvas) {
    canvasCtx = canvas.getContext('2d')
    analyser = analyserNode
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    WIDTH   = 300
    HEIGHT  = canvas.getBoundingClientRect().height
}

function draw() {
    drawVisual = requestAnimationFrame(draw);

    var dataArray = new Uint8Array(bufferLength);
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    analyser.getByteFrequencyData(dataArray);

    var barWidth = (WIDTH / bufferLength) * 2;
    var barHeight;
    var x = 0;

    for (var i = 0; i < bufferLength; i++) {
        barHeight = HEIGHT * (dataArray[i] / 255) * 0.8

        canvasCtx.fillStyle = 'rgb(0, 123, 255)';
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}
draw()