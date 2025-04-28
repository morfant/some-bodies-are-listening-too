// ✅ 전체 코드: graphPoints 방식으로 상단 파란선 추가! 

let audio, mic, fft, source;
let spectrum = [];
let cnt = 0;
let bands = 1024;
let points = [];
let radius = [];
let started = false;
let visualizeMul;
let bgColor = 0;
let fps = 30;
let visualizeMode = 0;
let useMicInput = false;
let micAmp = 0.1;

let graphPointUpdateInterval = 20;
let startTime;
let lastMessageFrame = -1000;
let lastMessageX = null;
let currentMessage = "";

let firstMessageDelaySeconds = 30; // ✨ 첫 문장은 30초 후 등장
let messageIntervalSeconds = 10;
let messagePrintFrames = 20;
let sentences = [];
let sentenceIndex = 0;
let jitterAngle = 0;
let isInRange = false;

let koreanFont, englishFont;
let graphPoints = []; // 🆕 파란 선 점들을 담는 배열


function preload() {
  sentences = loadStrings("sentences.txt?" + millis());
  koreanFont = loadFont("fonts/AppleMyungjo.ttf");
  englishFont = loadFont("fonts/Times New Roman.ttf");
}

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
      let context = getAudioContext();
      let micSource = context.createMediaStreamSource(mic.stream);
      let micGain = context.createGain();
      micGain.gain.value = micAmp;
      micSource.connect(micGain);
      fft.setInput(micGain);
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
    getAudioContext().resume().then(() => { if (!started) startAudio(); });
  } else if (!started) {
    startAudio();
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

function startAudio() {
  background(bgColor);
  if (!useMicInput) {
    audio.volume = 0;
    audio.play();
    fadeInAudio(8000);
  }
  started = true;
  startTime = new Date();
}

function fadeInAudio(durationMillis = 3000) {
  let steps = 30;
  let stepTime = durationMillis / steps;
  let currentStep = 0;

  let fadeInterval = setInterval(() => {
    currentStep++;
    let vol = currentStep / steps;
    audio.volume = constrain(vol, 0, 1);
    if (currentStep >= steps) clearInterval(fadeInterval);
  }, stepTime);
}

function draw() {
  cursor(ARROW);

  if (!started) {
    drawStartScreen();
    return;
  }

  if (cnt === 0) startTime = new Date();

  spectrum = fft.analyze();

  if (visualizeMode === 0) {
    drawGraphPoints();
    drawMainVisualization();
    updateGraphPoints(graphPointUpdateInterval);
    drawCurrentMessage();

    if (cnt >= width) {
      background(bgColor, 20);
      cnt = 0;
    }
  }
}

function drawStartScreen() {
  background(bgColor);
  fill(255);
  textAlign(CENTER, CENTER);

  textSize(24);
  let nowStr = getFormattedKoreanTime();
  text(nowStr, width/2, height/2 - 40);

  textSize(28);
  let liveText = "Live...";
  let textW = textWidth(liveText);
  let boxW = textW + 40;
  let boxH = 42;
  let boxX = width/2 - boxW/2;
  let boxY = height/2;

  stroke(255);
  noFill();
  rect(boxX, boxY, boxW, boxH, 16);

  fill(255);
  text(liveText, width/2, boxY + boxH/2 + 3);

  if (mouseX > boxX && mouseX < boxX+boxW && mouseY > boxY && mouseY < boxY+boxH) {
    cursor(HAND);
  }
}

function drawMainVisualization() {
  push();
  translate(0, -23);

  for (let i = 0; i < bands; i++) {
    noStroke();
    fill(255);
    let y = height - i;
    let x = constrain(width - cnt, 0, width);
    let valMapped = spectrum[i] * visualizeMul * i * random(2);
    ellipse(x, y, valMapped * 0.000001, valMapped * 0.000001);
  }

  pop();

  let maxIdx = maxIndex(spectrum);
  points[cnt] = maxIdx;
  radius[cnt] = map(spectrum[maxIdx], 0, 255, 0, 1);
  cnt++;
}

// function updateGraphPoints(interval = 1) {
//   if (frameCount % interval !== 0) return; // ✨ interval 프레임마다만 추가!

//   let waveform = fft.waveform();
//   let sampleIndex = Math.floor(waveform.length / 2);
//   let sample = waveform[sampleIndex];

//   let gx = frameCount % (width + 1);
//   let gy = map(sample, -1, 1, height * 0.02, height * 0.8);

//   graphPoints.push({x: gx, y: gy - height*0.4});

//   if (graphPoints.length > width) {
//     graphPoints.shift();
//   }
// }

function updateGraphPoints(interval = 1) {
  if (frameCount % interval !== 0) return;

  let waveform = fft.waveform();
  let sampleIndex = Math.floor(waveform.length / 2);
  let sample = waveform[sampleIndex];

  let gx = cnt % width; // ✨ cnt 기준으로
  let gy = map(sample, -1, 1, height * 0.02, height * 0.8);
  gy -= height * 0.4;

  // ✨ 텍스트 인력 효과
  let attractPower = 8000; // 인력 크기 설정
  let attractRange = 40; // 인력 작용 범위
  let d = abs(gx - lastMessageX);

  if (d < attractRange && lastMessageX != null) {
    isInRange = true;
    let force = attractPower / (d + 10); // 거리 가까울수록 세게
    gy += force; // 위로 끌어당긴다 (반대로 force를 더하면 아래로 밀림)
  } else {
    isInRange = false;
  }


  if (gx != 0) graphPoints.push({x: gx, y: gy});

  if (graphPoints.length > width) {
    graphPoints.shift();
  }
}


function drawGraphPoints() {
  // stroke(0, 100, 200, 10);

  let rad = 2;
  if (!isInRange) { fill(0, 100, 200, 5); rad = 2;
  } else { fill(0, 100, 200, 10); rad = 2;}

  // strokeWeight(0.5);
  noStroke();
  // noFill();
  // beginShape();
  for (let pt of graphPoints) {
    // vertex(pt.x, pt.y);
    ellipse(pt.x, pt.y, rad, rad);
  }
  // endShape();
}

function drawCurrentMessage() {
  let elapsedSeconds = (millis() / 1000);

  if (sentenceIndex === 0) {
    if (elapsedSeconds >= firstMessageDelaySeconds && currentMessage === "") {
      currentMessage = sentences[sentenceIndex];
      lastMessageFrame = frameCount;
      lastMessageX = width - cnt;
      sentenceIndex = (sentenceIndex + 1) % sentences.length;
      jitterAngle = radians(random(-3, 3));
    }
  } else {
    let intervalFrames = fps * messageIntervalSeconds;
    if ((frameCount - lastMessageFrame) >= intervalFrames && sentences.length > 0) {
      currentMessage = sentences[sentenceIndex];
      lastMessageFrame = frameCount;
      lastMessageX = width - cnt;
      sentenceIndex = (sentenceIndex + 1) % sentences.length;
      jitterAngle = radians(random(-3, 3));
    }
  }

  if (frameCount - lastMessageFrame < messagePrintFrames) {
    push();
    translate(lastMessageX, height-22);
    rotate(-HALF_PI + jitterAngle);
    textFont(/[ㄱ-ㆎ|가-힣]/.test(currentMessage) ? koreanFont : englishFont);
    fill(0, 0, 0, constrain((frameCount-lastMessageFrame)/messagePrintFrames * 255, 0, 255));
    noStroke();
    textSize(24);
    textAlign(LEFT, CENTER);
    text(currentMessage, 0, 0);
    pop();
  }
}

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

function getFormattedKoreanTime() {
  let now = new Date();
  now.setUTCHours(now.getUTCHours() + 9);
  return `UTC+9 ${now.getUTCFullYear()}-${nf(now.getUTCMonth()+1,2)}-${nf(now.getUTCDate(),2)} ${nf(now.getUTCHours(),2)}:${nf(now.getUTCMinutes(),2)}:${nf(now.getUTCSeconds(),2)}`;
}