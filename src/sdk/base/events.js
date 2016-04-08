/*
 * Class EventDispatcher provides event handling to sub-classes.
 * It is inherited from Publisher, Room, etc.
 */
Woogeen.EventDispatcher = function (spec) {
  'use strict';
  var that = {};
  // Private vars
  spec.dispatcher = {};
  spec.dispatcher.eventListeners = {};

  // Public functions

/**
   * @function addEventListener
   * @desc This function registers a callback function as a handler for the corresponding event. It's shortened form is on(eventType, listener). See the event description in the following table.<br>
   @htmlonly
<table class="doxtable">
    <thead>
        <tr valign="top">
            <th><b>Event name</b></th>
            <th><b>Description</b></th>
        </tr>
        <tr valign="top">
            <td>server-disconnected</td>
            <td>Indicates the client has been disconnected to the server.</td>
        </tr>
        <tr valign="top">
            <td>user-joined</td>
            <td>Indicates that there is a new user joined. </td>
        </tr>
        <tr valign="top">
            <td>user-left</td>
            <td>Indicates that a user has left conference.</td>
        </tr>
        <tr valign="top">
            <td>message-received</td>
            <td>Indicates there is a new message delivered by server</td>
        </tr>
        <tr valign="top">
            <td>stream-added</td>
            <td>Indicates there is a new stream available.</td>
        </tr>
        <tr valign="top">
            <td>stream-removed </td>
            <td>Indicates one existed stream has been removed. </td>
        </tr>
        <tr valign="top">
            <td>recorder-added</td>
            <td>Indicates there is a new recorder added by server.</td>
        </tr>
        <tr valign="top">
            <td>recorder-removed</td>
            <td>Indicates the recorder has been removed.</td>
        </tr>
        <tr valign="top">
            <td>recorder-continued</td>
            <td>Indicates the recorder has been reused for continuous recording.</td>
        </tr>
    </thead>
</table>
@endhtmlonly
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
   @htmlonly
<table class="doxtable">
    <thead>
        <tr valign="top">
            <th><b>Event name</b></th>
            <th><b>Description</b></th>
        </tr>
        <tr valign="top">
            <td>server-disconnected</td>
            <td>Indicates the client has been disconnected to the server.</td>
        </tr>
        <tr valign="top">
            <td>user-joined </td>
            <td>Indicates a incoming sip call. </td>
        </tr>
        <tr valign="top">
            <td>stream-published </td>
            <td>Indicates the local stream has been publisded.</td>
        </tr>
        <tr valign="top">
            <td>stream-subscribed </td>
            <td>Indicates the remote stream has been subscribed. </td>
        </tr>
        <tr valign="top">
            <td>stream-added </td>
            <td>Indicates the sip call has been established. </td>
        </tr>
        <tr valign="top">
            <td>stream-removed </td>
            <td>Indicates the sip call has been hangup. </td>
        </tr>
        <tr valign="top">
            <td>message-received</td>
            <td>Indicates there is a new message delivered by server</td>
        </tr>
    </thead>
</table>
@endhtmlonly
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
   @htmlonly
<table class="doxtable">
    <thead>
        <tr valign="top">
            <th><b>Event name</b></th>
            <th><b>Description</b></th>
        </tr>
    </thead>
        <tr valign="top">
           <td>server-disconnected</td>
            <td>The client is disconnected from the peer server.</td>
        </tr>
        <tr valign="top">
            <td>chat-invited</td>
            <td>Received an invitation from a remote user. Parameter: senderId for the remote user's ID.</td>
        </tr>
        <tr valign="top">
            <td>chat-denied</td>
            <td>Remote user denied the invitation. Parameter: senderId for the remote user's ID.</td>
        </tr>
        <tr valign="top">
            <td>chat-started</td>
            <td>A new chat is started. Parameter: peerId for the remote user's ID.</td>
        </tr>
        <tr valign="top">
            <td>chat-stopped</td>
            <td>Current chat is stopped. This event is triggered when the chat is stopped by current user. Parameter: peerId for the remote user's ID and senderID for the event sender's ID.</td>
        </tr>
        <tr valign="top">
            <td>stream-added</td>
            <td>A stream is ready to show. Parameter: stream for remote stream, which is an instance of Woogeen.RemoteStream.</td>
        </tr>
        <tr valign="top">
            <td>stream-removed</td>
            <td>A stream has been removed. Parameter: stream for remote stream, which is an instance of Woogeen.RemoteStream.</td>
        </tr>
        <tr valign="top">
            <td>data-received</td>
            <td>Indicates there is new data content arrived which is sent by peer through data channel.</td>
        </tr>
</table>
@endhtmlonly
   * @memberOf Woogeen.PeerClient
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
  that.addEventListener = function (eventType, listener) {
    if (spec.dispatcher.eventListeners[eventType] === undefined) {
      spec.dispatcher.eventListeners[eventType] = [];
    }
    spec.dispatcher.eventListeners[eventType].push(listener);
  };

/**
   * @function on
   * @desc This function equals to {@link Woogeen.ConferenceClient#addEventListener addEventListener}.
   * @memberOf Woogeen.ConferenceClient
   * @instance
   * @param {string} eventType Event string.
   * @param {function} listener Callback function.
*/
  that.on = that.addEventListener;

/**
   * @function removeEventListener
   * @desc This function removes a registered event listener.
   * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
   * @instance
   * @param {string} eventType Event string.
   * @param {function} listener Callback function.
   */
  that.removeEventListener = function (eventType, listener) {
    if (!spec.dispatcher.eventListeners[eventType]) {return;}
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
  that.clearEventListener = function (eventType) {
    spec.dispatcher.eventListeners[eventType] = [];
  };

  // It dispatch a new event to the event listeners, based on the type
  // of event. All events are intended to be LicodeEvents.
  that.dispatchEvent = function (event) {
    if (!spec.dispatcher.eventListeners[event.type]) {return;}
    spec.dispatcher.eventListeners[event.type].map(function (listener) {
      listener(event);
    });
  };

  return that;
};

// **** EVENTS ****

function WoogeenEvent (spec) { // base event class
  'use strict';
  this.type = spec.type;
  this.attributes = spec.attributes;
}

/*
 * Class StreamEvent represents an event related to a stream.
 * It is usually initialized this way:
 * var streamEvent = StreamEvent({type:'stream-added', stream:stream1});
 * Event types:
 * 'stream-added' - indicates that there is a new stream available in the room.
 * 'stream-removed' - shows that a previous available stream has been removed from the room.
 */
Woogeen.StreamEvent = function WoogeenStreamEvent (spec) {
  'use strict';
  WoogeenEvent.call(this, spec);
  this.stream = spec.stream;
  this.msg = spec.msg;
};

/*
 * Class ClientEvent represents an event related to a client.
 * It is usually initialized this way:
 * var clientEvent = ClientEvent({type:'peer-left', user: user1, attr: attributes});
 * Event types:
 * 'client-disconnected' - shows that the user has been already disconnected.
 * 'peer-joined' - indicates that there is a new peer joined.
 * 'peer-left' - indicates that a peer has left.
 */
Woogeen.ClientEvent = function WoogeenClientEvent (spec) {
  'use strict';
  WoogeenEvent.call(this, spec);
  this.user = spec.user;
};

/*
 * Class MessageEvent represents an event related to a custom message.
 */
Woogeen.MessageEvent = function WoogeenMessageEvent (spec) {
  'use strict';
  WoogeenEvent.call(this, spec);
  this.msg = spec.msg;
};

/*
 * Class ChatEvent represents an event related to P2P chat.
 */
Woogeen.ChatEvent = function WoogeenChatEvent (spec) {
  'use strict';
  WoogeenEvent.call(this, spec);
  this.type = spec.type;
  this.senderId = spec.senderId;
  this.peerId = spec.peerId;
};

/*
 * Class DataEvent represents an event related to data channel.
 */
Woogeen.DataEvent = function WoogeenDataEvent (spec) {
  'use strict';
  WoogeenEvent.call(this, spec);
  this.type = spec.type;
  this.senderId = spec.senderId;
  this.data = spec.data;
};

/*
 * Class RecorderEvent represents an event related to media recording.
 */
Woogeen.RecorderEvent = function WoogeenRecorderEvent (spec) {
  'use strict';
  WoogeenEvent.call(this, spec);
  this.recorderId = spec.id;
};

// inheritance
Woogeen.StreamEvent.prototype = Object.create(WoogeenEvent.prototype);
Woogeen.StreamEvent.prototype.constructor = Woogeen.StreamEvent;
Woogeen.ClientEvent.prototype = Object.create(WoogeenEvent.prototype);
Woogeen.ClientEvent.prototype.constructor = Woogeen.ClientEvent;
Woogeen.MessageEvent.prototype = Object.create(WoogeenEvent.prototype);
Woogeen.MessageEvent.prototype.constructor = Woogeen.MessageEvent;
Woogeen.ChatEvent.prototype = Object.create(WoogeenEvent.prototype);
Woogeen.ChatEvent.prototype.constructor = Woogeen.ChatEvent;
Woogeen.DataEvent.prototype = Object.create(WoogeenEvent.prototype);
Woogeen.DataEvent.prototype.constructor = Woogeen.DataEvent;
Woogeen.RecorderEvent.prototype = Object.create(WoogeenEvent.prototype);
Woogeen.RecorderEvent.prototype.constructor = Woogeen.RecorderEvent;
