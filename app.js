import { Player } from "./player.js";
import { Recorder } from "./recorder.js";

let webSocket;
let localStream;
let audioRecorder;
let audioPlayer;

let isStreaming = false;
let isConnected = false;
let accountId = "";

const micButton = document.getElementById("micButton");

window.setAccountId = function (id) {
  accountId = id;

  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    sendSessionUpdate();
  }
};


// Initialize WebSocket
function connectWebSocket() {
  const wsUrl = "YOUR WEB SOCKET";
  webSocket = new WebSocket(wsUrl);

  webSocket.onopen = () => {
    isConnected = true;
    updateMicButton();
    console.log("WebSocket connected");
    sendSessionUpdate();
  };

  webSocket.onmessage = (event) => {
    handleWebSocketMessage(event.data);
  };

  webSocket.onerror = (error) => {
    isConnected = false;
    updateMicButton();
    console.error("WebSocket Error:", error);
  };

  webSocket.onclose = () => {
    isConnected = false;
    updateMicButton();
    console.log("WebSocket closed");
  };
}

// Update mic button styling
function updateMicButton() {
  if (!isConnected) {
    micButton.style.backgroundColor = "red";
  } else if (isStreaming) {
    micButton.style.backgroundColor = "blue";
  } else {
    micButton.style.backgroundColor = "green";
  }

  micButton.innerHTML = isStreaming
    ? `<i class="fa-solid fa-stop"></i>`
    : `<i class="fa-solid fa-microphone"></i>`;
}

// Send session initialization to WebSocket
function sendSessionUpdate() {
  const sessionUpdate = {
    type: "init",
    session: {
      account_id: accountId,
      phone_number: generateRandomPhoneNumber(),
    },
  };
  webSocket.send(JSON.stringify(sessionUpdate));
}

// Generate a random phone number
function generateRandomPhoneNumber() {
  return (Math.floor(Math.random() * 9000000000) + 1000000000).toString();
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
  if (typeof data === "string") {
    try {
      const message = JSON.parse(data);
      console.log("Received JSON message:", message);

      if (message.type === "control" && message.action === "speech_started") {
        audioPlayer.clear();
      } else if (message.type === "text_delta") {
        console.log("Text Delta:", message.delta);
      }
    } catch (error) {
      console.error("Error parsing JSON WebSocket message:", error);
    }
  } else if (data instanceof Blob) {
    data.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      const pcmData = new Int16Array(bytes.buffer);
      audioPlayer.play(pcmData);
    });
  }
}

// Start streaming
async function startStreaming() {
  if (isStreaming) return;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, sampleRate: 24000 },
    });

    audioRecorder = new Recorder((data) => {
      if (isConnected) webSocket.send(data);
    });

    audioPlayer = new Player();
    audioPlayer.init(24000);

    audioRecorder.start(localStream);
    isStreaming = true;
    updateMicButton();
    console.log("Streaming started");
  } catch (error) {
    console.error("Error starting streaming:", error);
  }
}

// Stop streaming
function stopStreaming() {
  if (audioRecorder) audioRecorder.stop();
  if (audioPlayer) audioPlayer.clear();
  if (localStream) {
    const tracks = localStream.getTracks();
    tracks.forEach((track) => track.stop());
  }

  isStreaming = false;
  updateMicButton();
  console.log("Streaming stopped");
}

// Toggle mic button functionality
micButton.addEventListener("click", async () => {
  if (isStreaming) {
    stopStreaming();
  } else {
    if (!isConnected) connectWebSocket();
    await startStreaming();
  }
});

connectWebSocket();
