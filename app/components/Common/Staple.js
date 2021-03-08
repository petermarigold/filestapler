import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import moment from 'moment';
const { shell, remote, ipcRenderer, ipcMain, screen } = window.require(
  'electron'
);
import Dropzone from 'react-dropzone';
import _ from 'lodash';
import { fileSize, convertFileToObject, removeDuplicate } from '../../helpers';

import router from '../../constants/routes.json';

import {
  FETCH_STAPLES_FROM_STORAGE,
  FETCH_STAPLES_FROM_STORAGE_HANDLER,
  CREATE_STAPLE_STORAGE,
  DELETE_LOCAL_STORAGE
} from '../../utils/constants';

import stpleSound from '../../audio/staple.mp3';
import StapleIcon from '../../icons/256x256.png';

const audio = new Audio(stpleSound);
const win = remote.getCurrentWindow();

class Home extends Component {
    constructor() {
        super();
        this.state = {
            stapleFiles: [],
            allStaples: [],
            rejected: [],
            counter: '',
            height: window.innerHeight - 100
        };
    }

    componentDidMount() {
        window.addEventListener(
            'resize',
            () => {
                this.handleWindowSizeChange();
            },
            true
        );
    }

    handleWindowSizeChange = () => {
        this.setState({
            height: window.innerHeight - 100
        });
    };

    deleteAllStaples = () => {
        ipcRenderer.send(DELETE_LOCAL_STORAGE, 'Delete');
        this.setState({
            stapleFiles: [],
            refresh: Date.now()
        });
        // this.fetchStapledDataHandler();
    };

    removeItemHandler = removeAt => {
        const { stapleFiles, rejected } = this.state;
        _.pullAt(stapleFiles, removeAt);
        this.setState({
            stapleFiles
        });
    };

    componentWillReceiveProps(nextProps) {
        if (this.state.allStaples !== nextProps.allStaples) {
            this.setState({
                allStaples: nextProps.allStaples
            });
        }
    }

    stapleHandler = removeAt => {
        const { stapleFiles, counter } = this.state;
        const { refetchStaples } = this.props;
        const files = convertFileToObject(stapleFiles);
        ipcRenderer.send(CREATE_STAPLE_STORAGE, files);
        var notification = new Notification('Stapler', {
            icon: StapleIcon,
            body: `${counter} stapled`,
            silent: true
        });
        audio.play();
        this.clearStapleFiles();
        refetchStaples();
    };

    clearStapleFiles = () => {
        this.setState({ stapleFiles: [] });
    };

    searchStapler = (allStaples, staple) => {
        const { refetchStaples } = this.props;
        refetchStaples();

        return allStaples.filter(p => {
            let foundCategory = p.files.findIndex(c => {
                return c.name.toLowerCase().indexOf(staple.name.toLowerCase()) > -1;
            });
            return foundCategory !== -1;
        });
    };

    openSearchResultFile = file => {
        shell.openItem(file.path);
    };
    
    render() {
        const { stapleFiles, allStaples } = this.state;

        return (
            <div
                className="col-md-12 main-dashboard-drozon"
                style={{ marginBottom: 10}}
            >
                <Dropzone
                    style={{
                        paddingTop: '18%',
                        cursor: 'default',
                        height: 'auto',
                        overflowX: 'hidden',
                        overflowY: 'auto',
                        minHeight: 250,
                        maxHeight: this.state.height
                    }}
                    className={`dropZone ${stapleFiles.length === 1 && 'height-100'}`}
                    onDrop={(files, rejected) => {
                        this.setState({
                            stapleFiles: removeDuplicate(this.state.stapleFiles.concat(files))
                        });
                    }}
                    disableClick
                >
                    {({ open }) => (
                        <React.Fragment>
                            {stapleFiles.length === 0 && (
                                <p> Drop files here to staple or check</p>
                            )}
                            <div>
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

                <div
                    style={{
                        height: 'auto',
                        overflowY: 'auto',
                        maxHeight: this.state.height - (this.state.height * 30) / 100
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



                <div className="main-dashboard-drozon-footer">
                <span
                        style={{ color: stapleFiles.length !== 0 && 'black'}}
                        onClick={() =>
                            stapleFiles.length !== 0 ? this.stapleHandler() : null
                        }
                    >
                        Staple
                    </span>
                    <span 
                        style={{ color: stapleFiles.length !== 0 && 'black'}}
                        onClick={() => this.clearStapleFiles()}
                    >
                        Clear
                    </span>
                </div>
            </div>
        );
    }
}

export default withRouter(Home);
