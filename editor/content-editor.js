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
	init: false,//initialisation
	active: false,//editor initialised - editing activation
	wasHereActivated: function(){//check if editor was activated in this location already
		if ($("#editor").hasClass("launched")) {
			return true;
		} else {
			return false;
		}
	},
	selectedText: {},
	editableLength: 0,//initial amount of editable objects including the duplicates
	editBtns: ["editor-btn-start", "editor-btn-save", "editor-btn-exit"],
	on: function(){//run editor only from node.js
		if (window.location.pathname == "/" && window.location.port == "9000") {
			return true;
		} else {
			return false;
		}
	},
	socket: function(){
		socket = io.connect("http://localhost:9000");
		return socket;
	},
	edit: function(settings) {
		if (!E.on()) return;
		if (!E.init) {
			$("<link/>", { rel: "stylesheet", type: "text/css", href: "editor/content-editor.css"}).appendTo("head");
			$.getScript( "socket.io/socket.io.js" )
				.done(function( script, textStatus ) {
					// E.popupMessage("success", "SCRIPT LOADED", "Socket.io has been loaded.", 2500);
					E.activate(settings);
				}).fail(function( jqxhr, settings, exception ) {
					E.popupMessage("error", "SCRIPT ERROR", "Triggered ajaxError handler.", 2500);
				}
			);
		} else {
			E.activate(settings);
		}
	},
	activate: function(content){
		if (E.selectedText) E.selectedText = {};//clear selection object for each new content
		if (E.init) {
			E.resetEditor();//reset editor for each new content if initialised already
		}

		if (!$("[contenteditable]").length && $("#editor-btn-start").length) {
			$(".editor-btn-ignition").hide();
		} else {
			E.socket().on("socketConnection" , function(connection, message){
				if (connection) {
					if (!$("#editor-htmlContent").length) {
						$("body").css("position", "relative")
						E.createEditorObj("body", "editor");
						E.createEditorObj("#editor", "editor-htmlContent").hide();
					}

					$("#editor-htmlContent").empty().load(content, function (responseText, textStatus, XMLHttpRequest) {
					    if (textStatus == "success") {
					    	$("#editor").removeClass("launched");
							E.editableLength = $("[contenteditable]").length;
					    	E.markText();
					    	if (!E.init) {
					    		E.manualEditor();
					    		E.init = true;
					    	}
					    }
					});
				} else {
					E.createEditorObj("body", "editor");
					E.popupMessage("error", "CONNECTION ERROR", message, 10000);
				}
			});
		}
	},
	selector: {
		savedSelection: {},
		selection: {},
		$editingObj: {},//object on which exist current selection
		selectionFor: function($obj, type){
			if (!$obj.length) return;
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
	makeEditable: function(editable){ //enable or disable editing for contenteditable elements
		$("[contenteditable]").each(function(){
			if (editable) {
				if ($(this).data("editable") == "click") {
					if (!$(this).hasClass("editor-tolltip-on")) {
						$(this).addClass("editor-tolltip-on");
						E.attachTooltip($(this));
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
	resetEditor: function(hideAll){
		E.makeEditable(false);
		if (!hideAll) $("#editor-btn-start").fadeIn();
		$("#editor-btn-save, #editor-btn-exit, #editor-toolbox").fadeOut();

		E.clearTooltips();
		E.changeBtnsState($("img", ".editor-tool"), "orig", false);
	},
	markText: function(){//add data-edit to each editable object
		var counter = 0
		$("[contenteditable]").each(function(index){
			if (index > E.editableLength/2-1) {//half amount of "this"
				$(this).data("edit", counter+1);
				counter++
			} else {
				$(this).data("edit", index+1);
			}
		});
	},
	manualEditor: function() {
		
		//create buttons for screen editing
		if ($("[contenteditable]").length && !$("#editor-btn-start").length) {
			E.createObjects("#editor", E.editBtns, "editor-btn-ignition");
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
				
				E.pasteNoStyle($("[contenteditable]"));
				E.detectChange($("[contenteditable]"));
				
				$("[contenteditable]").keypress(function(e) {//fix for wrapping <br> tag into <div> on hit Enter
					if(e.which == 13) { 
						document.execCommand('insertHTML', false, '<br><br>');
						return false; 
					}
				});
				$("#editor").addClass("launched")
			} else {//save to file here
				E.resetEditor();
				if ($(this).attr("id") == "editor-btn-save") {//saving event
					if (E.settings.path == "") {
				        var loadingPath = E.settings.src;
				    } else {
				        var loadingPath = E.settings.path + "/" + E.settings.src;
				    }
					$("#editor-htmlContent").empty().load(loadingPath, function (responseText, textStatus, XMLHttpRequest) {
					    if (textStatus == "success") {
					    	E.markText();
					    	E.saveToFile();
					    }
					});
				}
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

		//show hide editor on "Ctrl+E"
		E.activateKey($(document), 69, function(){
			if ($("#editor-btn-start").css("display") == "none" && $("#editor-btn-save, #editor-btn-exit").css("display") == "none") {
	    		$("#editor-btn-start").show();
	    	} else {
	    		$(".editor-btn-ignition, #editor-toolbox").hide();
	    		E.resetEditor(true);
	    		window.getSelection().removeAllRanges();
	    	}
		});

		//paste text from word document as a plain text
		//clipboardData with prompt fallback when browser doesn't support
	},
	//update the duplicate content of the screen and send it to the server with socket.io and save that data to file
	pasteNoStyle: function($obj){
		if (!E.wasHereActivated()) {
			$obj.on('paste',function(e) {
			    e.preventDefault();
			    var text = (e.originalEvent || e).clipboardData.getData('text/plain');
			    window.document.execCommand('insertText', false, text);
			});
		}
	},
	saveToFile: function(){
		var isHtmlChanged = false;
		$("[contenteditable])").each(function(index){
			if (index > E.editableLength/2-1) {
				if (isHtmlChanged) {//send data to be saved
					E.socket().emit("htmlData", $("#editor-htmlContent").html(), E.settings.path, E.settings.src);
				} else {
					E.popupMessage("", "STATUS", "No content has been changed.", 2500);
				}
				return false;
			} else {//check for changes here
				if ($(this).html() !== $("#editor-htmlContent [contenteditable]").eq($(this).data("edit")-1).html()) {
					isHtmlChanged = true;
					$("#editor-htmlContent [contenteditable]").eq($(this).data("edit") - 1).html($(this).html());
				}
			}
		});
	},
	createToolbox: function(){

		E.createEditorObj("#editor", "editor-toolbox").load("editor/tool-box.html", function(){
			
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
							duplicateObjArray.push($contentObj)
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
	changeBtnsState: function($obj, data, state){//used for buttons in the toolbox
		$obj.each(function(){
			$(this).attr("src", $(this).data(data));
			if (state) {
				$(this).parent().addClass("activated");
			} else {
				$(this).parent().removeClass("activated");
			}
		});
	},
	attachTooltip: function($obj){
        $obj.hover(function(){
        	if (!E.active) return;//return if editing off

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

        	if (thisOpened) return;//return if tooltip open already
        	//create tooltip
        	$(this).parent().css("position", "relative")
        	//include html content in html if 'editable_html' attribute specified
        	var tooltipContent = ($(this).data("editable_html")) ? $(this).html() : $(this).text();
        	
        	var topValue = ($element.outerHeight() < 30) ? 40 : $element.outerHeight();
			$("<div></div>").appendTo($(this).parent()).addClass("editor-tooltip editor-tooltip" + objClass).data("obj", objClass).html(tooltipContent).show().css({
				marginLeft: -$(this).parent().outerWidth()/2,
				top: -topValue,
				maxWidth: $(this).parent().outerWidth()
			}).attr("contenteditable", true).append("<div class='editor-tooltip-exit' contenteditable='false'></div>");

			$("<div></div>").appendTo(".editor-tooltip" + objClass).addClass("editor-tooltip-arrow editor-tooltip-arrow" + objClass).show().css({
				left: $(".editor-tooltip" + objClass).outerWidth()/2 - $(".editor-tooltip-arrow").outerWidth()/2,
				top: $(".editor-tooltip" + objClass).outerHeight()
			});

			if (E.isGS()) {
				TweenMax.from($(".editor-tooltip" + objClass), 0.5, {y: 50, scale: 0, opacity: 0});
			} else {
				$(".editor-tooltip" + objClass).show();
			}
			
			E.selector.selectionFor($(".editor-tooltip" + objClass), $element.data("editable"));
			E.detectChange($(".editor-tooltip" + objClass + "[contenteditable]"));
			$(".editor-tooltip-exit").click(function(e){
				e.stopPropagation();
				$(".editor-tooltip-arrow" + $(this).parent().data("obj")).remove();
				$(this).parent().remove();
			});
			E.pasteNoStyle($(".editor-tooltip" + objClass));
		});
	},
	clearTooltips: function(){//remove tooltips
		$(".editor-tooltip, .editor-tooltip-arrow").remove();
		$(".editor-tolltip-on").removeClass("editor-tolltip-on");
	},
	detectChange: function($obj){
		var before = "", 
			textChanged = "";

		//stop bubbling click events on tooltip that would inherit the event from its parent
		$obj.on('click', function(e) {
			e.stopPropagation();
		});

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
			}
		});
	},
	activateKey: function($obj, key, callback) {
		$obj.keypress(function(e) {
			if(e.which == key) { callback(); }
		});
	},
	popupMessage: function(popClass, popTitle, popMsg, displayTime){
		if (!$("#editor-message").length) {
			E.createEditorObj("#editor", "editor-message");
		}
		$("#editor-message").addClass(popClass).text(popTitle).append("<p>" + popMsg + "</p>").fadeIn().delay(displayTime).fadeOut();
	},
	createEditorObj: function(to, elId, elClass, img){
		if (img) {
			$("<img>").appendTo(to).attr("id", elId).addClass(elClass);
		} else {
			$("<div></div>").appendTo(to).attr("id", elId).addClass(elClass);
		}
		return $("#"+elId);
	},
	createObjects: function(to, ids, objClass){
		for (var i = 0; i < ids.length; i++){
			E.createEditorObj(to, ids[i], objClass);
		}
	},
	isObjEmpty: function(obj) {
	    for(var prop in obj) {
	        if(obj.hasOwnProperty(prop)) {
	        	return false;
	        }
	    }
	    return true;
	},
	isURL: function(str) {
	     var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
	     var url = new RegExp(urlRegex, 'i');
	     return str.length < 2083 && url.test(str);
	},
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