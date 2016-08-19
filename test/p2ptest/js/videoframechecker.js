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

function VideoFrameChecker(videoElement) {
  this.frameStats = {
    numFrozenFrames: 0,
    numBlackFrames: 0,
    numFrames: 0
  };
 console.log("VideoFrameChecker videoElements is ,", videoElement);
  this.running_ = true;

  this.nonBlackPixelLumaThreshold = 20;
  this.previousFrame_ = [];
  this.identicalFrameSsimThreshold = 0.985;
  this.differenceThreshold = 0;
  this.frameComparator = new Ssim();

  this.canvas_ = document.createElement('canvas');
  this.videoElement_ = videoElement;
  this.listener_ = this.checkVideoFrame_.bind(this);
  this.videoElement_.addEventListener('play', this.listener_, false);
  //document.body.appendChild(this.canvas_);
 
  
}

VideoFrameChecker.prototype = {
  stop: function() {
    this.videoElement_.removeEventListener('play' , this.listener_);
    this.running_ = false;
  },

  getCurrentImageData_: function() {
    console.log("VideoFrameChecker videoElements videoWith is ,", this.videoElement_.videoWidth);
    console.log("VideoFrameChecker videoElements videoHeightis ,", this.videoElement_.videoHeight);
    this.canvas_.width = this.videoElement_.videoWidth;
    this.canvas_.height = this.videoElement_.videoHeight;

    if(this.canvas_.width == 0 || this.canvas_.height == 0) {
      return;
    }

    var context = this.canvas_.getContext('2d');
    context.drawImage(this.videoElement_, 0, 0, this.canvas_.width,
                      this.canvas_.height);
    return context.getImageData(0, 0, this.canvas_.width, this.canvas_.height);
  },

  checkVideoFrame_: function() {
    if (!this.running_) {
      return;
    }
    if (this.videoElement_.ended) {
      return;
    }

    var imageData = this.getCurrentImageData_();

    if(!imageData) {
      //console.log("cureentImageData is ", imageData.data);
      return;
    }
    //console.log("cureentImageData is ", imageData.data);
   // console.log("previousFrame is ", this.previousFrame_);
    if (this.isBlackFrame_(imageData.data, imageData.data.length)) {
      this.frameStats.numBlackFrames++;
    }
   console.log("aaaiiiiiiiithis.frameComparator.calculate(this.previousFrame_, imageData.data)", this.frameComparator.calculate(this.previousFrame_, imageData.data));
   console.log("bbbbbbbbb this.differenceThreshold is ",this.differenceThreshold);
    if (this.frameComparator.calculate(this.previousFrame_, imageData.data) >
        this.identicalFrameSsimThreshold) {
      this.frameStats.numFrozenFrames++;
    }else if((this.frameComparator.calculate(this.previousFrame_, imageData.data) ==  this.differenceThreshold) && (this.frameComparator.calculate(this.previousFrame_, imageData.data) != 0 )){
      this.frameStats.numFrozenFrames++;
    
    }
    this.differenceThreshold = this.frameComparator.calculate(this.previousFrame_, imageData.data);
    this.previousFrame_ = imageData.data;
  
    this.frameStats.numFrames++;
    setTimeout(this.checkVideoFrame_.bind(this), 20);
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
