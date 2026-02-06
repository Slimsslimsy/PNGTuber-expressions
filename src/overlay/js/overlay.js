// WebSocket connection
let ws = null;
let reconnectInterval = null;
let currentState = null;

const faceImage = document.getElementById('face-image');
const handsImage = document.getElementById('hands-image');

const serverUrl = window.location.origin.replace('http', 'ws');

function connect() {
    console.log('Connecting to WebSocket server...');

    ws = new WebSocket(serverUrl);

    ws.onopen = () => {
        console.log('Connected to overlay server');
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            if (message.type === 'state') {
                updateDisplay(message.data, message.transition, message.duration);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('Disconnected from overlay server');
        ws = null;

        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log('Attempting to reconnect...');
                connect();
            }, 5000);
        }
    };
}

function updateDisplay(state, transition = 'instant', duration = 300) {
    if (!state || !state.image) return;

    console.log('Updating display:', state.groupName, state.isSpeaking ? 'speaking' : 'idle');

    const newImage = `/assets/${state.image}`;


    if (faceImage.src.endsWith(state.image) && faceImage.style.display === 'block') {
        return;
    }

    if (transition === 'instant') {
        faceImage.src = newImage;
        faceImage.style.display = 'block';
        faceImage.className = '';
    } else {

        if (faceImage.style.display !== 'none') {
            faceImage.classList.add(`${transition}-out`);
            setTimeout(() => {
                faceImage.src = newImage;
                faceImage.className = `${transition}-in`;
                faceImage.style.display = 'block';
                setTimeout(() => {
                    faceImage.className = '';
                }, duration);
            }, duration);
        } else {
            faceImage.src = newImage;
            faceImage.style.display = 'block';
            faceImage.classList.add(`${transition}-in`);
            setTimeout(() => {
                faceImage.className = '';
            }, duration);
        }
    }

    handsImage.style.display = 'none';

    currentState = state;
}

async function fetchCurrentState() {
    try {
        const response = await fetch('/api/current');
        const data = await response.json();

        if (data.state) {
            updateDisplay(data.state, data.transition, data.duration);
        }
    } catch (error) {
        console.error('Failed to fetch current state:', error);
    }
}

connect();
fetchCurrentState();
