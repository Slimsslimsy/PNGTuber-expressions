const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

class OverlayServer {
    constructor(config) {
        this.config = config;
        this.app = express();
        this.server = null;
        this.wss = null;
        this.clients = new Set();
        this.currentState = null;
    }

    start(port = 7474) {
        return new Promise((resolve, reject) => {
            this.app.use('/assets', express.static(this.config.getAssetsDir()));
            this.app.use('/overlay', express.static(path.join(__dirname, '..', 'overlay')));

            this.app.get('/overlay', (req, res) => {
                res.sendFile(path.join(__dirname, '..', 'overlay', 'index.html'));
            });

            this.app.get('/api/current', (req, res) => {
                res.json({
                    state: this.currentState,
                    transition: this.config.get('defaultTransition'),
                    duration: this.config.get('transitionDuration')
                });
            });

            this.server = http.createServer(this.app);

            this.wss = new WebSocket.Server({ server: this.server });

            this.wss.on('connection', (ws) => {
                console.log('OBS client connected');
                this.clients.add(ws);

                if (this.currentState) {
                    ws.send(JSON.stringify({
                        type: 'state',
                        data: this.currentState,
                        transition: this.config.get('defaultTransition'),
                        duration: this.config.get('transitionDuration')
                    }));
                }

                ws.on('close', () => {
                    console.log('OBS client disconnected');
                    this.clients.delete(ws);
                });

                ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.clients.delete(ws);
                });
            });

            this.server.listen(port, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Overlay server running at http://localhost:${port}/overlay`);
                    resolve(port);
                }
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.wss) {
                this.clients.forEach(client => client.close());
                this.wss.close();
            }
            if (this.server) {
                this.server.close(() => {
                    console.log('Overlay server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    broadcastState(state) {
        this.currentState = state;
        const message = JSON.stringify({
            type: 'state',
            data: state,
            transition: this.config.get('defaultTransition'),
            duration: this.config.get('transitionDuration')
        });

        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    getUrl(port) {
        return `http://localhost:${port}/overlay`;
    }
}

module.exports = OverlayServer;
