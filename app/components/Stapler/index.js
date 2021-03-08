import React, { Component } from 'react';
import { withRouter} from 'react-router-dom'
import moment from 'moment';
const { shell, remote, ipcRenderer, screen } = window.require('electron');
import FileIcon from 'react-file-icon';
import _ from 'lodash';
import { convertFileToObject, fileSize } from '../../helpers';
import router from '../../constants/routes.json';
import {
    FETCH_STAPLES_FROM_STORAGE,
    FETCH_STAPLES_FROM_STORAGE_HANDLER,
    CREATE_STAPLE_STORAGE,
    UPDATE_STAPLE_LOCAL_STORAGE,
    DELETE_STAPLE_FROM_LOCAL_STORAGE,
    DELETE_LOCAL_STORAGE,
    DOWNLOAD_AS_ZIP_FILE,
    DOWNLOAD_AS_ZIP_FILE_HANDLER,
    SEND_MAIL,
    MINIMIZE_WINDOW,
    SHOW_ABOUT_WINDOW,
    SHOW_HELP_WINDOW,
    HIDE_OR_SHOW_CLOSE_BUTTON
} from '../../utils/constants';

import StapleIcon from '../../icons/256x256.png';
import AddExtraFile from '../Common/AddExtraFile';
import Staple from '../Common/Staple';
import EditTitle from '../Common/EditTitle';
import stpleSound from '../../audio/staple.mp3';
import removeSound from '../../audio/remove.mp3';
import trashSound from '../../audio/trash.mp3';

const playSound = sound => {
    const audio = new Audio(sound);
    audio.play();
};

const result = stapledFiles => {
    return Object.keys(stapledFiles).map(key => {
        return { ...stapledFiles[key], id: key };
    });
};

class index extends Component {
    constructor() {
        super();
        this.state = {
            isProVersion: true,
            stapleFiles: [],
            staples: [],
            rejected: [],
            isEditTitle: {},
            counter: '',
            query: '',
            height: window.innerHeight - 30,
            isComponentUpdated: false,
            viewType: 'listView'
        };
    }

    componentDidMount() {
        this.fetchStapledDataHandler();
        window.addEventListener(
            'resize',
            () => {
                this.handleWindowSizeChange();
            },
            true
        );
        ipcRenderer.on(FETCH_STAPLES_FROM_STORAGE_HANDLER, this.getStaples);
        ipcRenderer.on(DOWNLOAD_AS_ZIP_FILE_HANDLER, this.showCreateZipFileSuccess);
    }

    handleWindowSizeChange = () => {
        this.setState({
            height: window.innerHeight
        });
    };

    componentWillMount() {
        ipcRenderer.removeListener(
            FETCH_STAPLES_FROM_STORAGE_HANDLER,
            this.getStaples
        );
        ipcRenderer.removeListener(
            DOWNLOAD_AS_ZIP_FILE_HANDLER,
            this.showCreateZipFileSuccess
        );
    }

    showCreateZipFileSuccess = (event, data) => {
        const { text, message } = data;
        new Notification('Stapler', {
            icon: StapleIcon,
            body: message,
            silent: true
        });
    };

    fetchStapledDataHandler = () => {
        ipcRenderer.send(FETCH_STAPLES_FROM_STORAGE, 'Fetch All Staples');
    };

    updateStapleStorage = staple => {
        const { id, files } = staple;
        ipcRenderer.send(UPDATE_STAPLE_LOCAL_STORAGE, staple);
        this.fetchStapledDataHandler();
    };

    getStaples = (event, { data }) => {
        this.setState({
            staples: data
        });
        setTimeout(() => {
            result(data).map(staple => {
                if (staple.files.length === 0) {
                    this.deleteStaple(staple.id);
                    this.fetchStapledDataHandler();
                }
            });
        }, 200);
    };

    deleteStaple = id => {
        ipcRenderer.send(DELETE_STAPLE_FROM_LOCAL_STORAGE, id);
    };

    deleteStapleWithConfirmation = id => {
        if (confirm('Do you want to unstaple this?')) {
            this.deleteStaple(id);
            this.fetchStapledDataHandler();
            playSound(trashSound);
        }
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
        this.setState({
            stapleFiles
        });
    };

    stapleHandler = removeAt => {
        const { stapleFiles, counter, staples } = this.state;

        const files = convertFileToObject(stapleFiles);
        ipcRenderer.send(CREATE_STAPLE_STORAGE, files);
        var notification = new Notification('Stapler', {
            icon: StapleIcon,
            body: `${counter} stapled`,
            silent: true
        });

        this.clearStapleFiles();
    };

    clearStapleFiles = () => {
        this.setState({ stapleFiles: [] });
    };

    getFileType = file => {
        return file.split('/')[1];
    };

    removeFileFromState = ({ id, title }, key) => {
        const { staples } = this.state;
        const allStaples = result(staples);
        const afterRemove = allStaples
            .find(res => res.id === id)
            .files.filter((data, index) => {
                return index !== key && data;
            });

        this.updateStapleStorage({
            id,
            title,
            files: afterRemove
        });
        playSound(removeSound);
    };

    openAllstapledFiles = staple => {
        staple.files.map(file => {
            shell.openItem(file.path);
        });
    };

    openFile = file => {
        shell.openItem(file.path);
    };

    downloadAsZip = ({ files }) => {
        ipcRenderer.send(DOWNLOAD_AS_ZIP_FILE, files);
    };

    sendMail = ({ files }) => {
        ipcRenderer.send(SEND_MAIL, files);
    };

    editTitle = staple => {
        this.setState({
            isEditTitle: staple
        });
    };

    handleChange = event => {
        this.setState({ query: event.target.value });
        event.preventDefault();
    };

    searchStapler = allStaples => {
        return allStaples.filter(p => {
            let foundCategory = p.files.findIndex(c => {
                return (
                    c.name.toLowerCase().indexOf(this.state.query.toLowerCase()) > -1
                );
            });
            return foundCategory !== -1;
        });
    };

    searchBar = () => {
        return (
            <nav className="navbar navbar-expand-lg navbar-dark">
                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul className="navbar-nav mr-auto" />
                    <div className="nav-bar-actions">
                        <span onClick={() => this.showHelpHandler()}>Help</span>
                        <span onClick={() => this.showAboutWindow()}>About</span>
                        <span onClick={() => {
                            this.props.history.push(router.HOME)
                            ipcRenderer.send(HIDE_OR_SHOW_CLOSE_BUTTON, 'show')
                        }}
                        >Minimise File Stapler</span>
                    </div>
                </div>
            </nav>
        );
    };

    showHelpHandler = () => {
        ipcRenderer.send(SHOW_HELP_WINDOW, 'show-help');
    }

    showAboutWindow = () => {
        ipcRenderer.send(SHOW_ABOUT_WINDOW, 'show-about');
    }

    minimizeWindow = () => {
        ipcRenderer.send(MINIMIZE_WINDOW, 'minimize');
    }

    matchFilNameWithQuery = file => {
        const { query } = this.state;
        return file.name.toLowerCase().match(query.toLowerCase());
    };
    
    showUpdateMessage = () => {
        alert('Please buy the pro version')
    }

    changeView = () => {
        this.setState(prevState => {
            return { viewType: prevState.viewType === 'listView' ? 'gridView' : 'listView'}
        })
    }

    render() {
        const { staples, isEditTitle, query, height , isProVersion ,viewType} = this.state;

        if (staples.length === 0) {
            return <div />;
        }

        const allStaples = result(staples);

        const filteredStaples =
            query !== '' ? this.searchStapler(allStaples) : allStaples;

        const descendingOrder = files =>
            files.sort((dataFirst, dateSecond) => {
                return new Date(dateSecond.createdAt) - new Date(dataFirst.createdAt);
            });
        
        const icon = viewType === 'listView' ? <div><i className="fa fa-bars"></i> List</div> : <div><i className="fa fa-th-large"></i> Grid</div>
        return (
            <div>
                {this.searchBar()}
                <div>
                    <div className="flex-main-container ">
                        <div className="flex-main-left">
                            <Staple
                                allStaples={allStaples}
                                refetchStaples={() =>
                                    setTimeout(() => {
                                        this.fetchStapledDataHandler();
                                    }, 200)
                                }
                            />
                        </div>
                        <div className="flex-main-right">
                            <nav className="navbar navbar-expand-lg navbar-dark">
                                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                                    <input
                                        style={{ marginLeft: -6, width: 300 }}
                                        className="form-control mr-sm-2"
                                        type="search"
                                        placeholder="Search"
                                        aria-label="Search"
                                        value={this.state.query}
                                        onChange={(event) => isProVersion ? this.handleChange(event) : this.showUpdateMessage() }
                                    />
                                </div>
                                <div id="btnContainer" className="float-right">
                                    <button className="view-btn" onClick={() => this.changeView()}>{icon}</button> 
                                </div>
                            </nav>
                            <div
                                style={{
                                    overflowX: 'hidden',
                                    overflowY: 'scroll',
                                    maxHeight: this.state.height,
                                    paddingBottom: 150
                                }}
                            >
                                {descendingOrder(filteredStaples).map((staple, stapleIndex) => {
                                    return (
                                        <div key={stapleIndex} style={{ marginBottom: 20}}>
                                            <nav className="staple navbar navbar-expand-lg">
                                                <div className="text-truncate">
                                                    {!_.isEmpty(isEditTitle) &&
                                                        isEditTitle.id === staple.id
                                                        ? ''
                                                        : (staple.title !== '' &&
                                                            `${staple.title} (${moment(
                                                                staple.createdAt
                                                            ).format('DD/MM/YYYY, h:mm:ss a')})`) ||
                                                        `${moment(staple.createdAt).format(
                                                            'DD/MM/YYYY, h:mm:ss a'
                                                        )}`}

                                                    {!_.isEmpty(isEditTitle) &&
                                                        isEditTitle.id === staple.id && (
                                                            <EditTitle
                                                                isComponentUpdated={() => {
                                                                    this.fetchStapledDataHandler();
                                                                    this.setState({ isEditTitle: {} });
                                                                }}
                                                                {...staple}
                                                            />
                                                        )}
                                                </div>

                                                {/* <ul className="navbar-nav mr-auto" /> */}
                                                <div className="main-dashboard-actions" disabled={true}>
                                                    {!_.isEmpty(isEditTitle) &&
                                                        isEditTitle.id === staple.id && (
                                                            <span
                                                                disabled
                                                                onClick={() =>
                                                                    this.setState({ isEditTitle: {} })
                                                                }
                                                            >
                                                                Cancel
                                                            </span>
                                                        )}

                                                    {_.isEmpty(isEditTitle) && (
                                                        <span 
                                                            
                                                            onClick={() => isProVersion ? this.editTitle(staple) : this.showUpdateMessage() }>
                                                            Rename
                                                        </span>
                                                    )}
                                                    <span
                                                        onClick={() => isProVersion ? this.openAllstapledFiles(staple) : this.showUpdateMessage()}
                                                    >
                                                        Open All
                                                    </span>
                                                    <span onClick={() => isProVersion ? this.downloadAsZip(staple) : this.showUpdateMessage()} >
                                                        Zip File
                                                    </span>
                                                    <span
                                                        onClick={() =>
                                                            this.deleteStapleWithConfirmation(staple.id)
                                                        }
                                                    >
                                                        Unstaple
                                                    </span>
                                                </div>
                                            </nav>

                                            <div className="row" >
                                                <div className="col-md-12">

                                                {viewType === "listView" ? (
                                                    <div className="row">
                                                        {staple.files.map(
                                                            (file, fileIndex) => {
                                                                return (
                                                                    <div className="column">
                                                                        <li key={index}>
                                                                            <div
                                                                                style={{
                                                                                    display: 'inline-block',
                                                                                    cursor: 'pointer',
                                                                                    margin: 5,
                                                                                    paddingRight: 5,
                                                                                    backgroundColor:
                                                                                        query !== '' &&
                                                                                            this.matchFilNameWithQuery(file) !== null
                                                                                            ? 'gray'
                                                                                            : ''
                                                                                }}
                                                                                onDoubleClick={() => this.openFile(file)}
                                                                            >
                                                                                <span
                                                                                    className="truncate"
                                                                                >
                                                                                    {file.name}
                                                                                </span>
                                                                               
                                                                                
                                                                            </div>
                                                                            
                                                                            <span
                                                                                    className="remove-btn"
                                                                                    style={{float: 'right'}}
                                                                                    onClick={() =>
                                                                                        this.removeFileFromState(
                                                                                            staple,
                                                                                            fileIndex
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <i class="fa fa-close"/>
                                                                            </span>
                                                                            <span className="truncate" style={{float: 'right', marginRight: 20}}>
                                                                                    {fileSize(file.size)}
                                                                            </span>
                                                                        </li>
                                                                    </div>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                ) : <div>
                                                    {staple.files.map(
                                                        (file, fileIndex) => {
                                                            return (
                                                                <div
                                                                    className="thumbnail"
                                                                    key={fileIndex}
                                                                    style={{
                                                                        display: 'inline-block',
                                                                        margin: 5,
                                                                        backgroundColor:
                                                                            query !== '' &&
                                                                                this.matchFilNameWithQuery(file) !== null
                                                                                ? 'gray'
                                                                                : ''
                                                                    }}
                                                                    onDoubleClick={() => this.openFile(file)}
                                                                >
                                                                    <a
                                                                        className="close-thik"
                                                                        onClick={() =>
                                                                            this.removeFileFromState(
                                                                                staple,
                                                                                fileIndex
                                                                            )
                                                                        }
                                                                    />
                                                                    <FileIcon
                                                                        extension={this.getFileType(file.type)}
                                                                        type="image"
                                                                        size={80}
                                                                    />
                                                                    <br />
                                                                    <p
                                                                        className="truncate small"
                                                                        style={{ fontSize: 10 }}
                                                                    >
                                                                        {file.name}
                                                                    </p>
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                    </div>}
                                                    <AddExtraFile
                                                        isComponentUpdated={() => {
                                                            this.fetchStapledDataHandler();
                                                            this.clearStapleFiles();
                                                        }}
                                                        {...staple}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default withRouter(index)