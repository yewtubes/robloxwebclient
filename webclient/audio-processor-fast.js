// Audio worklet placeholder: FMOD output runs as a silent device in this build.
class Silent extends AudioWorkletProcessor { process() { return true; } }
registerProcessor("audio-processor-fast", Silent);
