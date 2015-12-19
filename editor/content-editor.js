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
var E = {

	//initialisation - once editor launched this will be set to true
	init: false,

	//editor initialised - if editing active this value chnages to true
	active: false,

	//check if editor was already activated at current location
	wasHereActivated: function(){
		if ($("#editor").hasClass("launched")) {
			return true;
		} else {
			return false;
		}
	},

	//object that will store selected Text and its properties
	selectedText: {},

	//initial amount of editable objects including the duplicates
	editableLength: 0,
	

	excludeObj: [],

	//username stored in the local storage
	username: (localStorage && localStorage.getItem("editor-username")) ? localStorage.getItem("editor-username") : "",
	
	//todays date
	date: new Date().toLocaleString().slice(0,10),
	
	//array of editor buttons
	editBtns: ["editor-btn-start", "editor-btn-save", "editor-btn-exit"],
	
	//array of editor images objects
	imagesObjects: ["editor-images-handle", "editor-images-desc", "editor-images-wrapper"],
	
	//diff_match_patch object
	googleDiff: "",
	
	//method to run editor only from node.js
	on: function(){
		if (window.location.pathname == "/" && window.location.port == "9000") {
			return true;
		} else {
			return false;
		}
	},

	//method returning socket object
	socket: function(){

		socket = io.connect("http://localhost:9000");
		return socket;

	},

	//object log - logging in the chnages made to the file specified in the "location"
	log: {

		location: "editor/editor-log.html",
		init: function(){
			E.socket().emit("logUser", E.username + " - " + E.date, this.location, "init");
		},

		change: function(data){
			E.socket().emit("logData", data, this.location);
		}

	},

	//load more scripts and styles here on the initial application load
	edit: function(settings) {

		if (!E.on()) return;
		
		if (!E.init) {

			//editor css
			$("<link/>", { rel: "stylesheet", type: "text/css", href: "editor/content-editor.css"}).appendTo("head");
			
			//google diff script for checking changes made
			$.getScript( "editor/diff_match_patch.js" )
				
				.done(function( script, textStatus ) {

					// console.log("diff_match_patch.js loaded");
					E.googleDiffExtend.prittierHTML();
					E.googleDiff = new diff_match_patch();

				})

				.fail(function( jqxhr, settings, exception ) {
					
					// console.log("diff_match_patch.js not loaded")
				
				}
			);
			
			//load socket.io script
			$.getScript( "socket.io/socket.io.js" )

				.done(function( script, textStatus ) {

					E.createEditorObj("div")("body", "editor");

					if (localStorage && localStorage.getItem("editor-username")) {
						E.log.init();
						E.activate.init(settings);
					} else {
						E.activate.login(settings);//CHECK THIS, IT IS NOT ALWAYS STARTING LOGIN PAGE
					}

				})

				.fail(function( jqxhr, settings, exception ) {

					E.popupMessage("error", "SCRIPT ERROR", "Triggered ajaxError handler. Please try to reload the application.", 2500);
				
				}
			);

		} else {

			E.activate.init(settings);
		
		}
	},

	//start editor here
	activate: {

		//logging in functionality - save details to local storage
		login: function(path){
			
			E.popupMessage("editor-login", "LOGIN", "Type Your Name");
			var $loginInput = E.createEditorObj("input")("#editor-message", "editor-login-input", "");
			var $loginSubmit = E.createEditorObj("div")("#editor-message", "editor-login-submit", "editor-login-btn");

			$loginSubmit.click(function(){
				
				if (!$loginInput.val()) {
					return;
				}

				$("#editor-message").fadeOut();
				
				E.username = $loginInput.val();
				localStorage.setItem("editor-username", E.username);
				E.log.init();
				
				E.activate.init(path);

			});
		},

		//load the content for editinig to the editor HTML objects
		init: function(content){
			
			//clear selection object for each new content
			if (E.selectedText) {

				E.selectedText = {};
			
			}

			//reset editor for each new content if initialised already
			if (E.init) {
				
				E.resetEditor.defaultFunc();
			
			}


			if (!$("[contenteditable]").length && $("#editor-btn-start").length) {
				
				$(".editor-btn-ignition").hide();
			
			} else {
				
				if (!$("#editor-htmlContent").length) {
					// $("body").css("position", "relative");
					E.createEditorObj("div")("#editor", "editor-htmlContent").hide();
				}

				$("#editor-htmlContent").empty().load(content, function (responseText, textStatus, XMLHttpRequest) {
				    
				    if (textStatus == "success") {
				    	
				    	$("#editor").removeClass("launched");
						E.editableLength = $(E.currentEditableObj().selectedOnly).length;
				    	E.markText();
				    	
				    	if (!E.init) {
				    		E.manualEditor.init();
				    		E.init = true;
				    	}

				    	E.extend(E.activate.services);

				    }

				});

			}
		},
		services: []
	},

	//functionality for text selecting in the editor
	selector: {

		savedSelection: {},

		selection: {},

		//object on which exists current selection
		$editingObj: {},
		
		selectionFor: function($obj, type){
			if (!$obj.length) {
				return;
			}

			if (type) {
				E.selector.getSelectionObject($obj, type);
			} else {
				
				if (E.isObjEmpty(E.selectedText)){
					E.selector.getSelectionObject($obj);
				}

			}
		},

		getSelectionObject: function($obj, type){
			
			$obj.mousedown(function() {
				
				window.getSelection().removeAllRanges();
			
			});

			$obj.mouseup(function() {
				
				//create "selectedText" object on mouse up
				if (E.active) {

					E.selectedText = getSelectedText();
					E.selectedText.editableString = $(this).html();
					E.selectedText.editableObj = $(this);
					
					E.selector.savedSelection = E.selector.saveSelection();
					E.selector.$editingObj = $(E.selector.saveSelection()[0].startContainer.parentNode)

					//detection what tools should be enabled for selection
					if (E.selectedText.selectedString) {
						
						if (type) {//this might be "click" type - do not enable link for click type
							E.selector.determineSelection($("img", ".editor-tool:not('.editor-link-tool')"));
						} else {
							E.selector.determineSelection($("img", ".editor-tool"));
						}

					} else {
						
						E.changeBtnsState($("img", ".editor-tool"), "orig", false);
					
					}

				}

			});

		    function getSelectedText() {

		        if (window.getSelection) {
		        	
		        	var selection = {
		        		selectedObj: window.getSelection(),
		        		selectedString: window.getSelection().toString()
		        	}

		            return selection;
		        
		        }

		    }

		},

		determineSelection: function($obj){
			var text = E.selector.savedSelection[0].startContainer.textContent;
			
			E.changeBtnsState($obj, "orig", false);

			//check for correct selection
			for (var i = 0; i < E.selector.$editingObj.contents().length; i++){
				
				var $contentObj = E.selector.$editingObj.contents()[i];
				var selTag = E.selector.$editingObj.contents().context.localName;
				var selText = E.selector.$editingObj.contents().context.innerText;

				//search for selected term in contents() array strings
				if($contentObj.textContent.indexOf(E.selectedText.selectedString) != -1) {
					
					if (selTag === "b" || selTag === "i" || selTag === "u") {
						
						if (selText === E.selectedText.selectedString) {
							E.changeBtnsState($obj, "active", true);
						}

					} else if (selTag === "a") {
						
						if (selText === E.selectedText.selectedString) {
							E.changeBtnsState($("img", $obj.parent("[data-editor-tag='a']")), "active", true);
						}

					} else {

						E.changeBtnsState($obj, "active", true);

					}
					break;

				}

			}
		},

		//saving selection
		saveSelection: function() {

		    if (window.getSelection) {

		        E.selector.selection = window.getSelection();
		        
		        if (E.selector.selection.getRangeAt && E.selector.selection.rangeCount) {
		            
		            var ranges = [];
		            
		            for (var i = 0, len = E.selector.selection.rangeCount; i < len; ++i) {
		                ranges.push(E.selector.selection.getRangeAt(i));
		            }

		            return ranges;

		        }

		    }
		    return null;

		},

		//restoring selection from saved selection
		restoreSelection: function(savedSel) {
		    
		    if (savedSel) {

		        if (window.getSelection) {
		            
		            E.selector.selection = window.getSelection();
		            E.selector.selection.removeAllRanges();
		            
		            for (var i = 0, len = savedSel.length; i < len; ++i) {
		                E.selector.selection.addRange(savedSel[i]);
		            }

		        }

		    }

		}

	},

	//enable or disable editing for contenteditable elements
	makeEditable: function(editable){
		
		$(E.currentEditableObj().trueOnly).each(function(){
			
			if (editable) {
				
				if ($(this).data("editable") == "click") {
					
					if (!$(this).hasClass("editor-tolltip-on")) {
						$(this).addClass("editor-tolltip-on");
						E.attachTooltip.to($(this));
					}

				} else {

					$(this).attr("contenteditable", "true");

				}

				E.active = true;

			} else {
				
				$(this).attr("contenteditable", "false");
				E.active = false;

			}

		});

	},

	//reset method
	resetEditor: {
		
		defaultFunc: function(hideAll) {
			
			E.makeEditable(false);
			
			if (!hideAll) {
				$("#editor-btn-start").fadeIn();
			}

			$("#editor-btn-save, #editor-btn-exit, #editor-toolbox").fadeOut();

			
			E.attachTooltip.off();
			E.changeBtnsState($("img", ".editor-tool"), "orig", false);

			E.extend(this.services);

		},

		services: []

	},

	//add data-edit to each editable object
	markText: function(){
		
		var counter = 0;

		$(E.currentEditableObj().selectedOnly).each(function(index){
			
			if (index > E.editableLength/2-1) {//half amount of "this"
				
				$(this).data("edit", counter+1);
				counter++

			} else {

				$(this).data("edit", index+1);

			}

		});

	},

	//activate editor here
	manualEditor: {

		init: function(){
		
			//create buttons for screen editing
			if ($("[contenteditable]").length && !$("#editor-btn-start").length) {
				E.createObjects("div", "#editor", E.editBtns, "editor-btn-ignition");
			} else {
				$("#editor-btn-start").show();
			}

			//click events for each editor button
			$(".editor-btn-ignition").click(function(){
				
				if ($(this).attr("id") == "editor-btn-start"){
					
					E.makeEditable(true);
					E.selector.selectionFor($("[contenteditable]:not([data-editable])"));
					$(this).fadeOut();
					$("#editor-btn-save, #editor-btn-exit, #editor-toolbox").fadeIn();
					
					//add functionalities on start by add the methods to services array of this object
					E.extend(E.manualEditor.services);

					E.pasteNoStyle($("[contenteditable]"));
					E.detectChange.run($("[contenteditable]"));
					
					$("[contenteditable]").keypress(function(e) {//fix for wrapping <br> tag into div on hit Enter
						if(e.which == 13) { 
							document.execCommand('insertHTML', false, '<br><br>');
							return false; 
						}
					});
					$("#editor").addClass("launched")

				} else if ($(this).attr("id") == "editor-btn-exit"){
					
					E.resetEditor.defaultFunc();

				} else if ($(this).attr("id") == "editor-btn-save"){//save to file here
					
					E.resetEditor.defaultFunc();

					
					if (E.settings.path == "") {
				        var loadingPath = E.settings.src;
				    } else {
				        var loadingPath = E.settings.path + "/" + E.settings.src;
				    }

					
					$("#editor-htmlContent").empty().load(loadingPath, function (responseText, textStatus, XMLHttpRequest) {
					    
					    if (textStatus == "success") {
					    	
					    	E.markText();
					    	E.saveToFile.init();

					    }

					});

				}

			});

			//create a toolbox and load its content from html document
			E.createToolbox();

			//get message from socket.io if the saving was successful
			E.socket().on("savingStatus", function (status, message){
				
				if (status == "SUCCESS") {
					E.popupMessage(status.toLowerCase(), status, message, 3000);
				} else {
					E.popupMessage(status.toLowerCase(), status, JSON.stringify(message), 3000);
				}

			});

		},

		services: []

	},

	//paste text from word document as a plain text
	pasteNoStyle: function($obj){
		
		if (!E.wasHereActivated()) {
			
			$obj.on('paste',function(e) {
			    
			    e.preventDefault();
			    var text = (e.originalEvent || e).clipboardData.getData('text/plain');
			    window.document.execCommand('insertText', false, text);
			
			});

		}

	},

	//update the duplicate content of the screen and send it to the server with socket.io and save that data to file
	saveToFile: {
		init: function(){
		
			var isHtmlChanged = false;

			E.extend(this.services);
			
			$(E.currentEditableObj().selectedOnly).each(function(index){
				
				if (index > E.editableLength/2-1) {
					
					if (isHtmlChanged) {//send data to be saved
						E.socket().emit("htmlData", $("#editor-htmlContent").html(), E.settings.path, E.settings.src);
					} else {
						E.popupMessage("", "STATUS", "No content has been changed.", 2500);
					}
					return false;

				} else {//check for changes here
					
					if ($(this).html() !== $("#editor-htmlContent [contenteditable]").eq($(this).data("edit")-1).html()) {
						E.debug.saving($(this))
						
						var oldText = $("#editor-htmlContent [contenteditable]").eq($(this).data("edit")-1).html();
						var newText = $(this).html();
						E.log.change(E.googleDiffExtend.compare(oldText, newText));

						isHtmlChanged = true;
						$("#editor-htmlContent [contenteditable]").eq($(this).data("edit") - 1).html($(this).html());
					}

				}

			});

		},
		services: []
	},

	//show in console what has been saved
	debug: {
		state: false,
		saving: function($obj){
			if (this.state) {

				// console.log($obj)
				console.log($obj.html())
				console.log("edit: " + $obj.data("edit"))
				// console.log($("#editor-htmlContent [contenteditable]").eq($obj.data("edit")-1))
				console.log($("#editor-htmlContent [contenteditable]").eq($obj.data("edit")-1).html())

			}
		}
	},

	//create Toolbox
	createToolbox: function(){

		E.createEditorObj("div")("#editor", "editor-toolbox").load("editor/tool-box.html", function(){
			
			if ($.ui) {
				$(this).draggable({ handle: "#editor-toolbox-handle" }, { cursor: "move" }, {containment:"body"});
			}
			
			var $input = $("#editor-link-input input");
			var $inputParent = $("#editor-link-input");
			var $duplicateObj = "";
			var $addLink = $("#editor-add-link");
			
			$(".editor-tool").mousedown(function(event){
				
				$target = $(event.target).parent();
				
				
				if (!$target.hasClass("activated")) return false;

				
				if ($target.data("editor_action") == "createLink") {//add link functionality
					
					E.changeBtnsState($("img", ".editor-tool"), "orig", false);
					$inputParent.addClass("active");

					var textContent = E.selector.savedSelection[0].startContainer.textContent;
					
					//replicate selection here
					var duplicateObjArray = [];
					
					for (var i = 0; i < E.selector.$editingObj.contents().length; i++){
						
						var $contentObj = E.selector.$editingObj.contents()[i];
						var contentSel = "";

						if($contentObj.textContent == textContent) {
							
							contentSel = $contentObj.textContent;
							contentSel = contentSel.insert(E.selector.savedSelection[0].endOffset, "</span>");
							contentSel = contentSel.insert(E.selector.savedSelection[0].startOffset, "<span id='editor-selection'>");
							duplicateObjArray.push(contentSel);

						} else {
							
							duplicateObjArray.push($contentObj);

						}
					}

					//recreate the object with selection here
					var duplicateObj = "";
					
					for (var z = 0; z < duplicateObjArray.length; z++){
						
						if (duplicateObjArray[z].data) {
							duplicateObj += duplicateObjArray[z].data;
						} else if (duplicateObjArray[z].outerHTML) {
							duplicateObj += duplicateObjArray[z].outerHTML;
						} else {
							duplicateObj += duplicateObjArray[z];
						}

					}

					//clone object with selection and add the content from "duplicateObjArray"
					E.selector.$editingObj.hide().clone(true, true).addClass("editor-obj-duplicate").insertAfter(E.selector.$editingObj).show();//create duplicate element to display selection
					$duplicateObj = $(".editor-obj-duplicate");
					$duplicateObj.html(duplicateObj);//show selection in duplicate

					setTimeout(function(){
					    $input.focus()
					    $input.on("focusout", function(){ hideLink(); });
					}, 0);
					
					if (E.isGS()) {
						TweenMax.fromTo($input, 0.2, {width: 0},{width: 165});
					} else {
						$input.css({width: 165})
					}

				} else if ($target.data("editor_action") == "unlink") {//unlink
					
					E.changeBtnsState($("img", ".editor-tool"), "orig", false);
					window.getSelection().removeAllRanges();
					document.execCommand($target.data("editor_action"), false, true);
				
				} else { //bold and italics
					
					document.execCommand($target.data("editor_action"), false, true);
				
				}

			});

			$addLink.click(function(){

				var inputValue = $(this).siblings("#editor-link-input input").val();//check this one
				
				if(E.isURL(inputValue)) {
					
					//remove duplicate and show original
					showOriginalObj();
					E.selector.restoreSelection(E.selector.savedSelection);
					document.execCommand($(this).data("editor_action"), false, $(this).siblings("#editor-link-input input").val());//add link to html content
					
					E.selectedText.editableObj.find("a").each(function(){//make each link open in a new tab
						if (!$(this).attr("target")) {
							$(this).attr("target", "_blanc");
						}
					});
					
				} else {
					
					if (inputValue == "") {
						E.popupMessage("error", "URL EMPTY", "Please insert URL.", 2500);
					} else {
						E.popupMessage("error", "URL ERROR", "Not a valid URL format.<br/>Try again.", 2500);
					}
					$input.focus();
					
					return false;

				}

				hideAnchorInput();
				E.changeBtnsState($("img", ".editor-tool:not('.editor-link-tool[data-editor-tag]')"), "orig", false);
			
			});


			// when the user hits ENTER on their keyboard add the link
			E.activateKey($input, 13, function(){
				
				$input.blur();
				$addLink.focus().click();
			
			});


			$("#editor-hide-link").click(function(){
				
				hideLink();
			
			});


			function showOriginalObj(){
				
				$duplicateObj.remove();
				E.selector.$editingObj.show();
			
			}


			function hideLink(){
				
				//remove duplicate and show original
				$input.off("focusout");
				showOriginalObj()
				hideAnchorInput();
				E.changeBtnsState($("img", ".editor-tool"), "active", true);//enable toolbox buttons
				E.selector.restoreSelection(E.selector.savedSelection);
			
			}


			function hideAnchorInput(){
				
				if (E.isGS()) {
					
					TweenMax.to($("#editor-add-link, #editor-hide-link"), 0.3, {width: 0, opacity:0, clearProps:"all"});
					TweenMax.to($input, 0.3, {width: 0, opacity: 0, clearProps:"all", onComplete: clearInput});
				
				} else {
				
					$("#editor-add-link, #editor-hide-link, #editor-link-input input").css({width: 0}).attr("style", "");
					clearInput();
				
				}
				
				function clearInput(){
					$inputParent.removeClass("active").find("input").val("");
				}

			}

		});
	},

	//used for buttons in the toolbox
	changeBtnsState: function($obj, data, state){
		
		$obj.each(function(){

			$(this).attr("src", $(this).data(data));

			if (state) {
				$(this).parent().addClass("activated");
			} else {
				$(this).parent().removeClass("activated");
			}

		});

	},

	//Tooltip functionalities
	attachTooltip: {
		
		//attach tooltip to the html object with data-editable="click" attribute on hover
		to: function($obj){
        
	        $obj.hover(function(){

	        	//return if editing off
	        	if (!E.active) return;

	        	var $element = $(this);
	        	var objClass = $element.data("edit");
	        	var thisOpened = false;

	        	//check if tooltip exists already
	        	$tooltip = $(".editor-tooltip");
	        	
	        	if ($tooltip.length) {
	        		
	        		$tooltip.each(function(){
	        			
	        			if ($(this).data("obj") == objClass) {
	        				thisOpened = true;
	        				return false;
	        			}

	        		});

	        	}

	        	//return if tooltip open already
	        	if (thisOpened) return;
	        	
	        	//create tooltip
	        	$(this).parent().css("position", "relative")
	        	
	        	//include html content in html if 'editable_html' attribute specified
	        	var tooltipContent = ($(this).data("editable_html")) ? $(this).html() : $(this).text();
	        	
	        	var topValue = ($element.outerHeight() < 30) ? 40 : $element.outerHeight();
				
				
				//create tooltip for an html object on mouseover
				$("<div></div>").appendTo($(this).parent()).addClass("editor-tooltip editor-tooltip" + objClass).data("obj", objClass).html(tooltipContent).show().css({
					marginLeft: -$(this).parent().outerWidth()/2,
					top: -topValue,
					maxWidth: $(this).parent().outerWidth()
				}).attr("contenteditable", true).append("<div class='editor-tooltip-exit' contenteditable='false'></div>");

				//tooltip arrow
				$("<div></div>").appendTo(".editor-tooltip" + objClass).addClass("editor-tooltip-arrow editor-tooltip-arrow" + objClass).show().css({
					left: $(".editor-tooltip" + objClass).outerWidth()/2 - $(".editor-tooltip-arrow").outerWidth()/2,
					top: $(".editor-tooltip" + objClass).outerHeight()
				});

				//tooltip animation
				if (E.isGS()) {
					TweenMax.from($(".editor-tooltip" + objClass), 0.5, {y: 50, scale: 0, opacity: 0});
				} else {
					$(".editor-tooltip" + objClass).show();
				}
				
				//attach selection event to the tooltip
				E.selector.selectionFor($(".editor-tooltip" + objClass), $element.data("editable"));
				
				//attach change detection event to the tooltip
				E.detectChange.run($(".editor-tooltip" + objClass + "[contenteditable]"));
				
				//tooltip exit functionality
				$(".editor-tooltip-exit").click(function(e){
					e.stopPropagation();
					$(".editor-tooltip-arrow" + $(this).parent().data("obj")).remove();
					$(this).parent().remove();
				});

				//attach pasting without styles to the tooltip
				E.pasteNoStyle($(".editor-tooltip" + objClass));

			});
		},

		//remove tooltips
		off: function(){
			$(".editor-tooltip, .editor-tooltip-arrow").remove();
			$(".editor-tolltip-on").removeClass("editor-tolltip-on");
		}

	},

	//detect changes event
	detectChange: {

		run: function($obj, condition){

			var before = "", 
				textChanged = "";
			
			if (!E.location.allow()){
				this.preventBubble($obj);
			}

			
			$obj.on('focus', function() {
				
				before = $(this).html();
			
			}).on('blur keyup paste', function() { 
				
				if (before != $(this).html() || before.substring(0, textChanged.length) != textChanged) { 
					$(this).trigger('change');
				}

			});

			
			$obj.on('change', function() {
				before = $(this).html();
				
				if ($(this).data("obj")){//detect change in tooltip and apply it to the relative element
					
					textChanged = $(this).html().substring(0, $(this).html().indexOf('<div class="editor-tooltip-exit" contenteditable="false">'));
					
					if ($(this).data("obj") == $("[contenteditable]:data('edit')").eq($(this).data("obj") - 1).data("edit")){
						$("[contenteditable]:data('edit')").eq($(this).data("obj") - 1).html(textChanged);
					}

				} else {
					
					E.extend(E.detectChange.conditions, $(this));
				
				}
			});

		},

		//stop bubbling click events on tooltip that would inherit the event from its parent - do not use this rule for pop screens
		preventBubble: function($obj){
			$obj.on('click', function(e) {
				e.stopPropagation();
			});
		},
		conditions: []
	},

	//location.allow method returns boolean
	//add specific location in order to do not prevent Bubbleing click events on objects with tooltips
	location: {
		allow: function(){
			for (var i = 0; i < this.conditions.length; i++){
				if (this.conditions[i]()){
					var bool = this.conditions[i]();
					break;
				} else {
					continue;
				}
			}
			return bool;
		},
		conditions: []
	},

	//returns objects for editing
	//add objects to "excludeObj" array to exclude those objects from editing and calculations
	//useful for objects that are dynamically generated on the fly in the browser
	currentEditableObj: function(){

		var allEditableEl = "[contenteditable]",
			editableEl = "[contenteditable]";

		
		for (var i = 0; i < E.excludeObj.length; i++){
			
			for (var z = 0; z < E.excludeObj[i].length; z++){
				
				if (typeof E.excludeObj[i][z] == "string"){
					
					var excludeEl = ":not('" + E.excludeObj[i][z] + "')";
					
					if (E.excludeObj[i][z+1] == true){ // if set to false do not exclude from making editable
						var excludeEl = ":not('" + E.excludeObj[i][z] + "')";
						editableEl =  editableEl + excludeEl;
					}

					allEditableEl =  allEditableEl + excludeEl;
					
				}

			}

		}

		$editableObj = {
			selectedOnly: $(allEditableEl),
			trueOnly: $(editableEl)
		}

		return $editableObj;//[selected elements editable after exclusion of all elements from "excludeObj", all elements excluding all from "excludeObj" with value "true"]
	
	},

	//method for extending Editor for extra functionalities without interfering with its core methods
	extend: function(actions, obj){
		
		if (actions){
			
			for (var i = 0; i < actions.length; i++){
				
				if (!actions[i]) {
					continue;
				}

				actions[i](obj);

			}

		}

	},

	//add keypress event to an object with this method
	activateKey: function($obj, key, callback) {
		
		$obj.keypress(function(e) {
			if(e.which == key) { callback(); }
		});

	},

	//display popup message
	popupMessage: function(popClass, popTitle, popMsg, displayTime){
		
		if (!$("#editor-message").length) {
			E.createEditorObj("div")("#editor", "editor-message");
		}

		
		$("#editor-message").addClass(popClass).text(popTitle).append("<p>" + popMsg + "</p>").fadeIn();

		
		if (displayTime) {
			$("#editor-message").delay(displayTime).fadeOut();
		}

	},

	//create new object
	createEditorObj: function(whatObj){//img, input, div

		return function(to, elId, elClass){//append to object, id, class

			if (whatObj == "img") {
			
				$("<img>").appendTo(to).attr("id", elId).addClass(elClass);
			
			} else if (whatObj == "input") {
				
				$("<input>").appendTo(to).attr({
					id: elId,
					placeholder: "John Smith"
				}).addClass(elClass);

			} else if (whatObj == "div") {
				
				$("<div></div>").appendTo(to).attr("id", elId).addClass(elClass);
			
			}

			return $("#"+elId);

		}

	},

	//create the same objects in bulk by taking "ids" array of id strings
	createObjects: function(whatObj, to, ids, objClass){
		
		for (var i = 0; i < ids.length; i++){
			E.createEditorObj(whatObj)(to, ids[i], objClass);
		}

	},

	//check if object has properties
	isObjEmpty: function(obj) {
	    
	    for(var prop in obj) {
	        
	        if(obj.hasOwnProperty(prop)) {
	        	return false;
	        }

	    }

	    return true;

	},

	//check if URL string is correct
	isURL: function(str) {
	     
	     var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
	     var url = new RegExp(urlRegex, 'i');
	     return str.length < 2083 && url.test(str);

	},

	//check if greensock present
	isGS: function(){
		
		if (TweenMax || TweenLite) {
			return true;
		}

	}

}


//add insert method to String prototype
String.prototype.insert = function (index, string) {
	
	if (index > 0) {
		return this.substring(0, index) + string + this.substring(index, this.length);
	} else {
		return string + this;
	}

};

//add prrietier method of displaying changed content
E.googleDiffExtend = {
	
	prittierHTML: function(){
		
		diff_match_patch.prototype.diff_prettierHtml = function(diffs) {
			var html = [];
			
			for (var x = 0; x < diffs.length; x++) {
				var op = diffs[x][0];    // Operation (insert, delete, equal)
				var data = diffs[x][1];  // Text of change.
				// var text = data;
				
				switch (op) {
					case DIFF_INSERT:
						html[x] = '<ins style="background:#e6ffe6;">' + data + '</ins>';
					break;
					case DIFF_DELETE:
						html[x] = '<del style="background:#ffe6e6;">' + data + '</del>';
					break;
					case DIFF_EQUAL:
						html[x] = '<span>' + data + '</span>';
					break;
				}
			}

			return html.join('');
		};

	},

	compare: function(oldText, newText) {
	    
	    var d = E.googleDiff.diff_main(oldText, newText);
	    E.googleDiff.diff_cleanupSemantic(d);
	    var ds = E.googleDiff.diff_prettierHtml(d);
	    
	    return ds;

	}
}