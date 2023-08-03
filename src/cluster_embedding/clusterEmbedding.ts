/**
 * Methods to perform cluster embedding, including self-organizing maps (SOMs) and embedded k-means. These will be 
 * provided with additional arguments elsewhere (if not in a library) but here we will keep the inputs as consistent
 * as possible. 
 */

import { SOM } from "./SOM.js"
import { kmeans } from "ml-kmeans"
import { pca, umap, sammon } from "./dimensionalityReduction.js"
import { extent } from 'd3-array'

type Vector = number[]

export type ProgressCallback = (p: number, message?: string) => void

export interface ClusterEmbedResult {
  centroids: Vector[],
  embeddedCentroids: Vector[],
  labels: number[],
}

export async function selfOrganizingMap(vectors: Vector[], m: number, n: number): Promise<ClusterEmbedResult> {
  const som = new SOM([m,n])
  som.fit(vectors)
  const labels = som.predict(vectors)
  
  return {
    centroids: som.weights!, // TODO: Set to actual centroids
    embeddedCentroids: som.locations,
    labels
  }
}

export async function embeddedKmeans(vectors: Vector[], k: number,
    embeddingFunction: (centroids: Vector[], k: number) => Vector[]): Promise<ClusterEmbedResult> {
  
  const kmcResult = kmeans(vectors, k, {}) 
  const embeddedCentroids = embeddingFunction(kmcResult.centroids, 2)
  return {
    centroids: kmcResult.centroids,
    embeddedCentroids,
    labels: kmcResult.clusters
  }
}

export type ClusterEmbedMethod = "som" | "kmc+sammon" | "kmc+pca" | "kmc+umap" | "kmc+tsne"
export async function clusterEmbed(vectors: Vector[], k: number, method: ClusterEmbedMethod, normalizeEmbedded=true): Promise<ClusterEmbedResult> {

  let result = null
  if (method == "som") {
    const somShape = getClosestFactors(k)
    result = await selfOrganizingMap(vectors, somShape[0], somShape[1])
  } else if (method == "kmc+pca") {
    result = await embeddedKmeans(vectors, k, pca)
  }  else if (method == "kmc+umap") {
    result = await embeddedKmeans(vectors, k, umap)
  } else if (method == "kmc+tsne") {
    //result = await embeddedKmeans(vectors, k, tsne)
    throw new Error("t-SNE temporarily removed due to security vulnerability in npm package")
  } else if (method == "kmc+sammon") {
    result = await embeddedKmeans(vectors, k, sammon)
  } else {
    throw new Error("Invalid method " + method)
  }

  if (normalizeEmbedded) {
    const xExtent = extent(result.embeddedCentroids, d => d[0])
    const yExtent = extent(result.embeddedCentroids, d => d[1])

    if (xExtent[0] != null) {
      const xCenter = (xExtent[0]+xExtent[1])/2
      for (const centroid of result.embeddedCentroids) {
        centroid[0] = (centroid[0] - xCenter)/(xExtent[1]-xExtent[0])
      }
    }

    if (yExtent[0] != null) {
      const yCenter = (yExtent[0]+yExtent[1])/2
      for (const centroid of result.embeddedCentroids) {
        centroid[1] = (centroid[1] - yCenter)/(yExtent[1]-yExtent[0])
      }
    }
    
  }

  return result 
}

function getClosestFactors(number: number) {
  // AI.
  
  let factor1 = 1
  let factor2 = number

  for (let i = 2; i <= Math.sqrt(number); i++) {
    if (number % i === 0) {
      if (Math.abs(i - (number / i)) < Math.abs(factor1 - factor2)) {
        factor1 = i
        factor2 = number / i
      }
    }
  }

  return [factor1, factor2]
}

