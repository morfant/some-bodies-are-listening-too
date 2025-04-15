let soundFile, fft;
let started = false;

function preload() {
  soundFile = loadSound("https://locus.creacast.com:9443/jeju_georo.mp3");
}

function setup() {
  createCanvas(960, 512);
  fft = new p5.FFT(0.9, 1024);
  fft.setInput(soundFile);
  background(0);
  noStroke();
}

function draw() {
  if (!started) {
    background(0);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("Click to start", width / 2, height / 2);
    return;
  }

  let spectrum = fft.analyze();
  background(0, 20);
  fill(255);
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, width);
    let h = map(spectrum[i], 0, 255, 0, height);
    ellipse(x, height - h, 2, 2);
  }

  if (frameCount % 60 === 0) {
    console.log("spectrum[0]:", spectrum[0]);
  }
}

function mousePressed() {
  if (!started) {
    userStartAudio(); // Safari 대응
    soundFile.loop(); // stream처럼 반복 재생
    started = true;
  }
}