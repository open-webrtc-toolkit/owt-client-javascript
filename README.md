# Open WebRTC Toolkit JavaScript SDK

Open WebRTC Toolkit JavaScript SDK builds on top of the W3C standard WebRTC APIs to accelerate development of real-time communications (RTC) for web applications, including peer-to-peer, broadcasting, and conference mode communications.

## How to build release package
1. Run `npm install -g grunt-cli` to install grunt. (You may need to `chown -R $USER /usr/local` for this to work.)
2. Go to "scripts" folder.
3. Run `npm install` to install development dependencies.
4. Run `grunt`.
5. Get release package in "dist" folder.

## How to build uncompressed SDK
Run `grunt debug` in "scripts" folder and get files in "dist/sdk-debug".

## Where to find API documents
Run `grunt jsdoc` in "scripts" folder and get docs in "dist/docs".

## How to contribute
We warmly welcome community contributions to Open WebRTC Toolkit JavaScript SDK repository. If you are willing to contribute your features and ideas to OWT, follow the process below:
- Make sure your patch will not break anything, including all the build and tests
- Submit a pull request onto https://github.com/open-webrtc-toolkit/owt-client-javascript/pulls
- Watch your patch for review comments if any, until it is accepted and merged
OWT project is licensed under Apache License, Version 2.0. By contributing to the project, you agree to the license and copyright terms therein and release your contributions under these terms.

## How to report issues
Use the "Issues" tab on Github.

## See Also
http://webrtc.intel.com
