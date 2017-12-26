'use strict';

/*
 * A shim for EventTarget.
 */
export const EventDispatcher = function() {
  // Private vars
  const spec = {};
  spec.dispatcher = {};
  spec.dispatcher.eventListeners = {};

  // Public functions

  /**
     * @function addEventListener
     * @desc This function registers a callback function as a handler for the corresponding event. It's shortened form is on(eventType, listener). See the event description in the following table.<br>
     * @memberOf Woogeen.ConferenceClient
     * @instance
     * @param {string} eventType Event string.
     * @param {function} listener Callback function.
     * @example
  <script type="text/JavaScript">
  ...
  //client.on("server-disconnected", function (evt) {...});
  client.addEventListener("server-disconnected", function (evt) {...});
  </script>
     */
  /**
   * @function addEventListener
   * @desc This function registers a callback function as a handler for the corresponding event. It's shortened form is on(eventType, listener). See the event description in the following table.<br>
   * @memberOf Woogeen.SipClient
   * @instance
   * @param {string} eventType Event string.
   * @param {function} listener Callback function.
   * @example
<script type="text/JavaScript">
...
//client.on("server-disconnected", function (evt) {...});
client.addEventListener("server-disconnected", function (evt) {...});
</script>
   */
  /**
   * @function addEventListener
   * @desc This function registers a callback function as a handler for the corresponding event. It's shortened form is on(eventType, listener). See the event description in the following table.<br>
   * @memberOf Woogeen.PeerClient
   * @instance
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
   * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
   * @instance
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
   * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
   * @instance
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

/*
 * Class IcsEvent represents a generic Event in the library.
 * It handles the type of event, that is important when adding
 * event listeners to EventDispatchers and dispatching new events.
 */
export class IcsEvent {
  constructor(type) {
    this.type = type;
  }
}

export class MessageEvent extends IcsEvent {
  constructor(type, init) {
    super(type);
    this.origin = init.origin;
    this.message = init.message;
  }
}
