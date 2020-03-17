/*
    FFT Frequency bar view

    refernced:https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
*/
function ffta_init(analyserNode, canvasElement,w=300,h=150,spacing=2,ratio=1,fftSize=256,FillStyle=['rgb(0, 123, 255)','rgb(172,211,255)']) {
    fillStyle = FillStyle
    WIDTH = w;HEIGHT = h
    SPACING = spacing
    RATIO = ratio
    canvasElement.width = w;canvasElement.height = h
    canvasCtx = canvasElement.getContext('2d')
    analyser = analyserNode
    analyser.fftSize = fftSize;
    bufferLength = analyser.frequencyBinCount;
    peak = [{'val':0,'vel':0}]
}
bufferLength = 0
frameNo = 0
function ffta_draw() {
    requestAnimationFrame(ffta_draw)
    frameNo++
    if (bufferLength == 0) return
    var dataArray = new Uint8Array(bufferLength)

    
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)

    analyser.getByteFrequencyData(dataArray)
    var barWidth = (WIDTH / (bufferLength)) * 2.5 - SPACING
    // subtract SPACING to compansate the spacing error
    var barHeight
    var x = 0


    for (var i = 0; i < bufferLength; i++) {
        var barHeight = HEIGHT * (dataArray[i] / 255) * RATIO
        if (!peak[i]) peak[i] = {'val':0,'vel':0}
        if (!peak[i].val || (peak[i].val < barHeight && barHeight != 0)) {peak[i].vel = (barHeight - peak[i].val) >> 6; peak[i].val = barHeight}
        // reset force once peak was reached            
        peak[i].vel -= peak[i].vel > -5 ? 0.1 : 0        
        // linear accleation curve within range of (-5,0) with step of 0.1

        canvasCtx.fillStyle = fillStyle[1]
        var thresholdBarHeight = peak[i].val + 5   
        canvasCtx.fillRect(x, HEIGHT - thresholdBarHeight, barWidth, thresholdBarHeight)   
        canvasCtx.fillStyle = fillStyle[0]
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight)   
        x += barWidth + SPACING
        // drawing the bars
    }

    ftta_applyForce()
}

function ftta_applyForce(){
    peak = peak.map((a,i)=>{return {'val':a.val + a.vel,'vel':a.vel}})
}

requestAnimationFrame(ffta_draw)