// Basic port of the 'sammon' Python library. It would be easy to make this more memory efficient.
import { add, subtract, sum, multiply, reshape, transpose, flatten, abs, distance,
  dotMultiply, dotDivide, dotPow, diag, ones, matrix, random} from 'https://cdn.jsdelivr.net/npm/mathjs@11.8.0/+esm'
import { pca } from "./dimensionalityReduction.js"

const math = {
  add, subtract, sum, multiply, reshape, transpose, flatten, abs, distance,
  dotMultiply, dotDivide, dotPow, diag, ones, matrix, random
}

export function sammon(X, n, args={}) {
  const columnFlatten = d => math.flatten(math.transpose(d))

  args = Object.assign({
    maxIter: 500,
    maxHalves: 20,
    tolFun:1e-9,
    init:null
  }, args)

  const {maxIter, maxHalves, tolFun, init} = args 

  let D = cdist(X, X) 
  
  const N = X.length
  const scale = 0.5 / math.sum(D)
  D = math.add(D, eye(N))
  const Dinv = math.dotDivide(1, D)

  let y = []
  if (init) {
    y = init 
  } else if (X[0].length > X.length) {
    console.warn("More columns than rows, so initializing using random vectors rather than PCA")
    X.forEach(() => y.push(math.random([n])))
  } else {
    y = pca(X, n)
  }

  const one = math.ones([X.length, n])
  let d = math.add(cdist(y,y), eye(X.length))
  let dinv =  math.dotDivide(1, d)
  let delta = math.subtract(D, d)
  let E = math.sum(math.dotMultiply(math.dotPow(delta, 2), Dinv))
  let yOld = null

  let i = 0 
  for (i = 0; i < maxIter; i++) {
    delta = math.subtract(dinv, Dinv)
    const deltaOne = math.multiply(delta, one)
    const g = math.subtract(math.multiply(delta,y), math.dotMultiply(y, deltaOne))
    const dinv3 = math.dotPow(dinv, 3)
    const y2 = math.dotPow(y, 2)
    
    const Ha = math.multiply(dinv3,y2)
    const Hb = math.multiply(2,y)
    const Hc = math.multiply(dinv3, y)
    const Hd = math.dotMultiply(y2, math.multiply(dinv3,one))
    const Hbc = math.dotMultiply(Hb,Hc)

    const H = math.add(math.subtract(math.subtract(Ha, deltaOne),Hbc),Hd)
    let s = math.subtract(0,math.dotDivide(columnFlatten(g.toArray()), math.abs(columnFlatten(H.toArray()))))
    yOld = y 

    let j = 0
    let Enew = null
    for (j = 0; j < maxHalves; j++) {
      const sReshape = math.transpose(math.reshape(s, [n,X.length]))
      y = math.add(yOld, sReshape)
      d = math.add(cdist(y,y) , eye(X.length))
      dinv = math.dotDivide(1,d)
      delta = math.subtract(D,d) 
      Enew = math.sum(math.dotMultiply(math.dotPow(delta,2),Dinv))

      if (Enew < E) {
        break 
      } else {
        s = math.multiply(s, .5)
      }
    }

    if (j == maxHalves-1) {
      console.warn("Warning: maxHalves exceeded. Sammon mapping may not converge...")
    }

    if (Math.abs((E-Enew)/E) < tolFun) {
      break 
    }

    E = Enew 
  }

  if (i == maxIter-1) {
    console.warn("Warning: maxiter exceeded. Sammon mapping may not have converged...")
  }

  E = E * scale

  return {vectors:y, E: E}
}

function eye (n)  { return math.diag(math.ones(n)) }

function cdist(arr1, arr2) {
  const M = arr1.map(d => [])
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      M[i][j] = math.distance(arr1[i], arr2[j])
    }
  }
  return M
}

