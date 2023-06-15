// export interface TSNEParams {
//   perplexity: number,
//   dim: number,
// }


export declare class TSNE {
  constructor(opts: TSNEParams)
  init(opts: {data: Vector[]})
  run()
  getOutput(): Vector[]
}

export default TSNE 

//export function constructor()

// export declare module 'tsne-js' {
//   declare class TSNE {
//     constructor(opts: {perplexity: number, dim: number})
//     init(opts: {data: Vector[]})
//     run()
//     getOutput(): Vector[]
//   }
//   export = TSNE
// }