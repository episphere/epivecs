
export interface SammonResult {vectors: Vector[], E: number}
export interface SammonArgs {
  maxIter: number,
  maxHalves: number, 
  tolFun: number,
  init: Vector[]
}
export function sammon(X: Vector[], n: number, opts?: SammonArgs): SammonResult