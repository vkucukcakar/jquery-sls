# jquery-sls

Simple language switcher for jQuery 

This is a jQuery plugin that I have been working on in the past. It is also an example of overriding jQuery's html(), text() methods, MutationObservers etc...

* Easily searches document and applies translations on client side
* Dynamic language loading with ajax
* Supports translations at json format
* Language selection persists across pages (with HTML5 storage and cookie fallback)
* Match by sanitized text and replace with html
* Clean sanitization to remove excessive spaces and better matching
* Supports all container tags (innerHTML translation), known attributes like "title", "alt", "href", "placeholder", "src", custom attributes, values
* Of course, it is for web applications (If you have a traditional web page, you should serve your multiple language pages for compatibility with search engines)

## Usage

Include script at html header.

	<script src="jquery-sls.js" charset="utf-8" type="text/javascript"></script>


You must have a default language and all the html files must be written in default language.
Language json files default language texts as keys.
Assuming that default language code is "en", add lang="en" attribute to all html elements that 
you want to be translated.

Call init() once. You can override the following self explanatory options.
	
	$.sls.init({
		defaultLang: "en",
		path: "/languages/",
		persistent: true
	});

Switch language with a simple command. This command translates the whole document automatically.

	$.sls.setLang("tr");

Get current language code:

	var lang = $.sls.getLang();

Translate single string from default language to current language. 
This function is for using with your custom javascript files.

	var hello = $.sls.t("Hello World.");
	
Translate an element matched by jQuery selector from default language to current language. 
This function is also chainable.	

	$("#mydiv").sls();























