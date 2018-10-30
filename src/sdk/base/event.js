// Copyright © 2017 Intel Corporation. All Rights Reserved.

'use strict';

/**
 * @class EventDispatcher
 * @classDesc A shim for EventTarget. Might be changed to EventTarget later.
 * @memberof Oms.Base
 * @hideconstructor
 */
export const EventDispatcher = function() {
  // Private vars
  const spec = {};
  spec.dispatcher = {};
  spec.dispatcher.eventListeners = {};

  /**
   * @function addEventListener
   * @desc This function registers a callback function as a handler for the corresponding event. It's shortened form is on(eventType, listener). See the event description in the following table.<br>
   * @instance
   * @memberof Oms.Base.EventDispatcher
   * @param {string} eventType Event string.
   * @param {function} listener Callback function.
   */
  this.addEventListener = function(eventType, listener) {
    if (spec.dispatcher.eventListeners[eventType] === undefined) {
      spec.dispatcher.eventListeners[eventType] = [];
    }
    spec.dispatcher.eventListeners[eventType].push(listener);
  };

  /**
   * @function removeEventListener
   * @desc This function removes a registered event listener.
   * @instance
   * @memberof Oms.Base.EventDispatcher
   * @param {string} eventType Event string.
   * @param {function} listener Callback function.
   */
  this.removeEventListener = function(eventType, listener) {
    if (!spec.dispatcher.eventListeners[eventType]) {
      return;
    }
    var index = spec.dispatcher.eventListeners[eventType].indexOf(listener);
    if (index !== -1) {
      spec.dispatcher.eventListeners[eventType].splice(index, 1);
    }
  };

  /**
   * @function clearEventListener
   * @desc This function removes all event listeners for one type.
   * @instance
   * @memberof Oms.Base.EventDispatcher
   * @param {string} eventType Event string.
   */
  this.clearEventListener = function(eventType) {
    spec.dispatcher.eventListeners[eventType] = [];
  };

  // It dispatch a new event to the event listeners, based on the type
  // of event. All events are intended to be LicodeEvents.
  this.dispatchEvent = function(event) {
    if (!spec.dispatcher.eventListeners[event.type]) {
      return;
    }
    spec.dispatcher.eventListeners[event.type].map(function(listener) {
      listener(event);
    });
  };
};

/**
 * @class OmsEvent
 * @classDesc Class OmsEvent represents a generic Event in the library.
 * @memberof Oms.Base
 * @hideconstructor
 */
export class OmsEvent {
  constructor(type) {
    this.type = type;
  }
}

/**
 * @class MessageEvent
 * @classDesc Class MessageEvent represents a message Event in the library.
 * @memberof Oms.Base
 * @hideconstructor
 */
export class MessageEvent extends OmsEvent {
  constructor(type, init) {
    super(type);
    /**
     * @member {string} origin
     * @instance
     * @memberof Oms.Base.MessageEvent
     * @desc ID of the remote endpoint who published this stream.
     */
    this.origin = init.origin;
    /**
     * @member {string} message
     * @instance
     * @memberof Oms.Base.MessageEvent
     */
    this.message = init.message;
    /**
     * @member {string} to
     * @instance
     * @memberof Oms.Base.MessageEvent
     * @desc Values could be "all", "me" in conference mode, or undefined in P2P mode..
     */
    this.to = init.to;
  }
}

/**
 * @class ErrorEvent
 * @classDesc Class ErrorEvent represents an error Event in the library.
 * @memberof Oms.Base
 * @hideconstructor
 */
export class ErrorEvent extends OmsEvent{
  constructor(type, init) {
    super(type);
    /**
     * @member {Error} error
     * @instance
     * @memberof Oms.Base.ErrorEvent
     */
    this.error = init.error;
  }
}

/**
 * @class MuteEvent
 * @classDesc Class MuteEvent represents a mute or unmute event.
 * @memberof Oms.Base
 * @hideconstructor
 */
export class MuteEvent extends OmsEvent {
  constructor(type, init){
    super(type);
    /**
     * @member {Oms.Base.TrackKind} kind
     * @instance
     * @memberof Oms.Base.MuteEvent
     */
    this.kind = init.kind;
  }
}
