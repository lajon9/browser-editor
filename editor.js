/**
Browser Editor v1.0, Plugin that allows editing html file in the browser.
Copyright (C) 2015,  Marcin Banaszak, http://www.marcinbanaszak.com,
https://github.com/lajon9/browser-editor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish copies of the Software, and to permit 
persons to whom the Software is furnished to do so, subject to the following 
conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
**/

var express = require("express");
var app     = express();
var path    = require("path");
var http    = require('http').Server(app);
var port    = 9000;
var fs      = require('fs');
var io      = require('socket.io')(http);

console.log("Initiating Editor Plugin...\n");

app.use(express.static(process.cwd() + '/'));
app.get('/',function (req,res) {
    res.sendFile(path.join(__dirname+'/index.html'));
});

io.sockets.on('connection', function (socket) {

    socket.on('htmlData', function (htmlContent, path, src){
        console.log(src);
        updateFile(htmlContent, path, src);
        saveContents(src);
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function(){
        console.log("Socket has been disconnected.")
        if (contentsArray.length) {
            console.log("\nIMPORTANT:\n\nChanges have been made to the bellow files:");
            console.log(contentsArray + "\n");
            console.log("Make sure to notify the 'Programming' department about the changes made.")
        }
    });
});

var getFiles = function(dir, files_){
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
            getFiles(name, files_);
        } else {
            if (name.substring(name.indexOf("."), name.length) == ".png") {
                files_.push(name);
            } else if (name.substring(name.indexOf("."), name.length) == ".jpg") {
                files_.push(name);
            }
        }
    }
    return files_;
}

var updateFile = function(content, path, src){
    if (path == "") {
        var savingPath = src;
    } else {
        var savingPath = path + "/" + src;
    }
    fs.writeFile(savingPath, content, function (err){
        if (err) {
            io.sockets.emit('savingStatus', 'ERROR', err);
            console.log(err);
            // throw err;
        } else {
            io.sockets.emit('savingStatus', 'SUCCESS', 'Your changes have been saved to the file: "' + src + '".');
            console.log("File " + src + " has been saved with updated content.");
        }
    });
}
var contentsArray = [];
var saveContents = function(content){
    if (contentsArray.length) {
        if (!isInArray(content, contentsArray)) {
            contentsArray.push(content);
        }
    } else {
        contentsArray.push(content);
    }
}

var isInArray = function (value, array) {
    return array.indexOf(value) > -1;
}

http.listen(port);
http.once('error', function(err) {
    console.log(err)
    if (err.code === 'EADDRINUSE') {
        console.log("It looks like the port: " + port + " is taken. \nChange the port for Browser-Editor Plugin or close the application that is running on port: " + port + " and relaunch Browser-Editor again.")
        throw err;
    }
});
http.once('connection', function (stream) {
    console.log("Listening on port " + port + "...");
    console.log("http://localhost:" + port + " has been launched...\n");
    console.log("Ready for editing.\n")
});