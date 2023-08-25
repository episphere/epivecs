// NOTES:
// * It is wise to normalize input to self-organizing maps, we do not do it automatically here.
import { shuffle as listShuffle, sum, minIndex, mean, deviation } from 'd3-array';
import { randomNormal } from 'd3-random';
import { add, subtract, euclideanDistance, indices } from "./helper.js";
export class SOM {
    shape;
    k;
    initialLr;
    lr;
    sigma;
    maxIter;
    distanceFunction;
    locations;
    dim = -1;
    weights;
    constructor(shape, opts = {}) {
        this.shape = shape;
        this.k = this.shape[0] * this.shape[1];
        const defaults = {
            lr: 1,
            sigma: 1,
            maxIter: 3000,
        };
        const args = {
            ...defaults,
            ...opts
        };
        this.initialLr = args.lr;
        this.lr = args.lr;
        this.sigma = args.sigma;
        this.maxIter = args.maxIter;
        if (opts.distanceFunction != null) {
            this.distanceFunction = opts.distanceFunction;
        }
        else {
            this.distanceFunction = euclideanDistance;
        }
        this.locations = indices(this.shape[0], this.shape[1]);
    }
    fit(vectors, epochs = 1, shuffle = true) {
        const n = vectors.length;
        this.dim = vectors[0].length;
        for (const vector of vectors) {
            if (vector.length != this.dim) {
                throw new Error("Vectors must be of equal length");
            }
        }
        this.#initRandNormal(vectors);
        let globalIterCount = 0;
        const maxIter = Math.min(epochs * n, this.maxIter);
        for (let epoch = 0; epoch < epochs; epoch++) {
            if (globalIterCount > this.maxIter)
                break;
            let indices = Array.from({ length: n }, (_, i) => i);
            if (shuffle) {
                listShuffle(indices);
            }
            for (const idx of indices) {
                if (globalIterCount > this.maxIter)
                    break;
                const input = vectors[idx];
                this.#step(input);
                globalIterCount++;
                this.lr = (1 - (globalIterCount / maxIter)) * this.initialLr;
            }
        }
    }
    getResult() {
        return {
            locations: this.locations,
            weights: this.weights
        };
    }
    #step(input) {
        const bmuIndex = this.#findBmu(input);
        const bmuLocation = this.locations[bmuIndex];
        const bmuDistances = this.locations.map(loc => sum(subtract(loc, bmuLocation).map(d => d ** 2)));
        const neighborhood = bmuDistances.map(d => Math.exp((d / (this.sigma ** 2)) / -1));
        const localStep = neighborhood.map(d => d * this.lr);
        const delta = this.weights.map((weight, i) => subtract(input, weight).map(d => d * localStep[i]));
        for (let i = 0; i < this.weights.length; i++) {
            this.weights[i] = add(this.weights[i], delta[i]);
        }
    }
    #findBmu(vector) {
        const distances = this.weights.map(d => this.distanceFunction(d, vector));
        return minIndex(distances);
    }
    #initRandNormal(vectors) {
        const distributions = [];
        for (let i = 0; i < this.dim; i++) {
            const dimMean = mean(vectors, d => d[i]);
            const dimStd = deviation(vectors, d => d[i]);
            distributions.push(randomNormal(dimMean, dimStd));
        }
        this.weights = [];
        for (let i = 0; i < this.k; i++) {
            this.weights.push(Array.from({ length: this.dim }, (_, i) => distributions[i]()));
        }
    }
    predict(vectors) {
        return vectors.map(vec => this.#findBmu(vec));
    }
}
