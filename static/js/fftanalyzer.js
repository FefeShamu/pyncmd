/*
    FFT Frequency bar view

    refernced:https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
*/
function ffta_init(analyserNode, canvasElement,w=300,h=150,spacing=2,ratio=1,fftSize=256,FillStyle=['rgb(0, 123, 255)','rgb(127,127,127)']) {
    fillStyle = FillStyle
    WIDTH = w;HEIGHT = h
    SPACING = spacing
    RATIO = ratio
    canvasElement.width = w;canvasElement.height = h
    canvasCtx = canvasElement.getContext('2d')
    analyser = analyserNode
    analyser.fftSize = fftSize;
    bufferLength = analyser.frequencyBinCount;
    max = []
}

function ffta_draw() {
    requestAnimationFrame(ffta_draw)
    if (!bufferLength) return
    var dataArray = new Uint8Array(bufferLength)

    canvasCtx.fillStyle = 'rgba(255,255,255,1)'
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

    analyser.getByteFrequencyData(dataArray)
    var barWidth = (WIDTH / (bufferLength)) * 2.5 - SPACING
    // subtract SPACING to compansate the spacing error
    var barHeight
    var x = 0


    for (var i = 0; i < bufferLength; i++) {
        barHeight = HEIGHT * (dataArray[i] / 255) * RATIO

        if (!max[i] || max[i] < barHeight) max[i] = barHeight

        canvasCtx.fillStyle = fillStyle[1]
        canvasCtx.fillRect(x, HEIGHT - max[i], barWidth, max[i])   
        canvasCtx.fillStyle = fillStyle[0]
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight)   
        x += barWidth + SPACING

    }

    ftta_offsetMaxThreshold(-1.2);

}

function ftta_offsetMaxThreshold(offset=-1){
    max = max.map((a)=>{return a + offset})
}
function ftta_resetMaxThreshold(){
    max = []
}
requestAnimationFrame(ffta_draw)