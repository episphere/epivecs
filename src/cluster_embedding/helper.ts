
import { mean, deviation, flatGroup } from 'https://cdn.jsdelivr.net/npm/d3-array@3.2.3/+esm'

const d3 = {
  mean,
  deviation,
  flatGroup
}

type Vector = number[]

export function add(a: Vector, b: Vector) {
  return a.map((d,i) => d+b[i])
}

export function subtract(a: Vector, b: Vector) {
  return a.map((d,i) => d-b[i])
}

export function euclideanDistance(a: Vector, b: Vector) {
  let total = 0
  for (let i = 0; i < a.length; i++) {
    total += (a[i]-b[i])**2
  }
  return Math.sqrt(total)
}

export function indices(m:number, n:number) {
  const indices = []
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      indices.push([i,j])
    }
  }
  return indices
}

export function calculateCentroids(vectors: Vector[], labels: number[]) {
  const grouped = d3.flatGroup(vectors, (d:Vector, i:number) => labels[i])
  const centroids:Vector[] = []
  for (const [label, vectors] of grouped) {
    let centroid = []
    for (let i = 0; i < vectors[0].length; i++) {
      const mean = d3.mean(vectors, d => d[i])
      centroid[i] = mean != undefined ? mean : NaN
    }

    centroids[label] = centroid
  }

  return centroids
}

