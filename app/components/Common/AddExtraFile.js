import React, { Component } from 'react';
const { ipcRenderer } = window.require('electron');
import Dropzone from 'react-dropzone';
import { convertFileToObject } from '../../helpers'
import { UPDATE_STAPLE_LOCAL_STORAGE } from '../../utils/constants';

export default class AddExtraFile extends Component {

    addFilesWithExistingStapler = (newFiles) => {
        const { id, isComponentUpdated, title } = this.props;
        const files = convertFileToObject(newFiles)
        const updatedFiles = this.props.files.concat(files)
        const newStaple = { id, title, files: updatedFiles }
        ipcRenderer.send(UPDATE_STAPLE_LOCAL_STORAGE, newStaple);
        isComponentUpdated(true)
    };

    render() {
        return (
            <div style={{ marginLeft: 12, width: 110, display: 'inline-block' }}>
                <Dropzone
                    className="dropZone-addextra"
                    onDrop={(files, rejected) => {
                        this.addFilesWithExistingStapler(files)
                    }}
                >
                    <p>Drop more files</p>
                </Dropzone>
            </div>
        );
    }
}
