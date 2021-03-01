# WebTransport

## Introduction

This post describes changes to OWT JavaScript SDK to support WebTransport. WebTransport is only supported in conference mode as an experimental feature.

The current implementation is based on QuicTransport, which was removed from WebTransport spec. Following changes will move to HTTP3 based WebTransport.

## API Changes

Following APIs will be changed to support WebTransport.

- `LocalStream` can be constructed with a `WritableStream`.
- `RemoteStream` can be constructed with a `ReadableStream`.
- `ConferenceClient` has new method `createSendStream` which returns a `LocalStream` with a unidirectional stream in it.
- `StreamSourceInfo` has a new bool property `data`.


## Internal Changes

JavaScript SDK creates a WebTransport with a QUIC agent when QUIC agent is enabled at server side, and WebTransport is supported at client side. When app publishes or subscribes a data stream, a new `BidirectionalStream` is created.

## Limitations

WebTransport only supported in Chrome since 87. It's not enabled by default. To enable it, you need to [register the origin trail](https://web.dev/webtransport/#register-for-ot) or start Chrome with flag `--enable-experimental-web-platform-features`.

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