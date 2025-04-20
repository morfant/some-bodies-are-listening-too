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

let lastMessageFrame = -1000;
let lastMessageX = null;
let currentMessage = "";
let messageIntervalSeconds = 10;  // 간격을 초 단위로
let messagePrintFrames = 20;
let sentences = [];
let sentenceIndex = 28;


let koreanFont, englishFont
function preload() {
  // 텍스트 파일을 줄 단위 배열로 로딩
  sentences = loadStrings("sentences.txt");
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

function fadeInAudio(durationMillis = 3000) {
  let steps = 30;  // 몇 단계로 나눠서 증가할지
  let stepTime = durationMillis / steps;
  let currentStep = 0;

  let fadeInterval = setInterval(() => {
    currentStep++;
    let vol = currentStep / steps;
    audio.volume = constrain(vol, 0, 1);

    if (currentStep >= steps) {
      clearInterval(fadeInterval);
    }
  }, stepTime);
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
    audio.volume = 0;   // 처음엔 소리를 0으로 시작하고
    audio.play();       // 재생 후
    fadeInAudio(8000);  // 3초간 페이드인
  }
  started = true;
  startTime = new Date();
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
  cursor(ARROW);  // 항상 시작할 때 커서를 기본값으로 리셋

  if (!started) {
    background(bgColor);
    fill(255);
    textAlign(CENTER, CENTER);
  
    // 현재 시간
    textSize(24);
    let nowStr = getFormattedKoreanTime();
    text(nowStr, width / 2, height / 2 - 40);
    text(nowStr, width / 2, height / 2 - 40); // 두껍게 보이도록 두 번
  
    // "Live..." 버튼
    let liveText = "Live...";
    textSize(28);
    let textW = textWidth(liveText);
    let paddingX = 20;
    let paddingY = 10;
    let boxW = textW + paddingX * 2;
    let boxH = 42;
  
    let boxX = width / 2 - boxW / 2;
    let boxY = height / 2;
  
    // 박스 (라운드 사각형)
    stroke(255);
    noFill();  // 약간 투명한 박스
    rect(boxX, boxY, boxW, boxH, 16);  // radius 16
  
    // 텍스트
    fill(255);
    textAlign(CENTER, CENTER);
    text(liveText, width / 2, boxY + boxH / 2 + 3);  // 👈 약간 아래로 보정

  
    // 커서 처리
    if (
      mouseX > boxX &&
      mouseX < boxX + boxW &&
      mouseY > boxY &&
      mouseY < boxY + boxH
    ) {
      cursor(HAND);
    } else {
      cursor(ARROW);
    }
  
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


    // 간격에 따라 새로운 문장 선택
    let intervalFrames = fps * messageIntervalSeconds;
    if (frameCount % intervalFrames === 0 && sentences.length > 0) {
      currentMessage = sentences[sentenceIndex];
      lastMessageFrame = frameCount;
      lastMessageX = width - cnt;

      // 다음 인덱스로 이동 (배열 끝나면 다시 0부터)
      sentenceIndex = (sentenceIndex + 1) % sentences.length;
    }

    if (frameCount - lastMessageFrame < messagePrintFrames) {
      push();
      translate(lastMessageX, height - 22);
      rotate(-HALF_PI);
    
      let isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(currentMessage);
      textFont(isKorean ? koreanFont : englishFont);
    
      let fadeRatio = (frameCount - lastMessageFrame) / messagePrintFrames;
      let alphaValue = constrain(fadeRatio * 255, 0, 255);  // 0에서 255까지 증가
    
      fill(0, 0, 0, alphaValue);  // 반투명 검정
      noStroke();
      textSize(24);
      textAlign(LEFT, CENTER);
      text(currentMessage, 0, 0);
      pop();
    }

    if (cnt >= width) {

      background(bgColor, 20);

      // // 화면 상단 파란줄
      beginShape(TRIANGLE_STRIP);
      // print(points.length); // same as width

      for (let i = 0; i < points.length; i++) {
        stroke(0, 100, 200, 140);
        // strokeWeight(radius[i] * 90);
        strokeWeight(6);

        if (random() > 0.9) {
          // strokeWeight(radius[i] * 90);
          strokeWeight(6);
          vertex(i, points[i] * 0.5);
        }

      }
      endShape();




      // 🎯 현재 시각과 예측 시각 표시
      // fill(bgColor);
      // strokeWeight(1);
      // stroke(255);
      // rect(0, height - 20, width, 20);

      // strokeWeight(1);
      // noStroke();
      // fill(255);
      // textSize(16);

      // let nowStr = getFormattedKoreanTime();
      // let predictedStr = getPredictedTimeAfterCycle(startTime);

      // textAlign(RIGHT, BOTTOM);
      // text(nowStr, width - 10, height - 1);

      // textAlign(LEFT, BOTTOM);
      // text(predictedStr, 10, height - 1);


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