# WebTransport

## Introduction

This post describes changes to OWT JavaScript SDK to support QuicTransport of WebTransport. Other APIs defined in WebTransport might be supported in the future. QuicTransport is only supported in conference mode as an experimental feature.

## API Changes

Following APIs will be changed to support QuicTransport.

- `LocalStream` can be constructed with a `WritableStream`.
- `RemoteStream` can be constructed with a `ReadableStream`.

## Internal Changes

JavaScript SDK creates a QuicTransport with a QUIC agent when QUIC agent is enabled at server side, and WebTransport is supported at client side. When app publishes or subscribes a data stream, a new QuicStream is created.
