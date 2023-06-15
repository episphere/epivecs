// NOTES:
// * It is wise to normalize input to self-organizing maps, we do not do it automatically here.

import { shuffle as listShuffle, sum, minIndex, mean, deviation } from 'https://cdn.jsdelivr.net/npm/d3-array@3.2.3/+esm'
import { randomNormal } from 'https://cdn.jsdelivr.net/npm/d3-random@3.0.1/+esm'
import { add, subtract, euclideanDistance, indices} from "./helper.js"

type Vector = number[]

export interface SOMArgs {
  lr?: number, 
  sigma?: number,
  maxIter?: number,
  distanceFunction?: (a: Vector, b: Vector) => number 
}

export class SOM {
  shape: [number, number]
  k: number
  initialLr: number
  lr: number
  sigma: number
  maxIter: number
  distanceFunction: (a: Vector, b: Vector) => number 

  locations: Vector[] 
  
  dim = -1
  weights?: Vector[]


  constructor(shape: [number, number], opts: SOMArgs = {}) {

    this.shape = shape
    this.k = this.shape[0] * this.shape[1]

    const defaults = {
      lr: 1,
      sigma: 1,
      maxIter: 3000,
    }

    const args = {
      ...defaults, 
      ...opts
    }

    this.initialLr = args.lr
    this.lr = args.lr
    this.sigma = args.sigma
    this.maxIter = args.maxIter
    
    if (opts.distanceFunction != null) {
      this.distanceFunction = opts.distanceFunction
    } else {
      this.distanceFunction = euclideanDistance
    }

    this.locations = indices(this.shape[0], this.shape[1])
  }

  fit(vectors: Vector[], epochs=1, shuffle=true) {
    const n = vectors.length 
    this.dim = vectors[0].length
    
    for (const vector of vectors) {
      if (vector.length != this.dim) {
        throw new Error("Vectors must be of equal length")
      }
    }

    this.#initRandNormal(vectors)

    let globalIterCount = 0
    const maxIter = Math.min(epochs * n, this.maxIter)

    for (let epoch = 0; epoch < epochs; epoch++) {
      if (globalIterCount > this.maxIter) break 

      let indices = Array.from({length: n}, (_,i) => i)
      if (shuffle) {
        listShuffle(indices)
      }

      for (const idx of indices) {
        if (globalIterCount > this.maxIter) break

        const input = vectors[idx]
        this.#step(input)

        globalIterCount++
        this.lr = (1 - (globalIterCount / maxIter)) * this.initialLr
      }
    }
  }

  getResult() {
    return {
      locations: this.locations, 
      weights: this.weights
    }
  }

  #step(input: Vector) { 
    const bmuIndex = this.#findBmu(input)
    const bmuLocation = this.locations![bmuIndex]
    const bmuDistances = this.locations!.map(loc => sum(subtract(loc, bmuLocation).map(d => d**2)))
    const neighborhood = bmuDistances.map(d => Math.exp((d / (this.sigma**2))/-1))
    const localStep = neighborhood.map(d => d*this.lr)

    const delta = this.weights!.map((weight,i) => subtract(input, weight).map(d => d*localStep[i]))
    for (let i = 0; i < this.weights!.length; i++) {
      this.weights![i] = add(this.weights![i], delta[i])
    }
  }

  #findBmu(vector: Vector) {
    const distances = this.weights!.map(d => this.distanceFunction(d, vector))
    return minIndex(distances)
  }

  #initRandNormal(vectors: Vector[]) {
    const distributions:(() => number)[] = []
    for (let i = 0; i < this.dim; i++) {
      const dimMean = mean(vectors, d => d[i])
      const dimStd = deviation(vectors, d => d[i])
      distributions.push(randomNormal(dimMean, dimStd))
    }
    
    this.weights = [] 
    for (let i = 0; i < this.k; i++) {
      this.weights.push(Array.from({length: this.dim}, (_,i) => distributions[i]()))
    }
  }

  predict(vectors: Vector[]) {
    return vectors.map(vec => this.#findBmu(vec))
  }
}

