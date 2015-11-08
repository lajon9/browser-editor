/**
Browser Editor v1.0, Plugin that allows editing html file in the browser.
Copyright (C) 2015,  Marcin Banaszak, http://www.marcinbanaszak.com

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


DEPENDENCIES:
node.js
express.js
socket.io
jQuery
jQuery.ui - optional, dragging objects
Greensock - optional, animating objects

SUPPORT:
Chrome, Safari, Firefox

REQUIREMENTS:
This plugin allow editing html files loaded dynamically to the web application directly in the browser in a development level of deployment.


contenteditable="false" - add this to each element you want to edit
data-editable="click" - add this attribute to click events for editing


INSTALLATION
1. Install node.js on your machine - https://nodejs.org/
2. Copy editor folder to the root of your application
3. Copy editor.js and package.json files to the root folder.
4. In command prompt or terminal on Mac's go to the root path of your application and run command:

npm install
	
	The above command will install Express.js and Socket.io modules into the the node_modules folder that will be located in the root folder of your application. These modules are necessary for data transfer, communication and saving the files.

5. Add scripts and stylesheet:
	
	Include below script in the head element of your application:
	<script type="text/javascript" src="editor/content-editor.min.js"></script>
	
	Browser-Editor stylesheet and Socket.io script will be launched dynamically once the plugin will be activated.

6. Specify path to the html files in your application:
	
	specify the path to html files, and the page source file
	editor.settings = {
		path: path-to-html-files,//this is the path to your html files
		src: html-file-name.html//this is the name of the file for editing
	}

7. Initiate editor with below method:
	
	editor.edit(editor.settings.path + "/" + editor.settings.src);

8. In Command Line or terminal navigate to the path of your application and run:

	node editor.js

	Editor by default is setup to run on port 9000.
	Go to your browser and run http://localhost:9000

	For Windows machines editor contain start_editor.bat file that will open editing in Chrome browser automatically.