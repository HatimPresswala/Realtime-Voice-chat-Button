export class Player {
  playbackNode;
  constructor() {
    this.playbackNode = null;
  }

  async init(sampleRate) {
    try {
      const audioContext = new AudioContext({ sampleRate });
      await audioContext.audioWorklet.addModule("./playback-worklet.js");

      this.playbackNode = new AudioWorkletNode(audioContext, "playback-worklet");
      this.playbackNode.connect(audioContext.destination);
    } catch (error) {
      console.log(error);
    }
  }

  play(buffer) {
    if (this.playbackNode) {
      this.playbackNode.port.postMessage(buffer);
    }
  }

  clear() {
    if (this.playbackNode) {
      this.playbackNode.port.postMessage(null);
    }
  }
}
