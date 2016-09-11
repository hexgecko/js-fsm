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
  
  this._hookErrorMissingEventCallback = undefined;
  this._hookTableUpdateCallback = undefined;
  this._hookStateUpdateCallback = undefined;
  
  this._scope = {};
};

FSM.prototype.append = function(callback) {
  // check so the scope is a function.
  if(typeof callback !== "function") {
    throw "FSM:append(callback): callback given as arument is not a function!";
  }
  
  var tbl = callback.call(this, this._scope);
  
  // just appending to the scope
  if(tbl === undefined) {
    return;
  }
  
  // check so the table is an Array.
  if(!(tbl instanceof Array)) {
    throw("FSM:append(callback): state table returned by the scope function is not an array!")
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
  
  if(this._hookTableUpdateCallback !== undefined) {
    this._hookTableUpdateCallback(this._action);
  }
};

// return a cloure function that will send a transion event when called
FSM.prototype.event = function(evt) {
  var _fsm = this;
  var _evt = evt;
  var _fireEvent = function() {
    // convert the argument to an array
    var args = Array.prototype.slice.call(arguments)
    
    if(_fsm._runAction === false) {
      // check if the current state has any events
      var state = _fsm._action[_fsm._currentState];
      if(state === undefined) {
        throw("FSM:fireEvent(evt): missing state: " + _fsm._currentState);
      }

      // check if the the event argument has an next:action
      var event = state[_evt];
      if(event === undefined) {
        if(_fsm._hookErrorMissingEventCallback !== undefined) {
          _fsm._hookErrorMissingEventCallback(_fsm._currentState, _evt);
          return;
        }
        throw("FSM:fireEvent(evt): missing event: " + _evt + " in current state: " + _fsm._currentState);
      }

      // run the action
      if(event.action !== undefined) {
        _fsm._runAction = true;
        event.action.apply(this, args);
        _fsm._runAction = false;
      }

      // call the hook function for state have changed
      if(_fsm._hookStateUpdateCallback !== undefined) {
        _fsm._hookStateUpdateCallback(_fsm._currentState, _evt, event.next, event.action);
      }

      // move to the next state
      if(event.next === '<') {
        var t = _fsm._currentState;
        _fsm._currentState = _fsm._lastState;
        _fsm._lastState = t;
      } else {
        _fsm._lastState = _fsm._currentState;
        _fsm._currentState = event.next;
      }

      // send any stalled events
      while(_fsm._stalledEvents.length > 0) {
        // pop from the beginning of the stalled events 
        var stalledEvent = _fsm._stalledEvents[0];
        _fsm._stalledEvents.splice(0,1);
        
        // fire the stalled event
        _evt = stalledEvent.evt;
        _fireEvent.apply(this, stalledEvent.args);
      }
    } else {
      // an action is already run, push it to the stall list then
      _fsm._stalledEvents.push({evt: _evt, args: args});
      return;
    }
  }
  
  return _fireEvent;
}

// fire an event to update the state of the fsm
FSM.prototype.fireEvent = function(evt) {
  var args = Array.prototype.slice.call(arguments);
  args.splice(0,1);
  
  this.event(evt).apply(this, args); 
};

// remove all event with the state and event, state can be a string or a RegEx.
// If the event is not given a all state:event pairs are removed.
FSM.prototype.remove = function(state, event) {
  var hasRegExp = false,
      deleteFlag = false;
  
  // the state was written as a regexp
  if(state instanceof RegExp) {
    // no event was given, then remove all stored regexp and
    if(event === undefined) {
      var len = this._actionRegExp.length;
      for(var i=len-1; i>=0; i--) {
        var note = this._actionRegExp[i];
        if(note.regExp.toString() === state.toString()) {
          this._actionRegExp.splice(i, 1);
          hasRegExp = true;
        }
      }
    
    // an event was given, then only remove the expression with that event
    } else {
      var len = this._actionRegExp.length;
      for(var i=len-1; i>=0; i--) {
        var note = this._actionRegExp[i];
        if(note.regExp.toString() === state.toString() && note.event === event) {
          this._actionRegExp.splice(i, 1);
          hasRegExp = true;
          break;
        }
      }
    }
    
    // remove any state that matches the regex expression, if it was in the regexp array
    if(hasRegExp === true) {
      for(var currentState in this._action) {
        // no event given, remove all state that match the given regexp
        if(event === undefined) {
          if(state.test(currentState) === true) {
            delete this._action[currentState];
            deleteFlag = true;
          }
        
        // an event was given, remove all state that match the given rexexp and has the event
        } else {
          for(var stateEvent in this._action[currentState]) {
            if(state.test(currentState) === true && stateEvent === event) {
              delete this._action[currentState][stateEvent];
              deleteFlag = true;
            }
          }
        }
      }
    }
  
  // the state was given as a string
  } else {
    // delete an object that has the state or match the state and event arguments
    for(var currentState in this._action) {
      if(event === undefined) {
        if(currentState === state) {
          delete this._action[currentState];
          deleteFlag = true;
        }
      } else {
        for(var stateEvent in this._action[currentState]) {
          if(currentState === state && stateEvent === event) {
            delete this._action[currentState][stateEvent];
            deleteFlag = true;
          }
        }
      }
    }
  }
  
  // call the hook function if the fsm table was changeds
  if(deleteFlag === true) {
    if(this._hookTableUpdateCallback !== undefined) {
      this._hookTableUpdateCallback(this._action);
    }
  }
}

// set the callback function to call if the try to call event that is not in the current state
FSM.prototype.hookErrorMissingEvent = function(callback) {
  if(typeof callback === "function") {
    this._hookErrorMissingEventCallback = callback;
  } else {
    this._hookErrorMissingEventCallback = undefined;
  }
}

// set the callback function to call when the state table changes
FSM.prototype.hookTableUpdate = function(callback) {
  if(typeof callback === "function") {
    this._hookTableUpdateCallback = callback;
  } else {
    this._hookTableUpdateCallback = undefined;
  }
}

// set the callback function to call when the state changes
FSM.prototype.hookStateUpdate = function(callback) {
  if(typeof callback === "function") {
    this._hookStateUpdateCallback = callback;
  } else {
    this._hookStateUpdateCallback = undefined;
  }
}
