####DEPENDENCIES:

>- node.js
https://nodejs.org/
>- express.js
>- socket.io
>- jQuery
https://jqueryui.com/
>- Greensock - optional, animating objects 
http://greensock.com/

####SUPPORT:
>- Chrome
>- Safari
>- Firefox

####REQUIREMENTS:
This plugin allow editing html files loaded dynamically to the web application directly in the browser in a development level of deployment.

####INSTALLATION

- Install node.js on your machine - https://nodejs.org/


- Copy editor folder to the root of your application


- Copy editor.js and package.json files to the root folder.


- In command prompt or terminal on Mac go to the root path of your application and run command:
```
	npm install
```
The above command will install Express.js and Socket.io modules into the the node_modules folder that will be located in the root folder of your application. These modules are necessary for data transfer, communication and saving the files.


- Add scripts and stylesheet:
Include below script in the head element of your application:
```
<script type="text/javascript" src="editor/content-editor.min.js"></script> 
```
Browser-Editor stylesheet and Socket.io script will be launched dynamically once the plugin will be activated.


- Specify path to the html files in your application:
```
editor.settings = {
		path: "path-to-html-files", // path to your html files
		src: "html-file-name.html" // name of the file for editing
}
```

- Initiate editor with below method:
```
editor.edit(editor.settings.path + "/" + editor.settings.src);
```

- Add necessary attributes to html files. In order to get Browser Editor working following attributes has to be added to the DOM elements:
```
contenteditable="false"
```
add above to each html element you want to edit
```
data-editable="click"
```
add above  attribute additionally to elements that have click events attached


- In Command Line or Terminal navigate to the path of your application and run:
```
	node editor.js
```
Editor by default is setup to run on port 9000.
Go to your browser and run http://localhost:9000
#####Note:
For Windows machines editor contains "start_editor.bat" file that will open Browser-Editor in Chrome automatically.