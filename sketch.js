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

let graphPointUpdateInterval = 1;
let startTime;
let lastMessageFrame = -1000;
let lastMessageX = null;
let currentMessage = "";

let firstMessageDelaySeconds = 30; // ✨ 첫 문장은 30초 후 등장
let messageIntervalSeconds = 10;
let messagePrintFrames = 30;
let sentences = [];
let sentenceIndex = 0;
let jitterAngle = 0;
let isInRange = false;
let loopCount = 0;

let koreanFont, englishFont, englishFont2, englishFont3;
let graphPoints = []; // 🆕 파란 선 점들을 담는 배열


let fadeOutCounter = 0;

// let fpsPerLoop = 0;
// let maxLoopCount = 0;
// let pointsPerLoop = 0;
// let maxPointsLength = 0;


function preload() {
  sentences = loadStrings("sentences.txt?" + millis());
  koreanFont = loadFont("fonts/AppleMyungjo.ttf");
  englishFont = loadFont("fonts/Times New Roman.ttf");
  englishFont2 = loadFont("fonts/NotoSansKR-Thin.otf");
  // englishFont3 = loadFont("fonts/NotoSansDisplay-VariableFont_wdth,wght.ttf");
}

function setup() {
  createCanvas(1280, 512);
  background(bgColor);
  noStroke();
  frameRate(fps);

  visualizeMul = width;
  fft = new p5.FFT(0.9, bands);

  // fpsPerLoop = width;
  // maxLoopCount = sentences.length * fps * messageIntervalSeconds / fpsPerLoop;
  // pointsPerLoop = fpsPerLoop / graphPointUpdateInterval; 
  // maxPointsLength = maxLoopCount * pointsPerLoop;

  graphPoints.push({x: 0, y: 6});


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

    // ✨ Gain 노드 1: 청취용
    let gainOut = context.createGain();
    gainOut.gain.value = 1.0;
    source.connect(gainOut);
    gainOut.connect(context.destination);

    // ✨ Gain 노드 2: 분석용
    let gainFFT = context.createGain();
    gainFFT.gain.value = 0.8;
    source.connect(gainFFT);
    fft.setInput(gainFFT);
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
    drawMainVisualization();
    updateGraphPoints(graphPointUpdateInterval);
    drawGraphPoints();
    drawCurrentMessage();

    if (cnt >= width) {
      fadeOutCounter = 30;  // ✨ 30프레임에 걸쳐 점진적으로 배경 지우기 시작
      cnt = 0;
      loopCount++;
    }

    if (fadeOutCounter > 0) {
      background(bgColor, 2/3);  // ✨ alpha 2/3씩 누적
      fadeOutCounter--;
    }
  }
}

function drawStartScreen() {
  background(bgColor);
  fill(255);
  textAlign(CENTER, CENTER);
  strokeWeight(0.1);

  textFont(englishFont);
  textSize(30);
  let workTitle = "Some-bodies are listening, too";
  text(workTitle, width/2, height/2 - 220);

  textFont(englishFont2);
  textSize(22);
  let nowStr = getFormattedKoreanTime();
  text(nowStr, width/2, height/2 + 40);

  textSize(24);
  let liveText = "Live";
  let textW = textWidth(liveText);
  let boxW = textW + 40;
  let boxH = 42;
  let boxX = width/2 - boxW/2;
  let boxY = height/2 + 100;

  stroke(255);
  strokeWeight(2);
  noFill();
  rect(boxX, boxY, boxW, boxH, 20);

  strokeWeight(0.1);
  fill(255);
  text(liveText, width/2, boxY + boxH/4 + 5);

  if (mouseX > boxX && mouseX < boxX+boxW && mouseY > boxY && mouseY < boxY+boxH) {
    cursor(HAND);
  }

  strokeWeight(0.3);
  textSize(18);
  let browserText = "* This site works only on desktop versions of Firefox and Chrome";
  text(browserText, width/2, height/2 + 230);
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

function updateGraphPoints(interval = 1) {
  if (frameCount % interval !== 0) return; // ✨ interval 프레임마다만 추가!

  // midpoint
  // let waveform = fft.waveform();
  // let sampleIndex = Math.floor(waveform.length / 2);
  // let sample = waveform[sampleIndex];

  // average
  // let waveform = fft.waveform();
  // let sample = waveform.reduce((a, b) => a + b, 0) / waveform.length;

  // peak
  let waveform = fft.waveform();
  let sample = waveform.reduce((max, val) => (val > max ? val : max), -Infinity);

  let gx = frameCount % (width + 1) + random(-1, 1);
  let sampleScaled = map(abs(sample), 0, 1, 0, height * 1);
  let gy = sampleScaled; 
  let adjustedY = gy; 
  // let adjustedY = gy + (loopCount * 10);

  // print("sample: ", sample, " gx: ", gx, " gy: ", gy);
  graphPoints.push({x: gx, y: adjustedY});

  if (graphPoints.length > 2) {
    graphPoints.shift();
  }
}

function drawGraphPoints() {

  let rad = 1;

  fill(0, 100, 200, 10);
  stroke(0, 200, 200, 20);

  for (let pt of graphPoints) {
    strokeWeight(0.1);
    ellipse(pt.x, pt.y, pt.y * rad, pt.y * rad);
    // strokeWeight(1);
    // line(pt.x, pt.y, pt.x + pt.y * 10, pt.y + pt.y * 10);
  }

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
    textSize(25);
    textAlign(LEFT, CENTER);
    text(currentMessage, 0, 0);
    pop();
  }
  // print("sentenceIndex: ", sentenceIndex);
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