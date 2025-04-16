let audio;
let mic;
let fft;
let spectrum = [];
let cnt = 0;
let bands = 1024;
let points = [];
let radius = [];
let source;
let started = false;
let visualizeMul;
let bgColor = 0;
let fps = 30;

let visualizeMode = 0;
let useMicInput = false;
let startTime; // 사이클 시작 시각

function setup() {
  createCanvas(1280, 512);
  background(bgColor);
  noStroke();
  frameRate(fps);

  visualizeMul = width;
  fft = new p5.FFT(0.9, bands);

  if (useMicInput) {
    mic = new p5.AudioIn();
    mic.start(() => {
      fft.setInput(mic);
      console.log("Mic input started");
    });
  } else {
    audio = new Audio("https://locus.creacast.com:9443/jeju_georo.mp3");
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    document.body.appendChild(audio);

    let context = getAudioContext();
    source = context.createMediaElementSource(audio);
    fft.setInput(source);
    source.connect(context.destination);
  }
}

function mousePressed() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      console.log('AudioContext resumed');
      if (!started) startAudio();
    });
  } else if (!started) {
    startAudio();
  }
}

function touchStarted() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      if (!started) startAudio();
    });
  } else if (!started) {
    startAudio();
  }
  return false;
}

function startAudio() {
  background(bgColor);
  if (!useMicInput) {
    audio.play();
  }
  started = true;
  startTime = new Date(); // 첫 사이클 시작 시각 저장
}

function keyPressed() {
  if (key === "v" || key === "V") {
    background(bgColor);
    visualizeMode = (visualizeMode + 1) % 2;
    console.log("Switched to mode:", visualizeMode);
  }
}

function getFormattedKoreanTime() {
  let now = new Date();
  now.setUTCHours(now.getUTCHours() + 9);

  let y = now.getUTCFullYear();
  let m = nf(now.getUTCMonth() + 1, 2);
  let d = nf(now.getUTCDate(), 2);
  let h = nf(now.getUTCHours(), 2);
  let min = nf(now.getUTCMinutes(), 2);
  let s = nf(now.getUTCSeconds(), 2);

  return `UTC+9 ${y}-${m}-${d} ${h}:${min}:${s}`;
}

function getPredictedTimeAfterCycle(startTime) {
  let now = new Date(); // 현재 시각 기준
  let secondsToAdd = width / fps;
  let predicted = new Date(now.getTime() + secondsToAdd * 1000);
  predicted.setUTCHours(predicted.getUTCHours() + 9);

  let y = predicted.getUTCFullYear();
  let m = nf(predicted.getUTCMonth() + 1, 2);
  let d = nf(predicted.getUTCDate(), 2);
  let h = nf(predicted.getUTCHours(), 2);
  let min = nf(predicted.getUTCMinutes(), 2);
  let s = nf(predicted.getUTCSeconds(), 2);

  return `UTC+9 ${y}-${m}-${d} ${h}:${min}:${s}`;
}

function draw() {
  if (!started) {
    background(bgColor);
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Click to start", width / 2, height / 2);
    return;
  }

  if (cnt === 0) {
    startTime = new Date(); // 새 사이클 시작 시각 저장
  }

  spectrum = fft.analyze();
  if (visualizeMode === 0) {
    push();
    translate(0, -23); // bottom margin
    strokeWeight(1);
    for (let i = 0; i < bands; i++) {
      noStroke();
      fill(255);
      let y = height - i;
      let x = constrain(width - cnt, 0, width);
      let val = spectrum[i];
      let valMapped = val * visualizeMul * i * random(2);
      ellipse(x, y, valMapped * 0.000001, valMapped * 0.000001);
    }
    pop();

    let maxIdx = maxIndex(spectrum);
    points[cnt] = maxIdx;
    radius[cnt] = map(spectrum[maxIdx], 0, 255, 0, 1); // 스펙트럼 중 가장 큰값을 0~255 사이로 두고, 그것을 0~1로 스케일링
    cnt++;



    if (cnt >= width) {
      background(bgColor, 20);
      beginShape(TRIANGLE_STRIP);
      // print(points.length); // same as width

      for (let i = 0; i < points.length; i++) {
        stroke(0, 100, 200, 140);
        strokeWeight(radius[i] * 90);
        // strokeWeight(1);

        if (random() > 0.9) {
          strokeWeight(radius[i] * 90);
          vertex(i, points[i] * 0.5);
        }

      }
      endShape();



      // 🎯 현재 시각과 예측 시각 표시
      fill(bgColor);
      strokeWeight(1);
      stroke(255);
      rect(0, height - 20, width, 20);

      strokeWeight(1);
      noStroke();
      fill(255);
      textSize(16);

      let nowStr = getFormattedKoreanTime();
      let predictedStr = getPredictedTimeAfterCycle(startTime);

      textAlign(RIGHT, BOTTOM);
      text(nowStr, width - 10, height - 1);

      textAlign(LEFT, BOTTOM);
      text(predictedStr, 10, height - 1);

      cnt = 0;
    }
  }
}

// Looking forward the index that points the max value.
// 값이 가장 큰 요소의 인덱스를 찾는다
function maxIndex(arr) {
  let maxVal = arr[0];
  let idx = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > maxVal) {
      maxVal = arr[i];
      idx = i;
    }
  }
  return idx;
}