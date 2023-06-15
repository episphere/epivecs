/**
 * Methods to perform cluster embedding, including self-organizing maps (SOMs) and embedded k-means. These will be
 * provided with additional arguments elsewhere (if not in a library) but here we will keep the inputs as consistent
 * as possible.
 */
import { SOM } from "./SOM.js";
import { kmeans } from "https://cdn.jsdelivr.net/npm/ml-kmeans@6/+esm";
import { pca, umap, tsne, sammon } from "./dimensionalityReduction.js";
export async function selfOrganizingMap(vectors, m, n) {
    const som = new SOM([m, n]);
    som.fit(vectors);
    const labels = som.predict(vectors);
    return {
        centroids: som.weights,
        embeddedCentroids: som.locations,
        labels
    };
}
export async function embeddedKmeans(vectors, k, embeddingFunction) {
    const kmcResult = kmeans(vectors, k, {});
    const embeddedCentroids = embeddingFunction(kmcResult.centroids, 2);
    return {
        centroids: kmcResult.centroids,
        embeddedCentroids,
        labels: kmcResult.clusters
    };
}
export async function clusterEmbed(vectors, k, method) {
    if (method == "som") {
        const somShape = getClosestFactors(k);
        return selfOrganizingMap(vectors, somShape[0], somShape[1]);
    }
    else if (method == "kmc+pca") {
        return embeddedKmeans(vectors, k, pca);
    }
    else if (method == "kmc+umap") {
        return embeddedKmeans(vectors, k, umap);
    }
    else if (method == "kmc+tsne") {
        return embeddedKmeans(vectors, k, tsne);
    }
    else if (method == "kmc+sammon") {
        return embeddedKmeans(vectors, k, sammon);
    }
    else {
        throw new Error("Invalid method " + method);
    }
}
function getClosestFactors(number) {
    // AI.
    let factor1 = 1;
    let factor2 = number;
    for (let i = 2; i <= Math.sqrt(number); i++) {
        if (number % i === 0) {
            if (Math.abs(i - (number / i)) < Math.abs(factor1 - factor2)) {
                factor1 = i;
                factor2 = number / i;
            }
        }
    }
    return [factor1, factor2];
}
