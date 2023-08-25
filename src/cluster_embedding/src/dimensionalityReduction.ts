import * as PCA from 'pca-js'
import { UMAP } from 'umap-js'
import {sammon as sammonDR} from "./sammon_js.js"

type Vector = number[]

export function pca(vectors: Vector[], dim:number): Vector[] {

  const eigenVectors = PCA.getEigenVectors(vectors, dim)
  const adjusted = PCA.computeAdjustedData(vectors, ...eigenVectors.slice(0,dim)).adjustedData

  const embedded = []
  for (let i = 0; i < vectors.length; i++) {
    embedded.push(Array.from({length: dim}, (_,j) => adjusted[j][i]))
  }

  return embedded
}

export function umap(vectors: Vector[], dim:number): Vector[] {
  const umap = new UMAP({nNeighbors: Math.min(vectors.length-1, 15)}) 
  umap.fit(vectors)
  return umap.getEmbedding()
}

// t-SNE removed due to potential security vulnerability in npm package 

// export function tsne(vectors: Vector[], dim:number) {
//   const model = new TSNE({dim: dim, perplexity: vectors.length < 10 ? vectors.length-1 : 10})
//   model.init({data: vectors})
//   model.run()
//   return model.getOutput()
// }

export function sammon(vectors: Vector[], dim: number): Vector[] {
  const embedded = sammonDR(vectors, dim)
  return embedded.vectors
}