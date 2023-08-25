
import { mean, deviation, flatGroup } from 'https://cdn.jsdelivr.net/npm/d3-array@3.2.3/+esm'

const d3 = {
  mean,
  deviation,
  flatGroup
}

type Vector = number[]

export type HandleEdgeMode = "fill_null" | "cut_window" | "shorten"
export function movingAverageSmooth(vector:Vector, windowSide=1, handleEdgeMode:HandleEdgeMode="fill_null") {
  const smoothed = []

  const start = handleEdgeMode == "cut_window" ? 0 : windowSide
  const end = handleEdgeMode == "cut_window" ? vector.length : vector.length-windowSide

  for (let i = start; i < end; i++) {
    const windowLeft = Math.max(0, i-windowSide)
    const windowRight = Math.min(i+windowSide, vector.length-1)
    
    let sum = 0
    for (let j = windowLeft; j <= windowRight; j++) {
      sum += vector[j] 
    }
    smoothed[i] = sum/(windowRight-windowLeft+1)
  }

  if (handleEdgeMode == "fill_null") {
    for (let i = 0; i < windowSide; i++) {
      smoothed[i] = null
      smoothed.push(null)
    }
  } else if (handleEdgeMode == "shorten") {
    return Object.values(smoothed)
  }

  return smoothed 
}

export type ZNormModes = "row" | "column" | "both" 
export function zNormalize(vectors: Vector[], mode:ZNormModes = "row") {
  let zVectors = vectors.map(d => [...d])

  if (mode == "column" || mode == "both") {
    for (let j = 0; j < vectors[0].length; j++) {
      let mean = d3.mean(vectors, d => d[j])
      let std = d3.deviation(vectors, d => d[j])
  
      if (mean != undefined && std != undefined) {
        if (std == 0) std = 1 
        for (let i = 0; i < vectors.length; i++) {
          zVectors[i][j] = (zVectors[i][j] - mean)/std
        }
      } else {
        for (let i = 0; i < vectors.length; i++) {
          zVectors[i][j] = NaN
        }
      }
    }
  } 

  if (mode == "row" || mode == "both") {
    for (let i = 0; i < zVectors.length; i++) {
      let mean = d3.mean(zVectors[i])
      let std = d3.deviation(zVectors[i])

      if (mean != undefined && std != undefined) {
        if (std == 0) std = 1 
        for (let j = 0; j < zVectors[i].length; j++) {
          zVectors[i][j] = (zVectors[i][j] - mean)/std
        } 
      } else {
        for (let j = 0; j < zVectors[i].length; j++) {
          zVectors[i][j] = NaN
        } 
      }
    }
  }
  
  return zVectors
}

export function interpolateMissing(vectors:Vector[]) {
  function interpolate(vector:Vector) {
    for (let i = 0; i < vector.length;i++) {
      if (vector[i] == null) {
        let startIndex = i 
        let endIndex = i 
        for (let j = startIndex+1; j < vector.length; j++) {
          if (vector[j] != null) {
            endIndex = j 
            break 
          }
        }
  
        // Edge positions can't be interpolated, so instead are set equal to preceding or succeeding value.
        if (startIndex == 0) {
          for (let j = startIndex; j < endIndex; j++) {
            vector[j] = vector[endIndex]
          }
        } else if (startIndex == endIndex) {
          startIndex--
          for (let j = startIndex+1; j < endIndex+1; j++) {
            vector[j] = vector[startIndex]
          }
        } else {
          const startValue = vector[startIndex-1] 
          const endValue = vector[endIndex]
          for (let j = startIndex; j < endIndex; j++) {
            const rel =  (j-startIndex+1)/(endIndex-startIndex+1)
            vector[j] = startValue + (endValue-startValue)*rel
          }
        }
      } 
    }
    return vector 
  }
  
  for (const vector of vectors) {
    interpolate(vector)
  }

  return vectors
}

export function fillMeanColumnMissing(vectors:Vector[]) {
  const columnMeans = Array.from({length: vectors[0].length}, (_,i) => {
    return d3.mean(vectors, d => d[i])
  })

  for (const vector of vectors) {
    for (let i = 0; i < vector.length; i++) {
      if (vector[i] == null) {
        vector[i] = columnMeans[i]!
      }
    }
  }
  
  return vectors
}