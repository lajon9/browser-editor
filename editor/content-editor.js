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

var editor = {
	init: false,//initialisation
	active: false,//editor initialised - editing activation
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
		if (!editor.init) {
			$("<link/>", { rel: "stylesheet", type: "text/css", href: "editor/content-editor.min.css"}).appendTo("head");
			$.getScript( "socket.io/socket.io.js" )
				.done(function( script, textStatus ) {
					// editor.popupMessage("success", "SCRIPT LOADED", "Socket.io has been loaded.", 2500);
					editor.activate(settings);
				}).fail(function( jqxhr, settings, exception ) {
					editor.popupMessage("error", "SCRIPT ERROR", "Triggered ajaxError handler.", 2500);
				}
			);
		} else {
			editor.activate(settings);
		}
	},
	activate: function(content){
		if (!editor.on()) return;
		if (editor.selectedText) editor.selectedText = {};//clear selection object for each new content
		if (editor.init) {
			editor.resetEditor();//reset editor for each new content if initialised already
		}
		
		if (!$("[contenteditable]").length && $("#editor-btn-start").length) {
			$(".editor-btn-ignition").hide();
		} else {
			if (!$("#editor-htmlContent").length) {
				editor.createEditorObj("body", "editor");
				editor.createEditorObj("#editor", "editor-htmlContent").hide();
			}

			$("#editor-htmlContent").empty().load(content, function (responseText, textStatus, XMLHttpRequest) {
			    if (textStatus == "success") {
			    	editor.editableLength = $("[contenteditable]").length;
			    	editor.markText();
			    	if (!editor.init) {
			    		editor.manualEditor();
			    		editor.init = true;
			    	}
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
				editor.selector.getSelectionObject($obj, type);
			} else {
				if (editor.isObjEmpty(editor.selectedText)){
					editor.selector.getSelectionObject($obj);
				}
			}
		},
		getSelectionObject: function($obj, type){
			$obj.mousedown(function() {
				window.getSelection().removeAllRanges();
			});
			$obj.mouseup(function() {
				//create "selectedText" object on mouse up
				if (editor.active) {
					editor.selectedText = getSelectedText();
					editor.selectedText.editableString = $(this).html();
					editor.selectedText.editableObj = $(this);
					
					editor.selector.savedSelection = editor.selector.saveSelection();
					editor.selector.$editingObj = $(editor.selector.saveSelection()[0].startContainer.parentNode)

					//detection what tools should be enabled for selection
					if (editor.selectedText.selectedString) {
						if (type) {//this might be "click" type - do not enable link for click type
							editor.selector.determineSelection($("img", ".editor-tool:not('.editor-link-tool')"));
						} else {
							editor.selector.determineSelection($("img", ".editor-tool"));
						}
					} else {
						editor.changeBtnsState($("img", ".editor-tool"), "orig", false);
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
			var text = editor.selector.savedSelection[0].startContainer.textContent;
			
			editor.changeBtnsState($obj, "orig", false);

			//check for correct selection
			for (var i = 0; i < editor.selector.$editingObj.contents().length; i++){
				var $contentObj = editor.selector.$editingObj.contents()[i];
				var selTag = editor.selector.$editingObj.contents().context.localName;
				var selText = editor.selector.$editingObj.contents().context.innerText;

				//search for selected term in contents() array strings
				if($contentObj.textContent.indexOf(editor.selectedText.selectedString) != -1) {
					if (selTag === "b" || selTag === "i" || selTag === "u") {
						if (selText === editor.selectedText.selectedString) {
							editor.changeBtnsState($obj, "active", true);
						}
					} else if (selTag === "a") {
						if (selText === editor.selectedText.selectedString) {
							editor.changeBtnsState($("img", $obj.parent("[data-editor-tag='a']")), "active", true);
						}
					} else {
						editor.changeBtnsState($obj, "active", true);
					}
					break;
				}
			}
		},
		saveSelection: function() {
		    if (window.getSelection) {
		        editor.selector.selection = window.getSelection();
		        if (editor.selector.selection.getRangeAt && editor.selector.selection.rangeCount) {
		            var ranges = [];
		            for (var i = 0, len = editor.selector.selection.rangeCount; i < len; ++i) {
		                ranges.push(editor.selector.selection.getRangeAt(i));
		            }
		            return ranges;
		        }
		    }
		    return null;
		},
		restoreSelection: function(savedSel) {
		    if (savedSel) {
		        if (window.getSelection) {
		            editor.selector.selection = window.getSelection();
		            editor.selector.selection.removeAllRanges();
		            for (var i = 0, len = savedSel.length; i < len; ++i) {
		                editor.selector.selection.addRange(savedSel[i]);
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
						editor.attachTooltip($(this));
					}
				} else {
					$(this).attr("contenteditable", "true");
				}
				editor.active = true;
			} else {
				$(this).attr("contenteditable", "false");
				editor.active = false;
			}
		});
	},
	resetEditor: function(hideAll){
		editor.makeEditable(false);
		if (!hideAll) $("#editor-btn-start").fadeIn();
		$("#editor-btn-save, #editor-btn-exit, #editor-toolbox").fadeOut();

		editor.clearTooltips();
		editor.changeBtnsState($("img", ".editor-tool"), "orig", false);
	},
	markText: function(){//add data-edit to each editable object
		var counter = 0
		$("[contenteditable]").each(function(index){
			if (index > editor.editableLength/2-1) {//half amount of "this"
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
			editor.createObjects("#editor", editor.editBtns, "editor-btn-ignition");
		} else {
			$("#editor-btn-start").show();
		}

		//click events for each editor button
		$(".editor-btn-ignition").click(function(){
			if ($(this).attr("id") == "editor-btn-start"){
				editor.makeEditable(true);
				editor.selector.selectionFor($("[contenteditable]:not([data-editable])"));
				$(this).fadeOut();
				$("#editor-btn-save, #editor-btn-exit, #editor-toolbox").fadeIn();
			} else {
				editor.resetEditor();
				if ($(this).attr("id") == "editor-btn-save") {//saving event
					if (editor.settings.path == "") {
				        var loadingPath = editor.settings.src;
				    } else {
				        var loadingPath = editor.settings.path + "/" + editor.settings.src;
				    }
					$("#editor-htmlContent").empty().load(loadingPath, function (responseText, textStatus, XMLHttpRequest) {
					    if (textStatus == "success") {
					    	editor.markText();
					    	saveToDuplicate();
					    }
					});
				}
			}
		});

		//create a toolbox and load its content from html document
		editor.createToolbox();

		//update the duplicate content of the screen and send it to the server with socket.io
		function saveToDuplicate(){
			var isHtmlChanged = false;
			$("[contenteditable]").each(function(index){
				if (index > editor.editableLength/2-1) {
					if (isHtmlChanged) {//send data to be saved
						editor.socket().emit("htmlData", $("#editor-htmlContent").html(), editor.settings.path, editor.settings.src);
					} else {
						editor.popupMessage("", "STATUS", "No content has been changed.", 2500);
					}
					return false;
				} else {
					if ($(this).html() !== $("#editor-htmlContent [contenteditable]").eq($(this).data("edit")-1).html()) {
						isHtmlChanged = true;
						$("#editor-htmlContent [contenteditable]").eq($(this).data("edit") - 1).html($(this).html());
					}
				}
			});
		}

		//get message from socket.io if the saving was successful
		editor.socket().on("savingStatus", function (status, message){
			if (status == "SUCCESS") {
				editor.popupMessage(status.toLowerCase(), status, message, 3000);
			} else {
				editor.popupMessage(status.toLowerCase(), status, JSON.stringify(message), 3000);
			}
		});

		//show hide editor on "Ctrl+E"
		editor.activateKey($(document), 69, function(){
			if ($("#editor-btn-start").css("display") == "none" && $("#editor-btn-save, #editor-btn-exit").css("display") == "none") {
	    		$("#editor-btn-start").show();
	    	} else {
	    		$(".editor-btn-ignition, #editor-toolbox").hide();
	    		editor.resetEditor(true);
	    		window.getSelection().removeAllRanges();
	    	}
		});

		//paste text from word document as a plain text
		//clipboardData with prompt fallback when browser doesn't support
		$('[contenteditable]').on('paste',function(e) {
		    e.preventDefault();
		    var text = (e.originalEvent || e).clipboardData.getData('text/plain') || prompt('Paste something..');
		    window.document.execCommand('insertText', false, text);
		});
	},
	createToolbox: function(){

		editor.createEditorObj("#editor", "editor-toolbox").load("editor/tool-box.html", function(){
			
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
					
					editor.changeBtnsState($("img", ".editor-tool"), "orig", false);
					$inputParent.addClass("active");

					var textContent = editor.selector.savedSelection[0].startContainer.textContent;
					
					//replicate selection here
					var duplicateObjArray = [];
					for (var i = 0; i < editor.selector.$editingObj.contents().length; i++){
						var $contentObj = editor.selector.$editingObj.contents()[i];
						var contentSel = "";

						if($contentObj.textContent == textContent) {
							contentSel = $contentObj.textContent;
							contentSel = contentSel.insert(editor.selector.savedSelection[0].endOffset, "</span>");
							contentSel = contentSel.insert(editor.selector.savedSelection[0].startOffset, "<span id='editor-selection'>");
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
					editor.selector.$editingObj.hide().clone(true, true).addClass("editor-obj-duplicate").insertAfter(editor.selector.$editingObj).show();//create duplicate element to display selection
					$duplicateObj = $(".editor-obj-duplicate");
					$duplicateObj.html(duplicateObj);//show selection in duplicate

					setTimeout(function(){
					    $input.focus()
					    $input.on("focusout", function(){ hideLink(); });
					}, 0);
					
					if (editor.isGS()) {
						TweenMax.fromTo($input, 0.2, {width: 0},{width: 165});
					} else {
						$input.css({width: 165})
					}
				} else if ($target.data("editor_action") == "unlink") {//unlink
					editor.changeBtnsState($("img", ".editor-tool"), "orig", false);
					window.getSelection().removeAllRanges();
					document.execCommand($target.data("editor_action"), false, true);
				} else { //bold and italics
					document.execCommand($target.data("editor_action"), false, true);
				}
			});

			$addLink.click(function(){

				var inputValue = $(this).siblings("#editor-link-input input").val();//check this one
				
				if(editor.isURL(inputValue)) {
					//remove duplicate and show original
					showOriginalObj();
					editor.selector.restoreSelection(editor.selector.savedSelection);
					document.execCommand($(this).data("editor_action"), false, $(this).siblings("#editor-link-input input").val());//add link to html content
					
					editor.selectedText.editableObj.find("a").each(function(){//make each link open in a new tab
						if (!$(this).attr("target")) {
							$(this).attr("target", "_blanc");
						}
					});
					
				} else {
					if (inputValue == "") {
						editor.popupMessage("error", "URL EMPTY", "Please insert URL.", 2500);
					} else {
						editor.popupMessage("error", "URL ERROR", "Not a valid URL format.<br/>Try again.", 2500);
					}
					$input.focus();
					
					return false;
				}
				hideAnchorInput();
				editor.changeBtnsState($("img", ".editor-tool:not('.editor-link-tool[data-editor-tag]')"), "orig", false);
			});

			// when the client hits ENTER on their keyboard add the link
			editor.activateKey($input, 13, function(){
				$input.blur();
				$addLink.focus().click();
			});

			$("#editor-hide-link").click(function(){
				hideLink();
			});

			function showOriginalObj(){
				$duplicateObj.remove();
				editor.selector.$editingObj.show();
			}

			function hideLink(){
				//remove duplicate and show original
				$input.off("focusout");
				showOriginalObj()
				hideAnchorInput();
				editor.changeBtnsState($("img", ".editor-tool"), "active", true);//enable toolbox buttons
				editor.selector.restoreSelection(editor.selector.savedSelection);
			}

			function hideAnchorInput(){
				if (editor.isGS()) {
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
        	if (!editor.active) return;//return if editing off

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
			$("<div></div>").appendTo($(this).parent()).addClass("editor-tooltip editor-tooltip" + objClass).data("obj", objClass).html($(this).text()).show().css({
				marginLeft: -$(this).parent().outerWidth()/2,
				top: -$element.outerHeight(),
				maxWidth: $(this).parent().outerWidth()
			}).attr("contenteditable", true).append("<div class='editor-tooltip-exit' contenteditable='false'></div>");

			$("<div></div>").appendTo(".editor-tooltip" + objClass).addClass("editor-tooltip-arrow editor-tooltip-arrow" + objClass).show().css({
				left: $(".editor-tooltip" + objClass).outerWidth()/2 - $(".editor-tooltip-arrow").outerWidth()/2,
				top: $(".editor-tooltip" + objClass).outerHeight()
			});

			if (editor.isGS()) {
				TweenMax.from($(".editor-tooltip" + objClass), 0.5, {y: 50, scale: 0, opacity: 0});
			} else {
				$(".editor-tooltip" + objClass).show();
			}
			
			editor.selector.selectionFor($(".editor-tooltip" + objClass), $element.data("editable"));
			editor.detectChange($(".editor-tooltip" + objClass + "[contenteditable]"));
			$(".editor-tooltip-exit").click(function(e){
				e.stopPropagation();
				$(".editor-tooltip-arrow" + $(this).parent().data("obj")).remove();
				$(this).parent().remove();
			});
		});
	},
	clearTooltips: function(){//remove tooltips
		$(".editor-tooltip, .editor-tooltip-arrow").remove();
		$(".editor-tolltip-on").removeClass("editor-tolltip-on");
	},
	detectChange: function($obj){//detect change in tooltip and apply it to the relative element
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
			if ($(this).data("obj")){//tolltips
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
			editor.createEditorObj("#editor", "editor-message");
		}
		$("#editor-message").addClass(popClass).text(popTitle).append("<p>" + popMsg + "</p>").fadeIn().delay(displayTime).fadeOut();
	},
	createEditorObj: function(to, elId, elClass){
		$("<div></div>").appendTo(to).attr("id", elId).addClass(elClass);
		return $("#"+elId);
	},
	createObjects: function(to, ids, objClass){
		for (var i = 0; i < ids.length; i++){
			editor.createEditorObj(to, ids[i], objClass);
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