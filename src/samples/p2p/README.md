# How to run p2p sample

## Step 1: Run p2p server
To run the server, you need to install node and npm, then change into the [owt-server-p2p](https://github.com/open-webrtc-toolkit/owt-server-p2p) source directory, and install all modules listed as dependencies in package.json by using command `npm install`  .
After the dependencies are successfully installed, you can run the peer server by using the command `node peerserver.js`. It will listen on ports 8095/8096.

## Step 2:  Deploy p2p sample page and sdk on web server
You need to edit the sample page `peercall.html`:

 - Set serverAddress on line 112: change `example.com` to your p2p server address.
 - Set correct ICE server addresses below that.

Then choose a webserver such as Apache, and deploy the page and the sdk.

## Step 3: Visit the website
You can then visit the page from a web browser, with a URL such as https://server.domain.com:<PORT>/peercall.html

Open the web page from two clients with cameras connected, and choose two names. On one, type the first name and click **Login**, then type the second name and click **Set Remote Id**. On the other client, swap the names. Then click **Share Camera** on each to stream video.
