// Audio detection module

class AudioDetector {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.stream = null;
        this.threshold = 30;
        this.holdTime = 150;
        this.isSpeaking = false;
        this.speakingTimeout = null;
        this.animationFrame = null;
        this.onLevelChange = null;
        this.onSpeakingChange = null;
    }

    async getDevices() {
        try {
            // Request permission first
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(d => d.kind === 'audioinput');
        } catch (error) {
            console.error('Failed to get audio devices:', error);
            return [];
        }
    }

    async start(deviceId = null) {
        try {
            // Stop any existing stream
            this.stop();

            const constraints = {
                audio: deviceId ? { deviceId: { exact: deviceId } } : true
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;

            this.microphone = this.audioContext.createMediaStreamSource(this.stream);
            this.microphone.connect(this.analyser);

            this.monitor();
            console.log('Audio detection started');
            return true;
        } catch (error) {
            console.error('Failed to start audio detection:', error);
            return false;
        }
    }

    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.microphone = null;
        this.analyser = null;
    }

    monitor() {
        if (!this.analyser) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const check = () => {
            if (!this.analyser) return;

            this.analyser.getByteFrequencyData(dataArray);

            // Calculate RMS level
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const level = Math.min(100, (rms / 128) * 100);

            if (this.onLevelChange) {
                this.onLevelChange(level);
            }

            // Check speaking threshold
            const speaking = level > this.threshold;

            if (speaking && !this.isSpeaking) {
                this.isSpeaking = true;
                if (this.speakingTimeout) {
                    clearTimeout(this.speakingTimeout);
                    this.speakingTimeout = null;
                }
                this.notifySpeakingChange(true);
            } else if (!speaking && this.isSpeaking) {
                if (!this.speakingTimeout) {
                    this.speakingTimeout = setTimeout(() => {
                        this.isSpeaking = false;
                        this.speakingTimeout = null;
                        this.notifySpeakingChange(false);
                    }, this.holdTime);
                }
            }

            this.animationFrame = requestAnimationFrame(check);
        };

        check();
    }

    notifySpeakingChange(speaking) {
        if (this.onSpeakingChange) {
            this.onSpeakingChange(speaking);
        }
        require('electron').ipcRenderer.invoke('set-speaking', speaking);
    }

    setThreshold(value) {
        this.threshold = value;
    }

    setHoldTime(value) {
        this.holdTime = value;
    }
}
window.audioDetector = new AudioDetector();
