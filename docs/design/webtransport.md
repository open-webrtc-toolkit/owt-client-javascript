# WebTransport

## Introduction

This post describes changes to OWT JavaScript SDK to support QuicTransport of WebTransport. Other APIs defined in WebTransport might be supported in the future. QuicTransport is only supported in conference mode as an experimental feature.

## API Changes

Following APIs will be changed to support QuicTransport.

- `LocalStream` can be constructed with a `WritableStream`.
- `RemoteStream` can be constructed with a `ReadableStream`.
- `ConferenceClient` has new method `createSendStream` which returns a `LocalStream` with a unidirectional stream in it.
- `StreamSourceInfo` has a new bool property `data`.


## Internal Changes

JavaScript SDK creates a QuicTransport with a QUIC agent when QUIC agent is enabled at server side, and WebTransport is supported at client side. When app publishes or subscribes a data stream, a new QuicStream is created.

## Examples

### Send data to a conference

```
const sendStream = conferenceClient.createSendStream();
const localStream = new LocalStream(sendStream, new StreamSourceInfo(undefined, undefined, true));
const publication = await conferenceClient.publish(localStream);
sendStream.stream.write(somethingToWrite);
```

### Receive data from a conference

```
conferenceClient.addEventListener('streamadded', async (event) => {
  if (event.stream.source.data) {  // Data stream.
    const subscription = await conference.subscribe(event.stream);
    const reader = subscription.stream.readable.getReader();
    while (true) {
      const {value, done} = await reader.read();
      if (done) {
        // Stream ends.
        break;
      }
      ProcessData(value);
    }
  }
});
```