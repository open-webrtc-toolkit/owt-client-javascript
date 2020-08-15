// Copyright (C) <2020> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* global window, AudioContext, Float32Array */

'use strict';
// ///////////////////////////////////////////////////////////////////////////////
// Handles the WebAssembly kernel for denoising raw audio files in F32Arrayformat
// ///////////////////////////////////////////////////////////////////////////////

import {Module, wasmMemory} from './rnn_denoise.js';

// cwrap wasm API's used here make wasm calls from JS simpler.
const wasmRnndenoiseRawmem = Module.cwrap('rnnDenoise_rawmem',
    'number', ['number', 'number', 'number', 'number']);

const sampleRate = 44100; // Audio Sample rate can be set and controlled here.
const numChannels = 1; // Current channel support limited to 1. Stereo is ToDo.

/**
   * @function wasmDenoiseStream
   * @desc Apply denoising into raw audio data in F32Array format using
   * a WebAssembly port of RNNoise denoising algoritm.
   * @return {Float32Array} fProcessdArr with denoised audio data
   * @param {Float32Array} f32buffer
   */
export function wasmDenoiseStream(f32buffer) {
  // Create and Initialize Wasm memory with input audio data.
  const wasmMemPtr = Module._malloc(f32buffer.length * 4 );
  const wasmMemArr = new Float32Array(wasmMemory.buffer,
      wasmMemPtr, f32buffer.length);
  wasmMemArr.set(f32buffer);

  // Call Wasm denoising kernel
  const wasmRetPtr = wasmRnndenoiseRawmem(wasmMemPtr,
      sampleRate, numChannels, f32buffer.length);

  // Create JS Array from Wasm memory with results
  const fProcessedArr = new Float32Array(wasmMemory.buffer,
      wasmRetPtr, f32buffer.length);

  return fProcessedArr;
}

// ////////////////////////////////////////////////////////////////////
// Creates a WebAudio Based filter for applying audio denoising.
// ///////////////////////////////////////////////////////////////////

// WebAuddio context
window.AudioContext = window.AudioContext || window.webkitAudioContext;
export const audioContext = new AudioContext(); // new AudioContext({sampleRate: 48000});


// Audio buffer size:
//     Accepts powers of 2 between 0 and 16384.
//     Too low causes audio glitches due to buffer underruns
//     Too high could increase latency.
//     Set to 0 and WebAudio API will autopick a value.
const bufferSize = 4096;

export const audioDenoise = (function() {
  const numberOfInputChannels = 1;
  const numberOfOutputChannels = 1;
  let recorder;

  if (audioContext.createScriptProcessor) {
    recorder = audioContext.createScriptProcessor(bufferSize,
        numberOfInputChannels, numberOfOutputChannels);
  } else {
    recorder = audioContext.createJavaScriptNode(bufferSize,
        numberOfInputChannels, numberOfOutputChannels);
  }

  recorder.onaudioprocess = function(e) {
    const input = e.inputBuffer.getChannelData(0);

    const wasmOutput = wasmDenoiseStream(input);

    e.outputBuffer.copyToChannel(wasmOutput, 0, 0);
  };
  return recorder;
})();

