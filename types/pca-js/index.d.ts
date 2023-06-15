export type Vector = number[]

export type EigenVector = {
  eigenValue: number, vector: Vector
}


export type AdjustedData = {
  adjustedData: Vector[],
  formattedAdjustedData: Vector[],
  avgData: Vector[], 
  selectedVectors: Vector[]
}

export function getEigenVectors(data: Vector[], n: number): EigenVector[]
export function computeAdjustedData(data: Vector[], ...eigenVectors: EigenVector[]): AdjustedData

// export interface PCA  {
//   getEigenVectors: (data: Vector[], n: number) => EigenVector[],
//   computeAdjustedData: (data: Vector[], ...eigenVectors: EigenVector[]) => AdjustedData
// }

// export const PCA:PCA