JavaScript FSM (Finite State Machine)
=====================================

What is a FSM?
--------------

FSM is a model for keeping track of a finite number of states, where the machine can only be in one state at the time; the _current state_. It can change state to the _next state_ when an _event_ is triggered, this can perform some sort of _action_. The machine is usually defined as a table with four columns: _Current State_, _Transition Event_, _Next State_ and _Action_.

Because of the FSM model's simplicity and ability to handle asynchronous code, it can be in good use in a single-page application, among others.

Usage
-----

_Constructor:_ Create a new FSM object by calling the constuctor, where the first argument is the default state.

    var fsm = FSM('init');

_Append:_ Takes a scope function as an argument, this function should then return a state table whose state is appended to the model.

    fsm.append(function() {
      
      function onReady() {
        /* initalize things here... */
      }
      
      function onLoad(templatUrl) {
        /* load and initalize a templates here... */
      }
      
      return [
        ['^init', 'ready', 'home', onReady],
        [/^\w+/,  'load'   'home', onLoad]
      ];
    })
  
The state table has the following structure: [_Current State_, _Transition Event_, _Next State_, _Action_].

  - _Current State_: Can be a string with the state name or a RegExp object, if a RegExp object is given it will add the event to every state that matches that expression, except the _next state_.
  - _Transition Event_: Change the state of the machine, if applicable.
  - _Next State_: Name of the next state. If a '<' given it will go to the last state.
  - _Action_: Function that perform some kind of _action_, can be omitted.

_fireEvent_: Fires a transition event with arguments. It will call the action with the given arguments and change the state according to the FSM table. If there are no _current state_ and _event_ pairs an error will be thrown.

    fsm.fireEvent('load', "page/home.template.html");

Example: Single Page Website
----------------------------

[This demo](https://hexgecko.github.io/js-fsm/single-page-website/#home) shows a simple single-page website where the content of the page is load as a template using a jQuery ajax call. Source code for the project can be found [here](https://github.com/hexgecko/js-fsm/tree/master/docs/single-page-website).

The site have the following state:

![Show the states the single-page website has](https://raw.githubusercontent.com/hexgecko/js-fsm/master/docs/single-page-website/img/states.jpg)

_where #x and #y are hash addresses to a pages._

The default state is the '!' where it wait for the document to get ready. When it's ready, the logic to send event when the hash address is change is inialized. If a hash address event is send it goes to the loading state for that page, here it loads the page template to the content and display a spinner while loading. When the loader is complete it will change the state to the #x state and wait for the next #y address to be change. There is a special case if the user try to change page while it's loading, the site will then be reloaded with the new hash page.

Download
--------

Clone the project:

    git clone https://github.com/hexgecko/js-fsm.git

CDN:

    https://rawgit.com/hexgecko/js-fsm/master/bin/0.0.3/fsm.js

CDN minified:

    https://rawgit.com/hexgecko/js-fsm/master/bin/0.0.3/fsm.min.js

License
-------

This content is released under the [MIT License](http://opensource.org/licenses/MIT).
