// TODO: replace with version from utiliies once issues have been addressed.
/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

/* eslint-env node */
/* eslint-env browser */
function Ssim() {}

Ssim.prototype = {
  // Implementation of Eq.2, a simple average of a vector and Eq.4., except the
  // square root. The latter is actually an unbiased estimate of the variance,
  // not the exact variance.
  statistics: function(a) {
    var accu = 0;
    var i;
    for (i = 0; i < a.length; ++i) {
      accu += a[i];
    }
    var meanA = accu / (a.length - 1);
    var diff = 0;
    for (i = 1; i < a.length; ++i) {
      diff = a[i - 1] - meanA;
      accu += a[i] + (diff * diff);
    }
    return {mean: meanA, variance: accu / a.length};
  },

  // Implementation of Eq.11., cov(Y, Z) = E((Y - uY), (Z - uZ)).
  covariance: function(a, b, meanA, meanB) {
    var accu = 0;
    for (var i = 0; i < a.length; i += 1) {
      accu += (a[i] - meanA) * (b[i] - meanB);
    }
    return accu / a.length;
  },

  calculate: function(x, y) {
    if (x.length !== y.length) {
      return 0;
    }

    // Values of the constants come from the Matlab code referred before.
    var K1 = 0.01;
    var K2 = 0.03;
    var L = 255;
    var C1 = (K1 * L) * (K1 * L);
    var C2 = (K2 * L) * (K2 * L);
    var C3 = C2 / 2;

    var statsX = this.statistics(x);
    var muX = statsX.mean;
    var sigmaX2 = statsX.variance;
    var sigmaX = Math.sqrt(sigmaX2);
    var statsY = this.statistics(y);
    var muY = statsY.mean;
    var sigmaY2 = statsY.variance;
    var sigmaY = Math.sqrt(sigmaY2);
    var sigmaXy = this.covariance(x, y, muX, muY);

    // Implementation of Eq.6.
    var luminance = (2 * muX * muY + C1) /
        ((muX * muX) + (muY * muY) + C1);
    // Implementation of Eq.10.
    var structure = (sigmaXy + C3) / (sigmaX * sigmaY + C3);
    // Implementation of Eq.9.
    var contrast = (2 * sigmaX * sigmaY + C2) / (sigmaX2 + sigmaY2 + C2);

    // Implementation of Eq.12.
    return luminance * contrast * structure;
  }
};

function VideoFrameChecker(stream, canvasElement) {
  this.frameStats = {
    numFrozenFrames: 0,
    numBlackFrames: 0,
    numFrames: 0
  };
  this.running_ = true;

  this.nonBlackPixelLumaThreshold = 20;
  this.previousFrame_ = [];
  this.identicalFrameSsimThreshold = 0.985;
  if (navigator.userAgent.indexOf('Safari') >= 0 && navigator.userAgent.indexOf('Chrome') == -1){
    this.identicalFrameSsimThreshold = 0.987;
  }
  this.differenceThreshold = 0;
  this.frameComparator = new Ssim();

  this.canvas_ = canvasElement;
  this.stream_ = stream;
  this.listener_ = this.checkVideoFrame_.bind(this);
}

VideoFrameChecker.prototype = {
   stop: function() {
    this.running_ = false;
  },

  getCurrentImageData_: function() {
    return new Promise((resolve,reject)=>{
        const track = this.stream_.mediaStream.getVideoTracks()[0];
        let imageCapture = new ImageCapture(track);
        var context = this.canvas_.getContext('2d');
        setTimeout(()=>{
            imageCapture.grabFrame().then((imageBitmap)=>{
                  context.drawImage(imageBitmap, 0, 0, 320, 240);
                  resolve(context)
            }).catch((err)=>{
                console.log("err.name:",err.name)
                reject(err)
            })
        }, 500)
    })
  },

  checkVideoFrame_: function() {
    if (!this.running_) {
      return;
    }

    return new Promise((resolve, reject)=>{
        this.getCurrentImageData_().then((context)=>{
            var imageData = context.getImageData(0, 0, 320, 240);
            if(!imageData) {
              console.log("CureentImageData is ", imageData.data);
            }else{
                if (this.isBlackFrame_(imageData.data, imageData.data.length)) {
                  this.frameStats.numBlackFrames++;
                }
                let currentCalculate = this.frameComparator.calculate(this.previousFrame_, imageData.data)
                console.log("This.frameComparator.calculate(this.previousFrame_, imageData.data)", currentCalculate);
                if (currentCalculate > this.identicalFrameSsimThreshold) {
                  this.frameStats.numFrozenFrames++;
                }else if((currentCalculate ==  this.differenceThreshold) && (currentCalculate != 0 )){
                  this.frameStats.numFrozenFrames++;
                }
                this.differenceThreshold = currentCalculate;
                this.previousFrame_ = imageData.data;

                this.frameStats.numFrames++;
            }

            setTimeout(this.checkVideoFrame_.bind(this), 500);
            resolve()
        }).catch((err)=>{
            setTimeout(this.checkVideoFrame_.bind(this), 500);
            resolve()
        })
    })
  },

  isBlackFrame_: function(data, length) {
    // TODO: Use a statistical, histogram-based detection.
    var thresh = this.nonBlackPixelLumaThreshold;
    var accuLuma = 0;
    for (var i = 4; i < length; i += 4) {
      // Use Luma as in Rec. 709: Y′709 = 0.21R + 0.72G + 0.07B;
      accuLuma += 0.21 * data[i] + 0.72 * data[i + 1] + 0.07 * data[i + 2];
      // Early termination if the average Luma so far is bright enough.
      if (accuLuma > (thresh * i / 4)) {
        return false;
      }
    }
    return true;
  }
};

window.VideoFrameChecker = VideoFrameChecker;
