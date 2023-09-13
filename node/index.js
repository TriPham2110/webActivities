const path = require('path');
const fs = require('fs');
const portfinder = require('portfinder');
const activeWin = require('active-win');
const WebSocket = require('ws');
var intervalId;
var previousAppName = '';
let chromeExtensionSocket = null;

portfinder.setBasePort(4000);    // default: 8000
portfinder.setHighestPort(65535); // default: 65535

portfinder.getPortPromise()
    .then((port) => {
        const user_dir = String.raw`C:\Users\thien\Desktop\test-script`;

        // Start the first interval
	    intervalId = setTimeout(checkAppSwitch, 500);

        const wss = new WebSocket.Server({ port });
        wss.on('connection', (ws) => {
            console.log('Server is running on found free port: ' + port);
            console.log('Make sure to also update base port in extension popup page to ' + port + ' if they are not matched.');
            
            chromeExtensionSocket = ws;
            chromeExtensionSocket.on('message', (message) => {
                if (typeof message !== 'string') {
                    message = message.toString('utf8');
                }
                // console.log('Received:', message);
                let urlResult = JSON.parse(message);
                let file = path.join(user_dir, 'webData');
                let data = JSON.stringify(urlResult, undefined, 4);
        
                if (fs.existsSync(file)) {
                    if (fs.readFileSync(file).length === 0) {
                        fs.writeFileSync(file, data);
                    } else {
                        let oldData = JSON.parse(fs.readFileSync(file, 'utf-8'));
                        let newData = oldData.concat(urlResult);
                        newData = Array.from(new Set(newData.map(JSON.stringify))).map(JSON.parse);
                        fs.writeFileSync(file, JSON.stringify(newData, undefined, 4));
                    }
                } else {
                    fs.writeFileSync(file, data, (err) => {
                        if (err) throw err;
                    });
                }
            });
        
            chromeExtensionSocket.send('Hello from Node folder/server!');
        });
    })
    .catch((err) => {
        console.log(err);
    });

const checkAppSwitch = async () => {
    try {
    const activeApp = await activeWin();
    // console.log(activeApp);

    if (activeApp && activeApp.owner && activeApp.owner.name) {
        const currentAppName = activeApp.owner.name.toLowerCase();
        // console.log(currentAppName);

        if(currentAppName !== "windows explorer"){ // special case for windows
            if (previousAppName.includes('code') && currentAppName.includes('chrome')) {
                // Send message to client
                if(chromeExtensionSocket) {
                    chromeExtensionSocket.send('Switched from VS Code to Chrome');
                }
            }
            previousAppName = currentAppName;
        }
    }

    // Set the next interval after processing the current one
    intervalId = setTimeout(checkAppSwitch, 500);
    } catch (error) {
        console.error('Error occurred while checking for app switch:', error);
        intervalId = setTimeout(checkAppSwitch, 500);
    }
};