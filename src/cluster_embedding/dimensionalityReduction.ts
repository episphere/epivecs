import { default as PCA} from 'https://cdn.jsdelivr.net/npm/pca-js@1.0.2/+esm'
import { UMAP } from 'https://cdn.jsdelivr.net/npm/umap-js@1.3.3/+esm'
import {default as TSNE} from 'https://cdn.jsdelivr.net/npm/tsne-js@1.0.3/+esm'
import {sammon as sammonDR} from "./sammon_js.js"
//import { UMAP}

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

export function tsne(vectors: Vector[], dim:number) {
  const model = new TSNE({dim: dim, perplexity: vectors.length < 10 ? vectors.length-1 : 10})
  model.init({data: vectors})
  model.run()
  return model.getOutput()
}

export function sammon(vectors: Vector[], dim: number): Vector[] {
  const embedded = sammonDR(vectors, dim)
  return embedded.vectors
}