const fs = require('fs');
var Promise = require('bluebird');
var join = Promise.join;
Promise.promisifyAll(fs);
const {shell,remote, ipcRenderer} = require('electron')
const {Menu, MenuItem, dialog, BrowserWindow, app} = remote


export const fileSize = function(bytes) {
  if (bytes == 0) {
    return '0.00 B';
  }
  var e = Math.floor(Math.log(bytes) / Math.log(1024));
  return (
    (bytes / Math.pow(1024, e)).toFixed(2) + ' ' + ' KMGTP'.charAt(e) + 'B'
  );
};

export const convertFileToObject = files => {
  return files.map(file => ({
    name: file.name,
    size: file.size,
    path: file.path,
    type: fileType(file),
    lastModified: file.lastModified
  }));
};

const fileType = (file) => {
    return fs.lstatSync(file.path).isDirectory() ? 'dir' : file.type
}

export const removeDuplicate = (stapleFiles) => {
 const afterDirectoryExcluded = stapleFiles.filter( file => {
    return fs.lstatSync(file.path).isFile() 
 })

 return afterDirectoryExcluded.filter((thing, index, self) =>
      index === self.findIndex(t => t.path === thing.path && t.name === thing.name)
)};

const allowOnlyFiles = (file) => {
    return fs.lstatSync(file.path).isDirectory() ? 'dir' : file.type
}
