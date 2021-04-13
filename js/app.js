URL = window.URL || window.webkitURL;

let gumStream; //stream from getUserMedia()
let rec; //Recorder.js object
let input; //MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb.
let AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext; //audio context to help us record

let recordButton = document.getElementById("recordButton");
let stopButton = document.getElementById("stopButton");
let pauseButton = document.getElementById("pauseButton");

// add events to those 2 buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);

let recording = false;

let groundTruth = {};
let startTime = new Date().getTime();

function startRecording() {
  console.log("recordButton clicked");

  /*
      Simple constraints object, for more advanced audio features see
      https://addpipe.com/blog/audio-constraints-getusermedia/
  */

  let constraints = { audio: true, video: false };

  /*
     Disable the record button until we get a success or fail from getUserMedia()
 */

  recordButton.disabled = true;
  stopButton.disabled = false;
  pauseButton.disabled = false;

  /*
      We're using the standard promise based getUserMedia()
      https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  */

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      console.log(
        "getUserMedia() success, stream created, initializing Recorder.js ..."
      );

      /*
        create an audio context after getUserMedia is called
        sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
        the sampleRate defaults to the one set in your OS for your playback device

    */
      audioContext = new AudioContext();

      //update the format
      document.getElementById("formats").innerHTML =
        "Format: 1 channel pcm @ " + audioContext.sampleRate / 1000 + "kHz";

      /*  assign to gumStream for later use  */
      gumStream = stream;

      /* use the stream */
      input = audioContext.createMediaStreamSource(stream);

      /*
        Create the Recorder object and configure to record mono sound (1 channel)
        Recording 2 channels  will double the file size
    */
      rec = new Recorder(input, { numChannels: 1 });

      //start the recording process
      rec.record();
      recording = true;

      console.log("Recording started");
    })
    .catch(function (err) {
      //enable the record button if getUserMedia() fails
      recordButton.disabled = false;
      stopButton.disabled = true;
      pauseButton.disabled = true;
    });
}

function pauseRecording() {
  console.log("pauseButton clicked rec.recording=", rec.recording);
  if (rec.recording) {
    // pause
    recording = false;
    rec.stop();
    pauseButton.innerHTML = "Resume";
  } else {
    // resume
    recording = true;
    rec.record();
    pauseButton.innerHTML = "Pause";
  }
}

function stopRecording() {
  console.log("stopButton clicked");

  // disable the stop button, enable the record too allow for new recordings
  stopButton.disabled = true;
  recordButton.disabled = false;
  pauseButton.disabled = true;

  // reset button just in case the recording is stopped while paused
  pauseButton.innerHTML = "Pause";

  // tell the recorder to stop the recording
  recording = false;
  rec.stop();

  // stop microphone access
  gumStream.getAudioTracks()[0].stop();

  // create the wav blob and pass it on to createDownloadLink
  rec.exportWAV(createDownloadLink);
}

function createDownloadLink(blob) {
  let url = URL.createObjectURL(blob);
  let au = document.createElement("audio");
  let li = document.createElement("li");
  let link = document.createElement("a");
  let labelsLink = document.createElement("a");

  // name of .wav file to use during upload and download (without extension)
  let filename = getCurrentTimeStamp();

  // add controls to the <audio> element
  au.controls = true;
  au.src = url;

  // save to disk link
  link.href = url;
  link.download = filename + ".wav"; // download forces the browser to download the file using the  filename
  link.innerHTML = "Save audio";

  // ground truth labels link
  let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(groundTruth));
  labelsLink.href = dataStr;
  labelsLink.download = filename + ".json"; // download forces the browser to download the file using the  filename
  labelsLink.innerHTML = "Save labels";

  // add the new audio element to li
  li.appendChild(au);

  // add the filename to the li
  li.appendChild(document.createTextNode(filename + ".wav"));

  // add the save audio link to li
  li.appendChild(link);

  // add the save labels link to li
  li.appendChild(labelsLink);

  // add the li element to the ol
  recordingsList.appendChild(li);
}

// returns a timestamp for file naming
function getCurrentTimeStamp() {
  let d = new Date();

  // d.getMonth() is 0-indexed
  let ts = [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];
  return ts.join("-");
}

// record key presses
window.onkeydown = function (e) {
  // ignore any key presses when audio is not recording
  if (recording === false) {
    console.log("audio is not recording.");
    return;
  }

  let key = e.key;
  if (key === " ") {
    key = "Space";
  }

  let currTime = new Date().getTime() - startTime;
  console.log("currTime " + currTime);
  groundTruth[currTime] = key;

  let textArea = document.getElementById("textArea");
  textArea.value = textArea.value + key;
};

