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
add above attribute additionally to elements that have click events attached
```
data-editable_html="click"
```
add above attribute additionally to elements that have contenteditable="false" and data-editable="click" attributes in order to include html tags in the tooltip


- In Command Line or Terminal navigate to the path of your application and run:
```
	node editor.js
```
Editor by default is setup to run on port 9000.
Go to your browser and run http://localhost:9000
#####Note:
For Windows machines editor contains "start_editor.bat" file that will open Browser-Editor in Chrome automatically.

#####Expand functionality for your app:
- Possibility to add extra functionality to the Editor without modifying the core Browser-Editor code
  use "extend" method to add extra functionality
  Below method can be added to the folowing events:
```
	E.activate.services.push(callback)  // add new callback to the activate method - launched on the begining of the application
```

```
	E.resetEditor.services.push(callback)  // add new callback to the resetEditor method - launched with the resteEditor method
```

```
	E.manualEditor.services.push(callback); // add new callback to the manualEditor method - launched with the editor button on click
```

```
	E.detectChange.conditions.push(callback); // add new callback to the detectChange method - create more conditions to detect changes in objects specific for your app
```