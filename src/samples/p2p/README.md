#How to run p2p sample
###1st step: Run Woogeen p2p server
To run the server, you need to install node and npm, then change directory into server, and install all modules listed as dependencies in package.json by using command **`npm install`**  .
After dependencies successfully installed,  you can run the peerserver.js bu using command **`node peerserver.js`**. It will listen on port 8085/8096.
###2nd step:  Deploy p2p sample page and sdk on web server
You need to edit the sample page `peercall.html`:

 - Set serverAddress in line 130, change `example.com` to your p2p server address.
 - Set correct ICE server address.

Then choose a webserver such as apache, deploy the page and sdk.

###3rd step: Visit the website
You can visit the page on web browser