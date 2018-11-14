import {newElement}            from '~/dom.js'
import {clipField, newField, newParticles, updateParticles,
        updateParticles2, newModel}              
                               from '~/data.js'
import {closeToMiddle, percentInZone, distanceTraveled}         
                               from '~/loss.js'

import {drawScene}         from '~/draw.js'
import css from '~/file.css';

import * as tf from '@tensorflow/tfjs'

import * as dat from 'dat.gui';

import {seededRandom} from '~/rand.js'
import * as learn from '~/learn.js'
import * as chart from '~/chart_optimizer.js'
import * as sdfo from '~/stocastic_dfo_optimizer.js'
import * as mdfo from '~/model_dfo_optimizer.js'

console.log("--- Dev Mode ---")

var killPrevious = function() {};

function clean() {
  document.body.innerHTML = ""
  killPrevious()
}

function clearStates(states) {
  while(states.length > 0) {
    let [p,v] = states.pop();
    p.dispose();
    v.dispose();
  }
}

function start(config) {
  // dt is amount of change in time 
  const dt = 1;
  const chart_data = [];
  const canvas = newElement("canvas", { width: config.width, height: config.height })
  const canvasChart = newElement("canvas", { width: 500, height: 300})

  // The force field
  const model = newModel(config);
  const field = tf.variable(newField(config));
  // The particles of the simulation
  var particles = newParticles(config)

  // const optimizer = learn.randomOptimizer(field, 0.001)
  //
  // const optimizer = mdfo.optimizer(
  //   [field], 
  //   [[-15,15]],
  //   config
  // );

  // const optimizer = sdfo.optimizer([field], config)

  // TODO; Change from trackOptimizer, to postData
  // chart.trackOptimizer(optimizer, canvasChart)
  //
  const optimizer = tf.train.adam(config.learningRate)

  drawScene(canvas, particles, field, config)
  const board = document.createElement("div");
  document.body.appendChild(board);
  document.body.appendChild(canvas)
  document.body.appendChild(canvasChart)

  // Use closure to kill
  var running = true;

  killPrevious = function() { running = false; }

  var updatedParticles;
  var nextParticleState;
  var generation = 0;

  const storedStates = [];
  var p1;
  var p2;
  var counter;

  function run(particles) {
    optimizer.minimize(() => {
      // particles[0].print()
      // for(var i = 0; i < config.updatesPerOptimizer; i++) {
      updatedParticles = 
        // updateParticles(particles, field, 1, config);
        tf.keep(updateParticles2(particles, model, 1, generation, config));

      
      generation++;

      if((generation % config.drawRate) == 0) {
        window.requestAnimationFrame(() => {
          drawScene(canvas, updatedParticles, field, config);
        })
      }


      const val = closeToMiddle(updatedParticles[0], config);
      return val;
    });

    /* Memory Cleanup */
    // if((generation % config.sampleRate) == 0) {
    //   storedStates.push(particles);

    //   if((generation % config.trainRate) == 0) {

    //     optimizer.minimize(() => {
    //       return tf.tidy(() =>  {
    //         const dist = distanceTraveled(particles[0], updatedParticles[0])

    //         const val = closeToMiddle(updatedParticles[0], config);
    //         updatedParticles[0].print()
    //         const val2 = closeToMiddle(updatedParticles[1], config);
    //         val.print()
    //         val2.print()
    //         return val.add(val2);
    //       });
    //     });

    //     clearStates(storedStates);
    //   }

    // } else {
      particles[0].dispose();
      particles[1].dispose();
    // }

    if(running) {
      setTimeout(
        function() { run(updatedParticles) })
    }
  }

  run(particles)
}

window.tf = tf;

const DEV_CONFIG = {
  width:   400,
  height:  400,
  density: 1/50,
  initVelMagnitude: 8.1,
  initVelStdDev: 0.1,
  initForceMagnitude: 0,
  initForceStdDev: 5.1,
  // Make this work
  resetRate: 0.01,
  forceMagnitude: 5.51,
  friction: 0.911,
  maximumVelocity: 3.2,
  maximumForce: 13.2,
  particleCount: 800,
  learningRate: 0.01,
  entropyDecay: 0.99,
  updatesPerOptimizer: 1,
  drawRate: 1,
  sampleRate: 1,
  printRate: 40,
  trainRate: 20,
  randomSeed: 50,
  searchSize: 20,
  epochs: 3,
  drawField: false,
  clip: (i) => clipField(i, 15)
}

// Others
// Contnious 
// fricction: 0.987 More cot
// maxVel : 12.9
// forceMag 1

function makeGUI() {
  const gui = new dat.GUI( { name: "Force Field" });
  gui.add(DEV_CONFIG, "forceMagnitude", 0,10)
  gui.add(DEV_CONFIG, "friction", 0.5,1)
  gui.add(DEV_CONFIG, "maximumVelocity", 0, 60)
  gui.add(DEV_CONFIG, "drawRate", 0, 200, 1);
  gui.add(DEV_CONFIG, "drawField");
  // gui.add(DEV_CONFIG, "randomSeed", 0, 100, 1)
}



if(module.hot) {
  clean()

  makeGUI()
  module.hot.accept();
  start(DEV_CONFIG)
}
