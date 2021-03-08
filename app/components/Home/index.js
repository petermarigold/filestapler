import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
const { shell, remote, ipcRenderer, ipcMain, screen } = window.require(
  'electron'
);
import Dropzone from 'react-dropzone';
import _ from 'lodash';
import moment from 'moment';
import { fileSize, convertFileToObject, removeDuplicate } from '../../helpers';
import router from '../../constants/routes.json';
import {
  FETCH_STAPLES_FROM_STORAGE,
  FETCH_STAPLES_FROM_STORAGE_HANDLER,
  CREATE_STAPLE_STORAGE,
  DELETE_LOCAL_STORAGE,
  CHANGE_WINDOW_HEIGHT,
  HIDE_OR_SHOW_CLOSE_BUTTON
} from '../../utils/constants';

import stpleSound from '../../audio/staple.mp3';
import StapleIcon from '../../icons/256x256.png';

const audio = new Audio(stpleSound);
const win = remote.getCurrentWindow();
let bounds = screen.getPrimaryDisplay().bounds;
let workAreaSize = screen.getPrimaryDisplay().workAreaSize;

const result = stapledFiles => {
  return Object.keys(stapledFiles).map(key => {
    return { ...stapledFiles[key], id: key };
  });
};
class Home extends Component {
    constructor() {
        super();
        this.state = {
            stapleFiles: [],
            staples: [],
            rejected: [],
            counter: '',
            height: 0,
            searchResultDivHeight: 0
        };
    }

    componentDidMount() {
        this.handleWindowSizeChange(275);
        this.fetchStapledDataHandler();
        ipcRenderer.on(FETCH_STAPLES_FROM_STORAGE_HANDLER, this.getStaples);
        window.addEventListener('resize', this.handleWindowSizeChange);
    }

    componentWillMount() {
        ipcRenderer.removeListener(
            FETCH_STAPLES_FROM_STORAGE_HANDLER,
            this.getStaples
        );
    }

    componentWillReceiveProps(nextProps) {
        const { stapleFiles } = this.state;
        if (stapleFiles !== nextProps.stapleFiles) {
            this.fetchStapledDataHandler();
        }
    }
        
    handleWindowSizeChange = scrollHeight => {
        ipcRenderer.send(CHANGE_WINDOW_HEIGHT, scrollHeight);
    };

    handleResultWindowHeight = (scrollHeight) => {
        const { searchResultDivHeight } = this.state;
        this.setState((prevState) => {
            if(prevState.searchResultDivHeight !== scrollHeight) {
                this.handleWindowSizeChange(scrollHeight);
                return { searchResultDivHeight: scrollHeight }
            }
        })
    }
    
    fetchStapledDataHandler = () => {
        ipcRenderer.send(FETCH_STAPLES_FROM_STORAGE, 'Fetch All Staples');
    };

    getStaples = (event, { data }) => {
        this.setState({
            staples: data
        });
    };

    deleteAllStaples = () => {
        ipcRenderer.send(DELETE_LOCAL_STORAGE, 'Delete');
        this.setState({
            stapleFiles: [],
            refresh: Date.now()
        });
        this.fetchStapledDataHandler();
    };

    removeItemHandler = removeAt => {
        const { stapleFiles, rejected } = this.state;
        _.pullAt(stapleFiles, removeAt);

        this.setState(prevState => {
            if(stapleFiles.length === 0) {
                return { 
                    searchResultDivHeight: 0,
                    stapleFiles
                }
            } else {
                return { stapleFiles }
            }
        })
    };

    stapleHandler = () => {
        const { stapleFiles, counter } = this.state;
        const files = convertFileToObject(stapleFiles);
        ipcRenderer.send(CREATE_STAPLE_STORAGE, files);
        new Notification('Stapler', {
            icon: StapleIcon,
            body: `${counter} stapled`,
            silent: true
        });
        audio.play();
        setTimeout(() => {
            this.fetchStapledDataHandler();
        }, 1000)
        this.clearStapleFiles();
        this.handleWindowSizeChange(275);
        
    };

    clearStapleFiles = () => {
        this.setState({ stapleFiles: [] });
        this.handleWindowSizeChange(275);
    };

    closeWindow = () => {
        win.close();
    };

    openStapler = () => {
        const WINDOW_WIDTH = bounds.width;
        const WINDOW_HEIGHT = bounds.height;
        let x = bounds.x + (bounds.width - WINDOW_WIDTH) / 2;
        let y = bounds.y + (bounds.height - WINDOW_HEIGHT) / 2;
        win.setBounds({
            width: WINDOW_WIDTH,
            height: WINDOW_HEIGHT,
            x: x,
            y: y
        });
        ipcRenderer.send(HIDE_OR_SHOW_CLOSE_BUTTON, 'hide');
        this.props.history.push(router.STAPLER);
    };

    searchStapler = (allStaples, searchFile) => {
        return allStaples.filter(staple => {
            let foundCategory = staple.files.findIndex(file => {
                return file.name.toLowerCase().indexOf(searchFile.name.toLowerCase()) > -1;
            });
            return foundCategory !== -1;
        });
    };

    openSearchResultFile = file => {
        shell.openItem(file.path);
    };

    resetScreenSize = () => {
        const { stapleFiles } = this.state;
        if(stapleFiles.length === 0 ) {
            this.handleWindowSizeChange(250);
        }
    }

    render() {
        const { stapleFiles, staples , changedView} = this.state;
        const allStaples = result(staples);

        return (
            <div className="stapler-wrapper col-md-12">
                <div className="row top-fixed-element">
                    <div
                        className="col-md-12"
                        style={{ paddingRight: 0}}
                    >
                        <Dropzone
                            key={Date.now()}
                            className={`dropZone ${stapleFiles.length === 1 && 'height-200'}`}
                            onDrop={(files, rejected) => {
                                this.setState({
                                    stapleFiles: removeDuplicate(stapleFiles.concat(files))
                                });
                            }}
                            disableClick
                        >
                            {({ open }) => (
                                <React.Fragment>
                                    {stapleFiles.length === 0 && (
                                        <p> Drop files here to staple or check</p>
                                    )}

                                    <div
                                        id="drop"
                                        ref={() => {
                                            const { scrollHeight } = document.getElementById('drop');
                                            if (
                                                typeof scrollHeight !== 'undefined' &&
                                                scrollHeight !== null &&
                                                scrollHeight !== 0 &&
                                                scrollHeight > 275
                                            ) {
                                                this.handleResultWindowHeight(scrollHeight);
                                            }
                                        }}
                                        style={{
                                            marginTop: 10,
                                            paddingBottom: 120,
                                            height: stapleFiles.length === 0 && '100px !important',
                                            overflowY: 'auto',
                                            maxHeight:
                                                workAreaSize.height - (workAreaSize.height * 20) / 100
                                        }}
                                    >
                                        <div className="mini-window">
                                            {stapleFiles.map((file, index) => {
                                                return (
                                                    <li key={index}>
                                                        <div>
                                                            <span className="truncate">{file.name} </span>
                                                            <span className="truncate">
                                                                {fileSize(file.size)}
                                                            </span>
                                                            <span
                                                                className="mi-close"
                                                                onClick={() => this.removeItemHandler(index)}
                                                            >
                                                               <i class="fa fa-close"/>
                                                            </span>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </React.Fragment>
                            )}
                        </Dropzone>
                        {/* Reset window if stapleFiles more than one */}
                        {this.resetScreenSize()}
                        <div
                            id="searchResult"
                            ref={() => {
                                const { scrollHeight } = document.getElementById(
                                    'searchResult'
                                );

                                if (
                                    typeof scrollHeight !== 'undefined' &&
                                    scrollHeight !== null &&
                                    scrollHeight !== 0 &&
                                    scrollHeight + 250 > 275
                                ) {

                                    this.handleResultWindowHeight(scrollHeight + 250);
                                }
                            }}
                            style={{
                                height: stapleFiles.length === 0 && '100px !important',
                                overflowY: 'auto',
                                maxHeight:  workAreaSize.height - (workAreaSize.height * 40) / 100
                            }}
                        >
                            {stapleFiles.length === 1 &&
                                this.searchStapler(allStaples, stapleFiles[0]).map(
                                    (staple, index) => {
                                        return (
                                            <div key={index}>
                                                <hr style={{ borderTop: '1px dotted black' }} />
                                                <h5>
                                                    <span style={{ fontSize: 15 }}>
                                                        {moment(staple.createdAt).format(
                                                            'DD/MM/YYYY, h:mm:ss a'
                                                        )}
                                                    </span>
                                                </h5>
                                                <div className="mini-window">
                                                    {staple.files.map((file, index) => {
                                                        return (
                                                            <li key={index}>
                                                                <div
                                                                    onClick={() => this.openSearchResultFile(file)}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        fontWeight:
                                                                            file.name === stapleFiles[0].name
                                                                                ? '900'
                                                                                : 'normal'
                                                                    }}
                                                                >
                                                                    <span
                                                                        className="truncate"
                                                                    >
                                                                        {file.name}
                                                                    </span>
                                                                    <span className="truncate">
                                                                        {fileSize(file.size)}
                                                                    </span>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                        </div>
                    </div>
                </div>
                <div className="footer fixed-bottom">
                    <p
                        style={{ color: stapleFiles.length !== 0 && 'black'}}
                        onClick={() =>
                            stapleFiles.length !== 0 ? this.stapleHandler() : null
                        }
                    >
                        Staple
                    </p>
                    <p 
                        style={{ color: stapleFiles.length !== 0 && 'black'}}
                        onClick={() => this.clearStapleFiles()}
                    >
                        Clear
                    </p>
                    <p onClick={() => this.openStapler()}>Open File Stapler</p>
                    {/* <p onClick={() => this.deleteAllStaples()}>Clear All</p> */}
                </div>
            </div>
        );
    }
}

export default withRouter(Home);
