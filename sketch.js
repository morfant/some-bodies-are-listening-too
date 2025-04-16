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

let visualizeMode = 0; // 0: processing style, 1: bar
let useMicInput = false; // 🔄 기본은 마이크 입력

function setup() {
  createCanvas(960, 512);
  background(0);
  noStroke();
  frameRate(30);

  visualizeMul = width;

  fft = new p5.FFT(0.9, bands);

  if (useMicInput) {
    mic = new p5.AudioIn();
    mic.start(() => {
      fft.setInput(mic); // 🎤 마이크 연결
      console.log("Mic input started");
    });
  } else {
    // 오디오 스트림
    audio = new Audio("https://locus.creacast.com:9443/jeju_georo.mp3");
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    document.body.appendChild(audio); // ← Safari workaround

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
    if (!started) {
        startAudio();
    }
    });
} else if (!started) {
    startAudio();
}
}

function touchStarted() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      if (!started) {
        startAudio();
      }
    });
  } else if (!started) {
    startAudio();
  }
  return false;
}


function startAudio() {
background(0);
if (!useMicInput) {
    audio.play();
}
started = true;
}

function keyPressed() {
  if (key === "v" || key === "V") {
    background(0); // 모드 전환 시 화면 초기화
    visualizeMode = (visualizeMode + 1) % 2;
    console.log("Switched to mode:", visualizeMode);
  }
}

function draw() {
  if (!started) {
    background(0);
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Click to start", width / 2, height / 2);
    return;
  }

  spectrum = fft.analyze();

  if (frameCount % 60 === 0) {
    console.log("spectrum[0]:", spectrum[0]);
  }

  if (visualizeMode === 1) {
    // 🎧 bar 스타일
    background(0, 20);
    fill(255);
    for (let i = 0; i < spectrum.length; i++) {
      let x = map(i, 0, bands, 0, width);
      let h = map(spectrum[i], 0, 255, 0, height);
      ellipse(x, height - h, 2, 2);
    }
  } else if (visualizeMode === 0) {
    // 💫 Processing 스타일 (ellipse + 트레일)
    // background(0, 20);
    push();
    translate(0, -23);
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
    radius[cnt] = map(spectrum[maxIdx], 0, 255, 0, 1);

    cnt++;

    if (cnt >= width) {
      background(0, 20);

      beginShape(TRIANGLE_STRIP);
      for (let i = 0; i < points.length; i++) {
        stroke(0, 100, 200, 140);
        strokeWeight(radius[i] * 90);

        if (random() > 0.9) {
          strokeWeight(radius[i] * 90);
          vertex(i, points[i] * 0.5);
        }
      }
      endShape();
      cnt = 0;
    }
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
