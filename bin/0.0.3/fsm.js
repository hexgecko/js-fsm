'use strict'

var FSM = function(defaultState) {
  if(typeof defaultState !== "string") {
    throw("FSM:constructor(defaultState: missing the argument defaultState!")
  }
  
  this._action = {};
  this._actionRegExp = [];
  this._currentState = defaultState;
  this._lastState = defaultState;
  this._runAction = false;
  this._stalledEvents = [];
};

FSM.prototype.append = function(scope) {
  // check so the scope is a function.
  if(typeof scope !== "function") {
    throw "FSM:append(scope): scope given as arument is not a function!";
  }
  
  // check so the table is an Array.
  var tbl = scope();
  if(!(tbl instanceof Array)) {
    throw("FSM:append(scope): state table returned by the scope function is not an array!")
  }

  // create new states for the action
  var len = tbl.length;
  for(var i=0; i<len; i++) {
    var c = tbl[i][0];
    if(!(c instanceof RegExp) && this._action[c] === undefined) {
      this._action[c] = {};
    }  
    var n = tbl[i][2];
    if(n !== '<' && this._action[n] === undefined) {
      this._action[n] = {};
    }
  }

  // add the action to the action table
  for(var i=0; i<len; i++) {
    var row = tbl[i],
        cur = row[0],
        evt = row[1],
        nxt = row[2],
        act = row[3];

    if(cur instanceof RegExp) {
      this._actionRegExp.push({regExp: cur, event: evt, next: nxt, action: act});
    } else {
      this._action[cur][evt] = {next: nxt, action: act};
    }
  }

  // add the event to all the other action that fit its regexpa
  var len = this._actionRegExp.length;
  for(var i=0; i<len; i++) {
    var node   = this._actionRegExp[i],
        regExp = node.regExp
        evt    = node.event,
        nxt    = node.next,
        act    = node.action;

    for(var k in this._action) {
      if(regExp.test(k) && this._action[k][evt] === undefined && nxt !== k) {
        this._action[k][evt] = {next: nxt, action: act};
      }
    }
  }
};

// fire an event to update the state of the fsm
FSM.prototype.fireEvent = function(evt) {
  if(this._runAction === false) {
    // check if the current state has any events
    var state = this._action[this._currentState];
    if(state === undefined) {
      throw("FSM:fireEvent(evt): missing state: " + this._currentState);
    }

    // check if the the event argument has an next:action
    var event = state[evt];
    if(event === undefined) {
      throw("FSM:fireEvent(evt): missing event: " + evt + " in state: " + this._currentState);
    }

    // run the action
    if(event.action !== undefined) {
      // append any arguments and call the action
      var args = [];
      if(arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments);
        args.splice(0, 1);
      }

      this._runAction = true;
      event.action.apply(event.action, args);
      this._runAction = false;
    }

    // move to the next state
    if(event.next === '<') {
      var t = this._currentState;
      this._currentState = this._lastState;
      this._lastState = t;
    } else {
      this._lastState = this._currentState;
      this._currentState = event.next;
    }

    // send any stalled events
    while(this._stalledEvents.length > 0) {
      var args = this._stalledEvents[0];
      this._stalledEvents.splice(0,1);
      FSM.prototype.fireEvent.apply(this, args);
    }
  } else {
    // an action is already run, push it to the stall list then
    this._stalledEvents.push(arguments);
    return;
  }
};
