How to run conference sample
============================

1. Run `npm install`.
2. Edit basicServer.js. Find `N.API.init`, replace service ID, service key and nuve URL with the correct values.
3. Copy your SSL server certificate to cert/certificate.pfx.
4. Run `initcert.js` to generate a keystore file which contains encrypted SSL server's passphase.
5. Run `node basicServer.js` to start conference sample. By default, it listens on port 3001(insecure) and 3004(secure).
6. Open a browser and navigate to http://\<hostname\>:3001/ or https://\<hostname\>:3004/.
