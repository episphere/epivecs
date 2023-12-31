import { max, extent } from 'd3-array';
import { okhsl_to_srgb } from "./colorConvertor.js";
export function positionColorer(points, l = 0.5, colorSpace = "okhsl") {
    //const center = [mean(points, d => d[0])!, mean(points, d => d[1])!]
    const xExtent = extent(points, d => d[0]);
    const yExtent = extent(points, d => d[1]);
    const center = [(xExtent[0] + xExtent[1]) / 2, (yExtent[0] + yExtent[1]) / 2];
    const distances = points.map(p => euclidean(p, center));
    const maxRadius = max(distances);
    const rScale = scaleLinear([0, maxRadius]);
    const angleScale = scaleLinear([0, 2 * Math.PI]);
    const lRange = Array.isArray(l) ? l : [l, l];
    const lScale = scaleLinear([0, maxRadius], lRange);
    if (colorSpace == "okhsl") {
        let colorMethod = okhsl_to_srgb;
        return function (point) {
            const angle = Math.atan2(point[0] - center[0], point[1] - center[1]);
            const radius = euclidean(point, center);
            return `rgb(${colorMethod(angleScale(angle), rScale(radius), lScale(rScale(radius))).map(Math.round).join(",")})`;
        };
    }
    else {
        throw Error("Invalid color space ", colorSpace);
    }
}
function scaleLinear(domain, range = [0, 1]) {
    const domainSpan = domain[1] - domain[0];
    const rangeSpan = range[1] - range[0];
    return function scale(d) {
        return rangeSpan * ((d - domain[0]) / domainSpan) + range[0];
    };
}
function euclidean(a, b) {
    let total = 0;
    for (let i = 0; i < a.length; i++) {
        total += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(total);
}
