const firebaseConfig = {
  apiKey: "AIzaSyCw4lFuLxHUsF8h2MVBuM7QECa9wvYS8SY",
  authDomain: "healthcare-rover.firebaseapp.com",
  databaseURL: "https://healthcare-rover-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "healthcare-rover",
  storageBucket: "healthcare-rover.firebasestorage.app",
  messagingSenderId: "354299452401",
  appId: "1:354299452401:web:da84c408a9a3b779960250",
  measurementId: "G-H365T5ZB7Y"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const state = {
  battery: 82,
  temperature: 36.8,
  heartRate: 76,
  spo2: 98,
  frontDistance: 650,
  leftDistance: 480,
  rightDistance: 520,
  humanDetected: false,
  mode: "STANDBY",
  lastCommand: "NONE"
};

function $(id) {
  return document.getElementById(id);
}

function showPage(pageId) {
  var pages = document.querySelectorAll(".page");
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.remove("active");
  }

  var target = $(pageId);
  if (target) {
    target.classList.add("active");
  }

  var navButtons = document.querySelectorAll(".nav");
  for (var j = 0; j < navButtons.length; j++) {
    navButtons[j].classList.toggle("active", navButtons[j].getAttribute("data-page") === pageId);
  }

  window.scrollTo(0, 0);
}

function updateUI() {
  $("battery").textContent = Math.round(state.battery) + "%";
  $("temperature").textContent = state.temperature.toFixed(1) + " °C";
  $("heartRate").textContent = Math.round(state.heartRate) + " BPM";
  $("spo2").textContent = Math.round(state.spo2) + "%";

  $("healthTemperature").textContent = state.temperature.toFixed(1) + " °C";
  $("healthHeartRate").textContent = Math.round(state.heartRate) + " BPM";
  $("healthSpo2").textContent = Math.round(state.spo2) + "%";
  $("fingerPresent").textContent = "YES";

  $("mode").textContent = state.mode;
  $("humanDetected").textContent = state.humanDetected ? "YES" : "NO";
  $("frontDistance").textContent = Math.round(state.frontDistance) + " mm";
  $("leftDistance").textContent = Math.round(state.leftDistance) + " mm";
  $("rightDistance").textContent = Math.round(state.rightDistance) + " mm";
  $("videoHuman").textContent = "Human detected: " + (state.humanDetected ? "YES" : "NO");
  $("lastUpdated").textContent = "Updated " + new Date().toLocaleTimeString();
}

function addAlert(text, type) {
  var item = document.createElement("div");
  item.className = "alert " + (type || "info");

  var left = document.createElement("span");
  left.textContent = text;

  var right = document.createElement("span");
  right.textContent = new Date().toLocaleTimeString();

  item.appendChild(left);
  item.appendChild(right);
  $("alertList").insertBefore(item, $("alertList").firstChild);
}

function sendCommand(command) {
  state.lastCommand = command;

  if (command === "FORWARD" || command === "REVERSE" ||
      command === "LEFT" || command === "RIGHT" ||
      command.indexOf("CAMERA_") === 0) {
    if (command !== "CAMERA_LEFT" && command !== "CAMERA_CENTER" && command !== "CAMERA_RIGHT") {
      state.mode = "MANUAL";
    }
  }

  if (command === "FOLLOW") state.mode = "FOLLOW";
  if (command === "DOCK") state.mode = "DOCK";
  if (command === "STOP") state.mode = "STOP";

 if (command === "CALL_CAREGIVER") {

  addAlert(
    "Voice call requested",
    "info"
  );

  if ($("commandNote")) {

    $("commandNote").textContent =
      "📞 Calling caregiver...";

  }

  if ($("callStatus")) {

    $("callStatus").textContent =
      "CALLING...";

  }

  // Send the call request to Firebase
  if (db) {

    db.ref("communication/call").set({

      action: "CALL_CAREGIVER",

      status: "REQUESTED",

      timestamp: Date.now()

    })
    .then(function () {

      console.log(
        "Call request sent to Firebase"
      );

    })
    .catch(function (error) {

      console.error(
        "Call request failed:",
        error
      );

      if ($("callStatus")) {

        $("callStatus").textContent =
          "CALL FAILED";

      }
    });
  }

  // Do not let the generic command display
  // overwrite the CALLING status.
  if ($("controlNote")) {

    $("controlNote").textContent =
      "Voice call requested";

  }

  updateUI();

  return;
}

  if (command.indexOf("DISPENSE_") === 0) {
    var slot = command.split("_")[1];
    if ($("medicineNote")) {
      $("medicineNote").textContent =
        "Dispense command sent for Medicine " + slot +
        " (Compartment " + slot + ")";
    }
    addAlert("Medicine " + slot + " selected for dispensing", "ok");
  } else if (command === "FOLLOW") {
    addAlert("Patient-following mode enabled", "ok");
  } else if (command === "DOCK") {
    addAlert("Return-to-dock command sent", "info");
  } else if (command === "STOP") {
    addAlert("Emergency STOP command sent", "warn");
  } else if (command === "CAMERA_LEFT") {
    addAlert("Camera/rover direction: LEFT", "info");
  } else if (command === "CAMERA_CENTER") {
    addAlert("Camera/rover direction: CENTER", "info");
  } else if (command === "CAMERA_RIGHT") {
    addAlert("Camera/rover direction: RIGHT", "info");
  }

  if ($("commandNote")) $("commandNote").textContent = "Last command: " + command;
  if ($("controlNote")) $("controlNote").textContent = "Last command: " + command;

  updateUI();
  writeCommandToFirebase(command);
}

function simulateTelemetry() {
  state.battery -= 0.01;
  if (state.battery < 15) state.battery = 82;

  state.temperature = 36.7 + Math.random() * 0.3;
  state.heartRate = 72 + Math.random() * 10;
  state.spo2 = 97 + Math.random() * 2;
  state.frontDistance = 450 + Math.random() * 400;
  state.leftDistance = 300 + Math.random() * 400;
  state.rightDistance = 300 + Math.random() * 400;

  if (Math.random() < 0.15) {
    state.humanDetected = !state.humanDetected;
    if (state.humanDetected) addAlert("Human detected by demo camera", "ok");
  }

  updateUI();
}

document.addEventListener("DOMContentLoaded", function () {
  // Navigation buttons
  var navButtons = document.querySelectorAll(".nav");
  for (var i = 0; i < navButtons.length; i++) {
    navButtons[i].addEventListener("click", function () {
      showPage(this.getAttribute("data-page"));
    });
  }

  // Dashboard/back/home and other page navigation buttons
  var pageButtons = document.querySelectorAll("[data-page]");
  for (var p = 0; p < pageButtons.length; p++) {
    if (!pageButtons[p].classList.contains("nav")) {
      pageButtons[p].addEventListener("click", function () {
        showPage(this.getAttribute("data-page"));
      });
    }
  }

  // Command buttons
  var commandButtons = document.querySelectorAll("[data-command]");
  for (var c = 0; c < commandButtons.length; c++) {
    commandButtons[c].addEventListener("click", function () {
      sendCommand(this.getAttribute("data-command"));
    });
  }

  // Mode buttons
  var modeButtons = document.querySelectorAll(".mode");
  for (var m = 0; m < modeButtons.length; m++) {
    modeButtons[m].addEventListener("click", function () {
      for (var q = 0; q < modeButtons.length; q++) {
        modeButtons[q].classList.remove("active");
      }
      this.classList.add("active");
      sendCommand(this.getAttribute("data-command"));
    });
  }

  $("clearAlerts").addEventListener("click", function () {
    $("alertList").innerHTML = "";
  });

  $("saveSettings").addEventListener("click", function () {
    try {
      localStorage.setItem("healthroverId", $("roverId").value);
      localStorage.setItem("firebaseUrl", $("firebaseUrl").value);
      localStorage.setItem("demoMode", $("demoMode").value);
    } catch (e) {}
    addAlert("Settings saved", "ok");
  });

  updateUI();
  addAlert("HealthRover Stage 1 demo started", "info");

  setInterval(simulateTelemetry, 3000);
});
// Read live rover data from Firebase
db.ref("rover").on("value", function(snapshot) {
    const rover = snapshot.val();

    if (!rover) return;

    state.battery = rover.battery ?? state.battery;
    state.voltage = rover.voltage ?? state.voltage;
    state.mode = rover.mode ?? state.mode;
    state.humanDetected = rover.humanDetected ?? state.humanDetected;
    state.frontDistance = rover.frontDistance ?? state.frontDistance;
    state.leftDistance = rover.leftDistance ?? state.leftDistance;
    state.rightDistance = rover.rightDistance ?? state.rightDistance;
    state.online = rover.online ?? state.online;

    updateUI();
});
// Read live health data from Firebase
db.ref("health").on("value", function(snapshot) {
    const health = snapshot.val();

    if (!health) return;

    state.temperature = health.temperature ?? state.temperature;
    state.heartRate = health.heartRate ?? state.heartRate;
    state.spo2 = health.spo2 ?? state.spo2;
    state.fingerPresent = health.fingerPresent ?? state.fingerPresent;

    updateUI();
});
function writeCommandToFirebase(command) {
    if (!db) {
        console.log("Firebase database is not available");
        return;
    }

    const updates = {
        "commands/movement": "STOP",
        "commands/mode": state.mode,
        "commands/medicine": "NONE"
    };

    if (command === "FORWARD" ||
        command === "REVERSE" ||
        command === "LEFT" ||
        command === "RIGHT") {

        updates["commands/movement"] =
        command === "REVERSE" ? "BACKWARD" : command;

        updates["commands/mode"] = "MANUAL";

    } else if (command === "STOP") {

        updates["commands/movement"] = "STOP";
        updates["commands/mode"] = "STOP";

    } else if (command === "FOLLOW") {

        updates["commands/movement"] = "STOP";
        updates["commands/mode"] = "FOLLOW";

    } else if (command === "DOCK") {

        updates["commands/movement"] = "STOP";
        updates["commands/mode"] = "DOCK";

    } else if (command === "MANUAL") {

        updates["commands/mode"] = "MANUAL";

    } else if (command.startsWith("DISPENSE_")) {

        updates["commands/medicine"] =
       "MEDICINE:" + command.split("_")[1];

    } else if (command === "CALL_CAREGIVER") {

         updates["communication/call/action"] = "CALL_CAREGIVER";
         updates["communication/call/status"] = "REQUESTED";
         updates["communication/call/timestamp"] = Date.now();


    } else if (command === "CAMERA_LEFT" ||
               command === "CAMERA_CENTER" ||
               command === "CAMERA_RIGHT") {

        updates["commands/movement"] = command;
    }

    db.ref().update(updates)
        .then(function() {
            console.log("Command sent successfully:", command);
        })
        .catch(function(error) {
            console.error("Command failed:", error);
        });
}
// Read live medicine command from Firebase
db.ref("commands/medicine").on("value", function(snapshot) {
    const medicine = snapshot.val();

    if (!medicine) return;

    if (medicine.startsWith("DISPENSE_")) {
        const slot = medicine.split("_")[1];

        if ($("medicineNote")) {
            $("medicineNote").textContent =
                "Dispense command sent for Medicine " + slot +
                " (Compartment " + slot + ")";
        }

        if ($("commandNote")) {
            $("commandNote").textContent =
                "Last command: " + medicine;
        }
    }
});
// Register HealthRover service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("/service-worker.js")
      .then(function() {
        console.log("HealthRover service worker registered");
      })
      .catch(function(error) {
        console.error("Service worker registration failed:", error);
      });
  });
}
// Live Video controls
document.addEventListener("DOMContentLoaded", function() {

  const recordButton = document.getElementById("recordVideo");
  const snapshotButton = document.getElementById("snapshotVideo");
  const stopButton = document.getElementById("stopVideo");

  if (recordButton) {
    recordButton.addEventListener("click", function() {
      addAlert("Video recording started", "ok");
      if ($("commandNote")) {
        $("commandNote").textContent = "Video recording started";
      }
    });
  }

  if (snapshotButton) {
    snapshotButton.addEventListener("click", function() {
      addAlert("Snapshot requested", "info");
      if ($("commandNote")) {
        $("commandNote").textContent = "Snapshot requested";
      }
    });
  }

  if (stopButton) {
    stopButton.addEventListener("click", function() {
      addAlert("Video stream stopped", "warn");
      if ($("commandNote")) {
        $("commandNote").textContent = "Video stream stopped";
      }
    });
  }

});


// ======================================================

// // ======================================================
// HealthRover Voice Command System - Stable Browser Test
// ======================================================

let voiceRecognition = null;
let voiceListening = false;
let voiceStarting = false;
let voiceEnabled = false;
let voiceWakeDetected = false;
let voiceMode = "wake";
let voiceCommandTimer = null;
let callActive = false;


// ======================================================
// NORMALIZE SPEECH
// ======================================================

function normalizeVoiceText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


// ======================================================
// WAKE WORD DETECTION
// ======================================================

function isWakeWord(text) {

  const normalized = normalizeVoiceText(text);

  // Never wake from Rover's own spoken error message.
  if (
    normalized.includes("i did not recognize") ||
    normalized.includes("i did not recognise")
  ) {
    return false;
  }

  const wakePhrases = [
    "hey rover",
    "hey rober",
    "hey robert",
    "hey roger",
    "hey roar",
    "hey rovar",
    "hey rovor",

    "hi rover",
    "hi rober",
    "hi robert",

    "hair rover",
    "hair rober",
    "hair robert",
    "hair roger",
    "hair over",

    "her rover",
    "her rober",
    "her robert",
    "her over",

    "here rover",
    "here rober",
    "here robert",
    "here over",

    "hirover",
    "hirober",

    "hey rob",
    "hey robo",
    "hey robot",
    "hey bro"
  ];

  return wakePhrases.some(function (phrase) {
    return normalized === phrase ||
           normalized.includes(phrase);
  });
}


// ======================================================
// REMOVE WAKE WORD FROM A COMBINED SENTENCE
// ======================================================

function removeWakePhrase(text) {

  let result = normalizeVoiceText(text);

  const wakePhrases = [
    "hey rover",
    "hey rober",
    "hey robert",
    "hey roger",
    "hey roar",
    "hey rovar",
    "hey rovor",
    "hi rover",
    "hi rober",
    "hi robert",
    "hair rover",
    "hair rober",
    "hair robert",
    "hair roger",
    "hair over",
    "her rover",
    "her rober",
    "her robert",
    "her over",
    "here rover",
    "here rober",
    "here robert",
    "here over",
    "hirover",
    "hirober",
    "hey rob",
    "hey robo",
    "hey robot",
    "hey bro"
  ];

  wakePhrases.sort(function (a, b) {
    return b.length - a.length;
  });

  wakePhrases.forEach(function (phrase) {

    const escaped =
      phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    result = result.replace(
      new RegExp("\\b" + escaped + "\\b", "g"),
      " "
    );
  });

  return normalizeVoiceText(result);
}


// ======================================================
// STOP CURRENT RECOGNITION
// ======================================================

function stopVoiceRecognition() {

  clearTimeout(voiceCommandTimer);

  voiceStarting = false;
  voiceListening = false;

  if (voiceRecognition) {
    try {
      voiceRecognition.onend = null;
      voiceRecognition.onerror = null;
      voiceRecognition.onresult = null;
      voiceRecognition.onstart = null;
      voiceRecognition.stop();
    } catch (e) {}

    voiceRecognition = null;
  }
}


// ======================================================
// CREATE ONE RECOGNITION SESSION
// ======================================================

function createVoiceRecognition(mode) {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    addAlert(
      "Voice recognition is not supported by this browser",
      "warn"
    );

    return null;
  }

  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-IN";
  recognition.maxAlternatives = 3;


  recognition.onstart = function () {

    if (voiceRecognition !== recognition) {
      return;
    }

    voiceStarting = false;
    voiceListening = true;
    voiceMode = mode;

    console.log(
      "Voice recognition started:",
      mode
    );

    if ($("commandNote")) {

      $("commandNote").textContent =
        mode === "wake"
          ? "Listening for Hey Rover..."
          : "Listening for your command...";
    }
  };


  recognition.onresult = function (event) {

    if (voiceRecognition !== recognition) {
      return;
    }

    let result = "";

    try {

      result =
        event.results[event.results.length - 1][0]
          .transcript || "";

    } catch (e) {

      result = "";
    }

    const text = normalizeVoiceText(result);

    if (!text) {
      return;
    }

    console.log("Voice heard:", text);
    console.log("Processing voice:", text);

    processVoiceCommand(text);
  };


  recognition.onerror = function (event) {

    if (voiceRecognition !== recognition) {
      return;
    }

    voiceStarting = false;
    voiceListening = false;

    console.error(
      "Voice recognition error:",
      event.error
    );

    if (event.error === "not-allowed") {

      addAlert(
        "Microphone permission was denied",
        "warn"
      );

    } else if (event.error === "network") {

      addAlert(
        "Voice recognition network error. Press Voice Commands to try again.",
        "warn"
      );

    } else if (
      event.error !== "no-speech" &&
      event.error !== "aborted"
    ) {

      addAlert(
        "Voice recognition error: " +
        event.error,
        "warn"
      );
    }
  };


  recognition.onend = function () {

    if (voiceRecognition !== recognition) {
      return;
    }

    voiceStarting = false;
    voiceListening = false;

    console.log(
      "Voice recognition ended:",
      mode
    );
  };


  return recognition;
}


// ======================================================
// START A NEW RECOGNITION SESSION
// ======================================================

function startVoiceSession(mode) {

  if (!voiceEnabled || callActive) {
    return;
  }

  if (voiceStarting || voiceListening) {
    console.log(
      "Voice recognition already active."
    );
    return;
  }

  clearTimeout(voiceCommandTimer);

  const recognition =
    createVoiceRecognition(mode);

  if (!recognition) {
    return;
  }

  voiceRecognition = recognition;
  voiceStarting = true;

  try {

    recognition.start();

  } catch (e) {

    voiceStarting = false;
    voiceListening = false;

    console.log(
      "Voice recognition could not start:",
      e.message
    );
  }
}


// ======================================================
// START VOICE COMMAND SYSTEM
// ======================================================

function startVoiceRecognition() {

  if (callActive) {

    addAlert(
      "Voice commands are disabled during the active call",
      "info"
    );

    return;
  }

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    addAlert(
      "Voice recognition is not supported by this browser",
      "warn"
    );

    return;
  }

  voiceEnabled = true;
  voiceWakeDetected = false;

  stopVoiceRecognition();

  addAlert(
    "Voice commands enabled",
    "ok"
  );

  startVoiceSession("wake");
}


// ======================================================
// PROCESS VOICE COMMAND
// ======================================================

function processVoiceCommand(text) {

  const normalized =
    normalizeVoiceText(text);

  if (!normalized) {
    return;
  }

  if (callActive) {

    console.log(
      "Voice command ignored during active call"
    );

    return;
  }


  // ====================================================
  // WAKE + COMMAND IN SAME SENTENCE
  // ====================================================

  if (isWakeWord(normalized)) {

    console.log(
      "WAKE WORD DETECTED:",
      normalized
    );

    const remaining =
      removeWakePhrase(normalized);

    voiceWakeDetected = true;

    addAlert(
      "Hey Rover detected",
      "ok"
    );

    if ($("commandNote")) {

      $("commandNote").textContent =
        "Hey Rover detected";
    }

    if (remaining.length > 0) {

      handleCommand(remaining);

    } else {

      speakResponse("Yes?");
    }

    return;
  }


  // ====================================================
  // WAIT FOR COMMAND AFTER WAKE WORD
  // ====================================================

  if (voiceWakeDetected) {

    voiceWakeDetected = false;

    handleCommand(normalized);

    return;
  }
}


// ======================================================
// HANDLE ACTUAL COMMAND
// ======================================================

function handleCommand(text) {

  const normalized =
    normalizeVoiceText(text);


  // ---------------- FOLLOW ----------------

  if (
    normalized.includes("come here") ||
    normalized.includes("follow me") ||
    normalized.includes("follow patient") ||
    normalized.includes("come to me")
  ) {

    sendCommand("FOLLOW");

    speakResponse(
      "Following mode activated"
    );

    return;
  }


  // ---------------- DOCK ----------------

  if (
    normalized.includes("go home") ||
    normalized.includes("go to dock") ||
    normalized.includes("return to dock") ||
    normalized.includes("go back to dock")
  ) {

    sendCommand("DOCK");

    speakResponse(
      "Returning to charging dock"
    );

    return;
  }


  // ---------------- STOP ----------------

  if (
    normalized === "stop" ||
    normalized.includes("stop rover") ||
    normalized.includes("emergency stop")
  ) {

    sendCommand("STOP");

    speakResponse(
      "Rover stopped"
    );

    return;
  }


  // ---------------- FORWARD ----------------

  if (
    normalized === "forward" ||
    normalized.includes("move forward")
  ) {

    sendCommand("FORWARD");

    speakResponse(
      "Moving forward"
    );

    return;
  }


  // ---------------- BACKWARD ----------------

  if (
    normalized === "backward" ||
    normalized === "back" ||
    normalized.includes("move backward")
  ) {

    sendCommand("REVERSE");

    speakResponse(
      "Moving backward"
    );

    return;
  }


  // ---------------- LEFT ----------------

  if (
    normalized === "left" ||
    normalized.includes("turn left")
  ) {

    sendCommand("LEFT");

    speakResponse(
      "Turning left"
    );

    return;
  }


  // ---------------- RIGHT ----------------

  if (
    normalized === "right" ||
    normalized.includes("turn right")
  ) {

    sendCommand("RIGHT");

    speakResponse(
      "Turning right"
    );

    return;
  }


  // ---------------- MORNING MEDICINE ----------------

  if (
    normalized.includes("morning medicine") ||
    normalized.includes("morning dose") ||
    normalized.includes("medicine after breakfast") ||
    normalized.includes("medicine in the morning")
  ) {

    requestMedicine(
      1,
      "morning"
    );

    return;
  }


  // ---------------- AFTERNOON MEDICINE ----------------

  if (
    normalized.includes("afternoon medicine") ||
    normalized.includes("afternoon dose") ||
    normalized.includes("medicine in the afternoon") ||
    normalized.includes("medicine for afternoon")
  ) {

    requestMedicine(
      2,
      "afternoon"
    );

    return;
  }


  // ---------------- NIGHT MEDICINE ----------------

  if (
    normalized.includes("night medicine") ||
    normalized.includes("night dose") ||
    normalized.includes("medicine after dinner") ||
    normalized.includes("medicine at night")
  ) {

    requestMedicine(
      3,
      "night"
    );

    return;
  }


  // ---------------- CALL SON ----------------

  if (
    normalized.includes("call my son")
  ) {

    requestVoiceCall("son");

    return;
  }


  // ---------------- CALL DAUGHTER ----------------

  if (
    normalized.includes("call my daughter")
  ) {

    requestVoiceCall("daughter");

    return;
  }


  // ---------------- CALL CAREGIVER ----------------

  if (
    normalized.includes("call caregiver")
  ) {

    requestVoiceCall("caregiver");

    return;
  }


  // ---------------- UNKNOWN ----------------

  console.log(
    "Unknown voice command:",
    normalized
  );

  if ($("commandNote")) {

    $("commandNote").textContent =
      "Command not recognized: " +
      normalized;
  }

  addAlert(
    "Command not recognized: " +
    normalized,
    "warn"
  );

  // IMPORTANT:
  // Do not speak an unknown-command response.
  // This prevents the browser microphone from
  // hearing Rover's own voice.
}


// ======================================================
// MEDICINE REQUEST
// ======================================================

function requestMedicine(
  slot,
  timeName
) {

  const command =
    "DISPENSE_" + slot;

  addAlert(
    "Voice request: " +
    timeName +
    " medicine → Compartment " +
    slot,
    "ok"
  );

  if ($("medicineNote")) {

    $("medicineNote").textContent =
      timeName +
      " medicine requested — Compartment " +
      slot;
  }

  if ($("commandNote")) {

    $("commandNote").textContent =
      "Dispensing " +
      timeName +
      " medicine";
  }

  sendCommand(command);

  speakResponse(
    timeName +
    " medicine is being dispensed"
  );
}


// ======================================================
// PHONE CALL REQUEST
// ======================================================

function requestVoiceCall(person) {

  addAlert(
    "Voice call requested: " +
    person,
    "info"
  );

  if ($("commandNote")) {

    $("commandNote").textContent =
      "Call requested: " +
      person;
  }

  speakResponse(
    "Call request sent for " +
    person
  );

  // The physical SIM7670G cellular call
  // will be connected later.
}


// ======================================================
// VOICE RESPONSE
// ======================================================

function speakResponse(message) {

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  // Stop recognition while Rover speaks.
  if (voiceRecognition) {

    try {
      voiceRecognition.stop();
    } catch (e) {}
  }

  voiceListening = false;
  voiceStarting = false;

  if ($("commandNote")) {

    $("commandNote").textContent =
      "Rover: " + message;
  }

  try {

    window.speechSynthesis.cancel();

    const speech =
      new SpeechSynthesisUtterance(message);

    speech.lang = "en-IN";
    speech.rate = 0.95;
    speech.pitch = 1.0;
    speech.volume = 1.0;

    speech.onend = function () {

      if (!voiceEnabled) {
        return;
      }

      if (callActive) {
        return;
      }

      // Wait for Chrome to finish the
      // previous recognition session.
      setTimeout(function () {

        if (!voiceEnabled) {
          return;
        }

        if (callActive) {
          return;
        }

        if (
          voiceListening ||
          voiceStarting
        ) {
          console.log(
            "Recognition already active."
          );
          return;
        }

        startVoiceSession(
          voiceWakeDetected
            ? "command"
            : "wake"
        );

        // Give the patient 10 seconds
        // after Rover's response.
        if (voiceWakeDetected) {

          clearTimeout(
            voiceCommandTimer
          );

          voiceCommandTimer =
            setTimeout(function () {

              voiceWakeDetected = false;

            }, 10000);
        }

      }, 2000);
    };

    window.speechSynthesis.speak(
      speech
    );

  } catch (e) {

    console.error(
      "Speech response failed:",
      e
    );
  }
}


// ======================================================
// CALL STATE LOCKOUT
// ======================================================

function setCallActive(active) {

  callActive =
    Boolean(active);

  if (callActive) {

    voiceWakeDetected = false;
    voiceEnabled = false;

    clearTimeout(
      voiceCommandTimer
    );

    stopVoiceRecognition();

    if ($("commandNote")) {

      $("commandNote").textContent =
        "Voice commands disabled during active call";
    }

    addAlert(
      "Voice commands disabled during active call",
      "info"
    );

  } else {

    if ($("commandNote")) {

      $("commandNote").textContent =
        "Voice commands ready";
    }

    addAlert(
      "Voice commands ready",
      "ok"
    );
  }
}


// ======================================================
// VOICE COMMAND BUTTON
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const voiceButton =
      document.getElementById(
        "startVoice"
      );

    if (!voiceButton) {
      return;
    }

    voiceButton.addEventListener(
      "click",
      function () {

        console.log(
          "Voice Commands button pressed"
        );

        startVoiceRecognition();
      }
    );
  }
);

// ======================================================
// VOICE CALL STATUS
// ======================================================

db.ref("communication/call").on("value", function(snapshot) {

  const call = snapshot.val();

  if (!call) {
    return;
  }

  const status =
    call.status || "READY";

  if ($("callStatus")) {

    if (status === "REQUESTED") {

      $("callStatus").textContent =
        "Call: CALLING...";

    } else if (status === "ACTIVE") {

      $("callStatus").textContent =
        "Call: ACTIVE";

    } else if (status === "ENDED") {

      $("callStatus").textContent =
        "Call: ENDED";

    } else {

      $("callStatus").textContent =
        "Call: " + status;
    }
  }

  // Keep voice commands disabled during active call.
  if (status === "ACTIVE") {

    setCallActive(true);

  } else {

    setCallActive(false);
  }

});
// ======================================================
// PUSH-TO-TALK MICROPHONE TEST
// ======================================================

let pttStream = null;
let pttRecorder = null;

async function startPushToTalk() {

  const button = $("pushToTalk");
  const status = $("pttStatus");

  try {

    pttStream =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });

    pttRecorder =
      new MediaRecorder(pttStream);

    pttRecorder.start();

    // Write PTT state to Firebase
    if (db) {

      db.ref("communication/ptt").set({

        active: true,

        speaker: "CAREGIVER",

        timestamp: Date.now()

      })
      .then(function () {

        console.log(
          "PTT Firebase: CAREGIVER ACTIVE"
        );

      })
      .catch(function (error) {

        console.error(
          "PTT Firebase write failed:",
          error
        );

      });
    }

    if (button) {
      button.classList.add("active");
    }

    if ($("pttStatus")) {

      $("pttStatus").textContent =
        "🔊 CAREGIVER SPEAKING";
    }

    if (status) {

      status.textContent =
        "🎙 Listening — release to stop";
    }

    addAlert(
      "Push-to-Talk microphone ON",
      "ok"
    );

  } catch (error) {

    console.error(
      "Microphone access failed:",
      error
    );

    if (status) {

      status.textContent =
        "Microphone permission required";
    }

    addAlert(
      "Microphone access was denied or unavailable",
      "warn"
    );
  }
}


function stopPushToTalk() {

  // Write inactive state to Firebase
  if (db) {

    db.ref("communication/ptt").set({

      active: false,

      speaker: "NONE",

      timestamp: Date.now()

    })
    .then(function () {

      console.log(
        "PTT Firebase: INACTIVE"
      );

    })
    .catch(function (error) {

      console.error(
        "PTT Firebase write failed:",
        error
      );

    });
  }

  const button = $("pushToTalk");
  const status = $("pttStatus");

  if (
    pttRecorder &&
    pttRecorder.state !== "inactive"
  ) {

    try {
      pttRecorder.stop();
    } catch (e) {}
  }

  if (pttStream) {

    pttStream
      .getTracks()
      .forEach(function (track) {

        track.stop();

      });
  }

  pttStream = null;
  pttRecorder = null;

  if (button) {

    button.classList.remove("active");
  }

  if ($("pttStatus")) {

    $("pttStatus").textContent =
      "Push to Talk ready";
  }

  if (status) {

    status.textContent =
      "Push to Talk ready";
  }

  addAlert(
    "Push-to-Talk microphone OFF",
    "info"
  );
}


// ======================================================
// PTT BUTTON EVENTS
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const button =
      $("pushToTalk");

    if (!button) {

      console.log(
        "PTT button not found"
      );

      return;
    }


    // Mouse

    button.addEventListener(
      "mousedown",
      function (event) {

        event.preventDefault();

        startPushToTalk();

      }
    );


    button.addEventListener(
      "mouseup",
      function (event) {

        event.preventDefault();

        stopPushToTalk();

      }
    );


    button.addEventListener(
      "mouseleave",
      function () {

        if (pttStream) {

          stopPushToTalk();

        }
      }
    );


    // Touch / Android

    button.addEventListener(
      "touchstart",
      function (event) {

        event.preventDefault();

        startPushToTalk();

      },
      {
        passive: false
      }
    );


    button.addEventListener(
      "touchend",
      function (event) {

        event.preventDefault();

        stopPushToTalk();

      },
      {
        passive: false
      }
    );


    button.addEventListener(
      "touchcancel",
      function (event) {

        event.preventDefault();

        stopPushToTalk();

      },
      {
        passive: false
      }
    );


    console.log(
      "PTT button connected"
    );
  }
);