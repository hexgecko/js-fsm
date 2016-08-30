'use strict'

// a list with hash that contains id to the menu item and an url to the template address 
var pageList = {
  '#home': {
    menuItem: "menu-item-home",
    templateUrl: "page/home.template.html"
  },
  
  '#blog': {
    menuItem: "menu-item-blog",
    templateUrl: "page/blog.template.html"
  },
  
  '#post-1': {
    menuItem: "menu-item-blog",
    templateUrl: "post/post-1.template.html"
  },
  
  '#post-2': {
    menuItem: "menu-item-blog",
    templateUrl: "post/post-2.template.html"
  },
  
  '#about': {
    menuItem: "menu-item-about",
    templateUrl: "page/about.template.html"
  },
};

// create a new fsm object with the first state of '!'
var websiteState = new FSM('!');

// fire a ready event when the document is loaded
$(document).ready(function() {
  websiteState.fireEvent('ready');
});

// append the initalize state '!'
websiteState.append(function() {
  
  // called when the document is ready, initalize the webpage
  function initalize() {
    // if no hash address is given, go to the home page
    if(pageList[location.hash] === undefined) {
      // overwrite the history so it start at #home and change the location to #home
      history.replaceState({}, "", "#home");
      location.hash = "#home";
    }
    
    // listen to the hashchange message and update the fsm state if it's changed
    $(window).on('hashchange', function() {
      var hash = location.hash;
      var page = pageList[hash];
      
      // check if the page is in the list else go home.
      if(page !== undefined) {
        websiteState.fireEvent('load' + location.hash, page.menuItem, page.templateUrl);
      } else {
        location.hash = "#home";
      }
    });
    
    // finnaly load the current hash location
    var hash = location.hash;
    var page = pageList[hash];
    websiteState.fireEvent('load' + hash, page.menuItem, page.templateUrl);
  }
  
  return [
    // setup the app when the document is ready
    ['!', 'ready', '!', initalize]
  ];
});

// add the pages in the hash list
for(var hash in pageList) {
  (function(hash) {
    // append the new state for the homepage
    websiteState.append(function() {
      
      // called when the page is loaded
      function loadPage(menuItem, templateUrl) {
        // deselect all menu item and select the one in the give menu item
        $('nav a').removeClass('selected');
        $('#' + menuItem).addClass('selected');
        
        // add the loading elment
        $('#loader').addClass('show');
        $('.spinner').addClass('show');
        
        // wait 300ms to show the wait icon, then load the home template and fire a 'ready' when loaded
        setTimeout(function() {
          $('#content').load(templateUrl, function() {
            websiteState.fireEvent('ready');
          });
        }, 300);
      }

      // called when the page is ready
      function pageReady() {
        // remove the loading element
        $('#loader').removeClass('show');
        $('.spinner').removeClass('show');
      }
      
      // reload the current page in case the user change the url while loading
      function reloadPage() {
        location.reload();
      }

      return [
        // go to the state 'loading-x' from the initalize state '!' or from a state staring with #
        [/!|^#/, 'load' + hash, 'loading' + hash, loadPage],
        
        // go to the @home state when the page is loaded
        ['loading' + hash, 'ready', hash, pageReady],
        
        // try to reload the page if the user change the hash url while the page is loading
        [/^loading#\w+/, 'load' + hash, '!', reloadPage]
      ];
    });
  })(hash);
};
