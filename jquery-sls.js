/*!
* jquery-sls
*
* Simple language switcher for jQuery. 
*
* @license
*
* Copyright (c) 2017 Volkan Kucukcakar.
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/ 

(function($, document) {		
	var sls={
		/** 
		* Default options, can be overriden at init() 
		*/
		defaultOptions:{
			// Default language code"
			defaultLang: "en",
			// Current/initial language code
			lang: "en",
			// Language json files path
			path: "languages/",
			// Selected language will be persistent across page loads
			persistent: true,
			// Cleaner sanitization for better matching (remove excessive spaces between words)
			clean: true,
			// Custom attributes to be translated
			attributes: [],
			// Element to be observed with it's descendants to detect changes by MutationObserver. 
			// By default, the whole document is observed and you don't have to change this, unless you have performance issues (e.g.: observe: "#dynamic")
			// Use null to disable observer. (e.g.: observe: null)
			observe: document
		},
		
		/** 
		* Other internal-use objects 
		*/
		settings: {},		
		translations: {},
		storage: false,
		attr: ["title", "alt", "href", "placeholder", "src"],
		observer: false,
		observerConfig: { attributes: true, childList: true, characterData: true, subtree: true },
		queue: [],
		executing: false,
		inevent: false,
		htmlO: null,
		textO: null,
				
		/**
		* init()
		*
		* Init.
		*
		* @param object options : Options to override
		*/
		init: function(options) {
			// Override default options
			this.settings = $.extend(this.defaultOptions, options);
			this.attr=$.uniqueSort($.merge(this.attr, this.settings.attributes).sort());
			// Get persistent storage support
			if (typeof(Storage)!=="undefined") {
				// Test if localStorage is actually available. i.e: Safari prevents it in private browsing
				try {
					localStorage.setItem("jquery-sls-test-local-storage", "test");
					localStorage.removeItem("jquery-sls-test-local-storage");
					this.storage=true;					
				} catch (error) {}
			}
			// Load current language code from persistent storage
			if (this.settings.persistent && this.loadLang()){
				this.setLang(this.settings.lang);
			}
			
			// *** Hook jQuery.html() Method: ***
			
			// Save old jQuery DOM manipulation functions before overriding
			this.htmlO=$.fn.html;
			// Override jQuery.html() method
			// To prevent recursion, do not use .html() method in the code, prefer using $.sls.htmlO.call($(object), value )
			$.fn.html = function() {
				if (arguments[0]!==null){
					arguments[0] = $.sls.t( arguments[0] );
				}
				return $.sls.htmlO.apply(this, arguments);
			}
			// *** Hook jQuery.text() Method: ***
			
			// Save old jQuery DOM manipulation functions before overriding
			this.textO=$.fn.text;
			// Override jQuery.text() method
			// To prevent recursion, do not use .text() method in the code, prefer using $.sls.textO.call($(object), value )
			$.fn.text = function() {
				if (arguments[0]!==null){
					arguments[0] = $.sls.t( arguments[0] );
				}
				return $.sls.textO.apply(this, arguments);
			}
			
			
			// *** MutationObserver Method: ***
			
			// MutationObserver to detect changes in DOM (i.e.: dynamic content loaded by ajax)
			// TODO: conflicts may occur with _kvp()
			var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
			if (typeof(MutationObserver)!=="undefined") {
				this.observer=new MutationObserver(function(mutations) {
					$.sls.queue.push(function(){						
						$.sls.observer.disconnect();
						if (mutations[0].type=="childList"){
							$(mutations[0].target).sls();
						}
						$.sls.observer.observe($($.sls.settings.observe)[0], $.sls.observerConfig);
					});
					_exec();
				});
				if (typeof($($.sls.settings.observe)[0])!=="undefined") {
					this.observer.observe($($.sls.settings.observe)[0], $.sls.observerConfig);
				}else{
					_log("Element not found, MutationObserver disabled.");
				}			
			}else{
				// MutationObserver not supported, fallback to Mutation events.
				// Alternatively, MutationObserver polyfills or the manual $("").sls() function on ajax success callback 
				// can be used for old browsers. e.g.: if (!$.sls.observer) $('#dynamic').sls();
				_log("MutationObserver is not supported on this browser, falling back to Mutation events.");
				$(document).on("DOMNodeInserted", function(event){
					$.sls.queue.push(function(){
						$(event.target).sls();
					});
					_exec();
				});
			}		
		},
					
		/**
		* loadLang()
		*
		* Load current language code from persistent storage.
		*
		*/
		loadLang: function() {
			if (this.storage){
				var lang=localStorage.getItem("jquery-sls-lang");
			}else{
				var lang=document.cookie.replace(/(?:(?:^|.*;\s*)jquery-sls-lang\s*\=\s*([^;]*).*$)|^.*$/, "$1");
			}
			if (lang!==null && lang!=="") {
				this.setLang(lang);
				return true;
			}else{
				return false;
			}
		},

		/**
		* saveLang()
		*
		* Save current language code to persistent storage.
		*
		*/
		saveLang: function() {
			if (this.storage){
				localStorage.setItem("jquery-sls-lang", this.settings.lang);
			}else{
				var d=new Date();
				d.setTime(d.getTime()+(365*24*60*60*1000));
				var expires="expires="+d.toUTCString();
				document.cookie="jquery-sls-lang="+this.settings.lang+";"+expires+";path=/";
			}			
		},
				
		/**
		* getLang()
		*
		* Get current language code.
		*
		* @return string : Language code
		*/
		getLang: function() {		
			return this.settings.lang;
		},
		
		/**
		* setLang()
		*
		* Switch current language by translating the whole document.
		*
		* @param string lang : Language code
		*/
		setLang: function(lang) {
			if (lang!=this.settings.lang){
				if (lang==this.settings.defaultLang){
					$.sls.queue.push(function(){
						// Switch back to default language
						_translate($(document), true, $.sls.settings.lang, $.sls.settings.defaultLang, $.sls.translations, true);
						$.sls.settings.lang=lang;
						if ($.sls.settings.persistent){
							$.sls.saveLang();
						}				
					});
					_exec();
				}else{
					// Switch to a new language
					$.ajax({
						dataType: "json",
						url: this.settings.path+lang+".json",
						success: function (data) {
							$.sls.queue.push(function(){
								// Sanitize new dictionary
								if ($.sls.settings.clean) {
									var sdata={};
									$.each(data, function(index, value){
										sdata[_sanitize(index)]=value;
									});
								}else{
									sdata=data;
								}
								// Create cross translation dictionary
								var cross={};
								$.each($.sls.translations, function(index, value){
									if ($.type(sdata[index])!=="undefined"){
										cross[value]=sdata[index];
									}
								});
								// Do cross translation
								_translate($(document), true, $.sls.settings.lang, lang, cross, false, true);
								// Save new dictionary
								$.sls.translations=sdata;
								// Translate remaining from default language
								_translate($(document), true, $.sls.settings.defaultLang, lang, $.sls.translations);
								// Save new language
								$.sls.settings.lang=lang;
								if ($.sls.settings.persistent){
									$.sls.saveLang();
								}
								// Trigger custom event with the new lang parameter
								$.event.trigger({type: "jquery-sls-language-switched", message: lang});
							});
							_exec();
						},
						error: function (jqXHR, textStatus) {
							throw('Error loading language: '+lang+' ('+textStatus+')');
						}						
					});
				}
			}
		},
		
		/**
		* t()
		*
		* Translate single string from default language to current language.
		*
		* @param string str : String to translate
		*/
		t: function(str) {
			$.each(this.translations, function(index, value){
			    if (str==index){
				    str = value;
			    }
			});
			return str;
		}
				
	};
	
	/**
	* _exec()
	*
	* Private method used internally. Execute the function in queue, decrease the chance of unexpected behavior.
	*/
	var _exec=function(recursion) {
		if (recursion || ($.sls.executing==false)) {
			$.sls.executing==true;
			if ($.sls.queue.length) {
				// Get the function from queue (with FIFO ordering)
				var f=$.sls.queue.shift();
				f();
				if ($.sls.queue.length) {
					// We don't want another recursion tree (the first one will already handle any appended jobs)
					_exec(true);
				}
			}
			$.sls.executing==false;
		}
	};
		
	/**
	* _sanitize()
	*
	* Private method used internally. Trim, remove excessive spaces.
	*/
	var _sanitize=function(str) {
		if ($.sls.settings.clean) {
			// Trim, remove excessive spaces
			// New lines handled separately (\s already handles new lines but the below pattern does not handle single \n)
			return $.trim(str).replace(/[\r\n]+/g, ' ').replace(/\s\s+/g, ' ');
		}else{
			// Only trim
			return $.trim(str);			
		}
	};
		
	/**
	* _kvp()
	*
	* Private method used internally. Process key-value pair.
	*/
	var _kvp=function(object, index, value, toLang) {
		// Translate innerHTML
		//var key=_sanitize($(object).text());
		var key=_sanitize($(object).html());
		//if (key==index){
		if (key==_sanitize(index)){
			// TODO: Conflicts with MutationObserver. Changing attributes before value is a temporary a solution.
			$(object).attr( "lang",toLang );
			$.sls.htmlO.call($(object), value );
		}		
		// Translate known attributes
		$.each($.sls.attr, function(i, v){
			var attrValue=$(object).attr(v);
			if (attrValue==index){
				$(object).attr("lang",toLang);
				// Translate attribute, remove html tags in translation (Other html entities should be handled manually!)
				$(object).attr(v, value.replace(/<[^<]*>/g, ''));
			}
		});
		// Translate some input types by values
		$(object).filter('input[type="button"], input[type="submit"], input[type="reset"], input[type="hidden"], button').each(function() {
			var val=$(object).val();
			if (val==index){
				$(object).attr("lang",toLang);
				$(object).val(value.replace(/<[^<]*>/g, ''));
			}
		});
	};
	
	/**
	* _translate()
	*
	* Private method used internally. Main translate function.
	*/
	var _translate=function(object, descendants, fromLang, toLang, translations, reverse, fallback) {		
		object=(descendants) ? object.find('[lang="'+fromLang+'"]') : object.filter('[lang="'+fromLang+'"]');
		object.each(function(idx, element) {
			$.each(translations, function(index, value){
				var tindex=(reverse) ? value : index;
				var tvalue=(reverse) ? index : value;
				_kvp(element, tindex, tvalue, toLang);
			});
			// Switch back to default language if cross translation not found
			if (fallback && ($(element).attr("lang")==$.sls.settings.lang)){
				$.each($.sls.translations, function(index, value){
					_kvp(element, value, index, $.sls.settings.defaultLang);
				});
			}
		});
	};
	
	/**
	* _log()
	*
	* Private method used internally. Console log
	*/
	var _log= function(str) {
		if (console && console.log) {
			console.log(str);
		}		
	};
	
	/**
	* sls()
	*
	* Declare jQuery function to translate by jQuery selector from default language to current language.
	*
	* @return object : jQuery chainable object
	*/
	$.fn.sls= function() {
		// Translate selected element
		_translate(this, false, $.sls.settings.defaultLang, $.sls.settings.lang, $.sls.translations);
		// Translate descendent elements		
		_translate(this, true, $.sls.settings.defaultLang, $.sls.settings.lang, $.sls.translations);		
		// Make plugin method chainable
		return this;
	};
	
	/**
	* Declare jQuery variable
	*/	
	$.sls=sls;
	
})(jQuery, document);
