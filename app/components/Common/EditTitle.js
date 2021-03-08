import React, { Component } from 'react';
const { ipcRenderer } = window.require('electron');
import { convertFileToObject } from '../../helpers';
import { UPDATE_STAPLE_LOCAL_STORAGE } from '../../utils/constants';

export default class EditTitle extends Component {
    state = {
        value: this.props.title || ''
    };

    componentDidMount(){
        this.nameInput.focus();
    }

    handleSubmit = event => {
        event.preventDefault();
        const { id, files, isComponentUpdated } = this.props;
        const { value } = this.state;
        const newStaple = { id, title: value, files };
        ipcRenderer.send(UPDATE_STAPLE_LOCAL_STORAGE, newStaple);
        isComponentUpdated(true);
    };

    handleChange = event => {
        this.setState({ value: event.target.value });
        event.preventDefault();
    };

    render() {
        return (
            <form onSubmit={this.handleSubmit}>
                <input
                    type="text"
                    className="form-control "
                    ref={(input) => { this.nameInput = input; }} 
                    value={this.state.value}
                    onChange={this.handleChange}
                />
            </form>
        );
    }
}
