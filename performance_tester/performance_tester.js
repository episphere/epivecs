import { clusterEmbed } from "../src/cluster_embedding/dist/cluster_embedding.js"
import * as Plot from 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.11/+esm'

const nInput = document.getElementById("n-input")
const mInput = document.getElementById("m-input")
const methodSelect = document.getElementById("method-select")
const kInput = document.getElementById("k-input")
const spinner = document.getElementById("spinner-container")
const resultsContainer = document.getElementById("results-container")
const runningInfo = document.getElementById("running-info")

for (const method of  [
  ["kmc+sammon", "K-means + Sammon"],
  ["kmc+pca", "K-means + PCA"],
  ["kmc+umap", "K-means + UMAP"],
  ["kmc+tsne", "K-means + t-SNE"],
  ["som", "Self-Organizing Map"],
]) {
  const option = new Option(method[1], method[0])
  methodSelect.appendChild(option)
}

document.getElementById("run-button").addEventListener("click", () => {
  run() 
})

async function run() {
  spinner.classList.remove("d-none")
  resultsContainer.innerHTML = ``
  const timings = []

  const ns = nInput.value.replaceAll(/\s+/g, '').split(",").map(d => parseInt(d))
  for (const n of ns) {
    await new Promise(resolve => setTimeout(resolve, 0));

    const vectors = Array.from({length: n}, () => Array.from({length: parseInt(mInput.value)}, () => -1+Math.random()*2))
    const startTime = performance.now()
    clusterEmbed(vectors, parseInt(kInput.value), methodSelect.value)
    timings.push({n, time: performance.now()-startTime})

    resultsContainer.innerHTML = ``
    resultsContainer.appendChild(Plot.plot({
      grid: true,
      x: {label: "Number of vectors"},
      y: {label: "Time elapsed (ms)"},
      margin: 80,
      marks: [
        Plot.line(timings, {x: "n", y: "time", strokeDasharray:"2,2"}),
        Plot.dot(timings, {x: "n", y: "time"}),
      ]
    }))

    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log(timings)
  spinner.classList.add("d-none")
}