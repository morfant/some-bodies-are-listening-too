let audio, source, fft;
let started = false;

function setup() {
  createCanvas(960, 512);
  background(0);
  noStroke();

  audio = new Audio("https://locus.creacast.com:9443/jeju_georo.mp3");
  audio.crossOrigin = "anonymous";
  audio.loop = true;
  document.body.appendChild(audio); // 👈 Safari 필수일 수 있음

  let context = getAudioContext();
  source = context.createMediaElementSource(audio);
  source.connect(context.destination);

  fft = new p5.FFT();
  fft.setInput(source);
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
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      console.log("AudioContext resumed");
      audio.play();
      started = true;
    });
  } else if (!started) {
    audio.play();
    started = true;
  }
}