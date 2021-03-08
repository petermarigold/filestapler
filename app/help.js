const path = require('path');
const { BrowserWindow } = require('electron');
const Positioner = require('electron-positioner');

class AboutWindow {
    constructor() {
        let htmlPath = `file://${__dirname}/help.html`;

        this.window = new BrowserWindow({
            show: false,
            width: 600,
            height: 600,
            backgroundColor: 'white',
            webPreferences: {
                devTools: false
            }
        })

        this.window.webContents.openDevTools();
        this.window.loadURL(htmlPath);

        this.window.on('blur', () => {
            this.window.hide();
        });

        // this.window.on('close', (event) => {
        //     event.preventDefault();
        //     this.window.hide();
        // })

        this.window.on('show', () => {
            let positioner = new Positioner(this.window);
            positioner.move('center');
        });
    }
}

module.exports = AboutWindow;