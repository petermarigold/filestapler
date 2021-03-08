import { app, BrowserWindow, ipcMain, Menu , Notification, shell, screen, remote } from 'electron';
const Positioner = require('electron-positioner');
const filenamify = require('filenamify');
import moment from 'moment'
const storage = require('electron-json-storage');
const uuid = require('uuid');
const fs = require("fs");
const path = require('path');
const JSZip = require("jszip");
const rootDir = require('os').homedir()
const fileLocation = `${rootDir}/Desktop/Stapler_Zip_Files` 


import MenuBuilder from './menu';
// import AboutWindow from './about';

let mainWindow = null;
let aboutWindow = null;
let helpWindow = null;
let about = null;
let screenHeight = null;

import {
    FETCH_STAPLES_FROM_STORAGE,
    FETCH_STAPLES_FROM_STORAGE_HANDLER,
    CREATE_STAPLE_STORAGE,
    CREATE_STAPLE_STORAGE_HANDLER,
    UPDATE_STAPLE_LOCAL_STORAGE,
    DELETE_STAPLE_FROM_LOCAL_STORAGE,
    DELETE_LOCAL_STORAGE,
    DOWNLOAD_AS_ZIP_FILE,
    DOWNLOAD_AS_ZIP_FILE_HANDLER,
    SEND_MAIL,
    CHANGE_WINDOW_HEIGHT,
    MINIMIZE_WINDOW,
    SHOW_ABOUT_WINDOW,
    SHOW_HELP_WINDOW,
    HIDE_OR_SHOW_CLOSE_BUTTON
} from './utils/constants';


if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
  const p = path.join(__dirname, '..', 'app', 'node_modules');
  require('module').globalPaths.push(p);
}

const installExtensions = async () => {
    const installer = require('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

    return Promise.all(
        extensions.map(name => installer.default(installer[name], forceDownload))
    ).catch(console.log);
};


const createWindow = async () => {
    // about = new AboutWindow();

    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    screenHeight = height;

    if (
        process.env.NODE_ENV === 'development' ||
        process.env.DEBUG_PROD === 'true'
    ) {
        await installExtensions();
    }

    mainWindow = new BrowserWindow({
        title: "Stapler",
        // frame: false,
        // transparent: true,
        // titleBarStyle: 'customButtonsOnHover', 
        show: false,
        width: 275,
        height: 275
    });

    aboutWindow = new BrowserWindow({
        show: false,
        width: 600,
        height: 600,
        frame: true,
        parent: mainWindow,
        backgroundColor: 'white',
        webPreferences: {
            devTools: false
        }
    })

    helpWindow = new BrowserWindow({
        show: false,
        width: 600,
        height: 600,
        frame: true,
        parent: mainWindow,
        backgroundColor: 'white',
        webPreferences: {
            devTools: false
        }
    })

    mainWindow.loadURL(`file://${__dirname}/app.html`);
    aboutWindow.loadURL(`file://${__dirname}/about.html`); 
    helpWindow.loadURL(`file://${__dirname}/help.html`); 

    mainWindow.webContents.on('did-finish-load', () => {
        if (!mainWindow) {
            throw new Error('"mainWindow" is not defined');
        }
        if (process.env.START_MINIMIZED) {
            mainWindow.minimize();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });

    mainWindow.on('show', () => {
        let positioner = new Positioner(mainWindow);
        positioner.move('bottomRight');
    });
     
    aboutWindow.on('show', () => {
        let positioner = new Positioner(mainWindow);
        positioner.move('center');
    });

    helpWindow.on('show', () => {
        let positioner = new Positioner(mainWindow);
        positioner.move('center');
    });


    aboutWindow.on('close', (event) => {
        event.preventDefault();
        aboutWindow.hide();
   })
    
    aboutWindow.on('closed', () => {
        aboutWindow = null;
    });

    helpWindow.on('close', (event) => {
        event.preventDefault();
        helpWindow.hide();
    })

    helpWindow.on('closed', () => {
        helpWindow = null;
    });

    // const menuBuilder = new MenuBuilder(mainWindow);
    // menuBuilder.buildMenu();   
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// =========================================================== //
// ==================== hide button Window =================== //
// =========================================================== //
ipcMain.on(HIDE_OR_SHOW_CLOSE_BUTTON, (event, action) => {
    try {
        if(action === 'hide') { 
            mainWindow.setClosable(false);
        } else { 
            mainWindow.setClosable(true);
        } 
            
    } catch(error) { 
        console.log(error)
    }
});

// =========================================================== //
// ==================== Minimize Window==================== //
// =========================================================== //
ipcMain.on(MINIMIZE_WINDOW, () => {
    mainWindow.minimize();
});

// =========================================================== //
// ==================== Change wingoe Size==================== //
// =========================================================== //
ipcMain.on(CHANGE_WINDOW_HEIGHT, (event, scrollHeight) => {
    if(Number.isInteger(scrollHeight) && scrollHeight > screenHeight) {
        mainWindow.setSize(275, screenHeight - 200);
        let positioner = new Positioner(mainWindow);
        positioner.move('bottomRight');
    }

    if(Number.isInteger(scrollHeight) && scrollHeight <= screenHeight) {
        mainWindow.setSize(275, scrollHeight);
        let positioner = new Positioner(mainWindow);
        positioner.move('bottomRight');
    }
});

// =========================================================== //
// ==================== Open About Window ==================== //
// =========================================================== //
ipcMain.on(SHOW_ABOUT_WINDOW, () => {
    aboutWindow.show();
});


// =========================================================== //
// ==================== Open Help Window ==================== //
// =========================================================== //
ipcMain.on(SHOW_HELP_WINDOW, () => {
    helpWindow.show();
});


// =========================================================== //
// ===================== Get All Staples ===================== //
// =========================================================== //

ipcMain.on(FETCH_STAPLES_FROM_STORAGE, () => {
  getStapales();
});

const getStapales = () => {
    storage.getAll((error, data) => {
        if (error) throw error;
        
        mainWindow.send(FETCH_STAPLES_FROM_STORAGE_HANDLER, {
            success: true,
            message: 'All Staples',
            data
        });
    });
}

// =========================================================== //
// ====================== Create Staple= ===================== //
// =========================================================== //

ipcMain.on(CREATE_STAPLE_STORAGE, (event, arg) => {
  createStapler(arg);
});

const createStapler = (data) => {
    storage.set(storeKey(),
        { files: data, title: '', createdAt: Date.now() }, (error) => {
            if (error) throw error;

            mainWindow.send(CREATE_STAPLE_STORAGE_HANDLER, {
                success: true,
                message: 'Stapled Successfully',
                text: data
            });
        }
    );
}

// =========================================================== //
// =================== Delete Single Node ==================== //
// =========================================================== //

ipcMain.on(DELETE_STAPLE_FROM_LOCAL_STORAGE, (event, arg) => {
    deleteStaple(arg);
});

const deleteStaple = (id) => {
    storage.remove(id, (error) => {
        if (error) throw error;
        mainWindow.send(DELETE_STAPLE_FROM_LOCAL_STORAGE, {
            success: true,
            message: 'Staple has been deleted',
            text: `${id} Staple has been deleted`
        });
    });
}

// =========================================================== //
// =================== Delete All Staples ==================== //
// =========================================================== //

ipcMain.on(DELETE_LOCAL_STORAGE, () => {
    deleteAllStaples();
});

const deleteAllStaples = () => {
    storage.clear((error) => {
        if (error) throw error;
        console.log('-------DELETE_LOCAL_STORAGE---------');
        console.log(storage.getDataPath());
        console.log('------------------------------------');
        mainWindow.send(DELETE_LOCAL_STORAGE, {
            success: true,
            message: 'All Staples have been deleted'
        });
    });
}

// =========================================================== //
// ==================== Update Stapler ======================= //
// =========================================================== //

ipcMain.on(UPDATE_STAPLE_LOCAL_STORAGE, (events, args) => {
    updateLocalStorage(args);
});

const updateLocalStorage = (data) => {
    const { id, files, title = ''} = data;
    storage.set(id, { files, title, createdAt: Date.now() }, (error) => {
        if (error) throw error;

        mainWindow.send(UPDATE_STAPLE_LOCAL_STORAGE, {
            success: true,
            message: 'Staple has been updated!',
            text: data
        });
    });
}

// =========================================================== //
// ================== Download As Zip File =================== //
// =========================================================== //

ipcMain.on(DOWNLOAD_AS_ZIP_FILE, (events, args) => {

    if (!fs.existsSync(fileLocation)) {
        fs.mkdirSync(fileLocation);
    }

    const latestFile = getMostRecentFileName(fileLocation)
    const file = `${fileLocation}/${latestFile}`
    const resp = createZipFile(args);

    mainWindow.send(DOWNLOAD_AS_ZIP_FILE_HANDLER, {
        success: true,
        message: `Zip file has been created, check this location ${file}`,
        text: latestFile
    });
});

  
ipcMain.on(SEND_MAIL, (events, args) => {
    createZipFile(args);
    const latestFile = getMostRecentFileName(fileLocation)
    sendMail(latestFile)
})

const sendMail = (latestFile) => {
    const file = `${fileLocation}/${latestFile}`
    shell.openExternal(`mailto:aathi@7zero.com?subject=Stapler&body=Please find the attached zip file&attach=${fileLocation}/${latestFile}`);
}

const getMostRecentFileName = (dir) => {
    const  _ = require('underscore');
    const files = fs.readdirSync(dir);
    return _.max(files, function (f) {
        var fullpath = path.join(dir, f);
        return fs.statSync(fullpath).ctime;
    });
}

const createZipFile = (files) => {
    try {
        var zip = new JSZip();
        files.map(file => {
            if(fs.lstatSync(file.path).isDirectory()) {
                const dirFiles = fs.readdirSync(file.path);
                var subFolder = zip.folder(file.name);
                dirFiles.map(dirFile => {
                    subFolder.file(dirFile, fs.readFileSync(`${file.path}/${dirFile}`))
                })
            } else {
                zip.file(file.name, fs.readFileSync(file.path));
            }
        })

        zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
            .pipe(fs.createWriteStream(`${fileLocation}/Stapler_Zip_${dateTime()}.zip`))
            .on('finish', () => {
                console.log(`Writing File at ${fileLocation}`);
            });
    } catch (error) {
        throw error
    }
}

const dateTime = () => {
    const date = moment(Date.now()).format('DD/MM/YYYY, h:mm:ss a')
    return filenamify(date, {replacement: '_'})
}

function storeKey() {
  return uuid.v4();
}

function result(obj) {
  return Object.values(obj);
}

