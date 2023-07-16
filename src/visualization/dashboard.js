import { PlotState, addDotInteractivity, addLineInteractivity, addGeoInteractivity, addMouseHoverInteraction, addInvisibleDotTooltip }
  from "./dashHelper.js"
import { positionColorer } from "./positionColorer.js"
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"
import * as Plot from 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.9/+esm'

export function createDashboard(spatialData, vectorData, resultData, options={}) {

  options = {
    width: 1080,
    layout: "a",
    colorScheme: "okhsl_flat",
    drawBorders: "on",
    lineXLabel: "x",
    lineYLabel: "y",
    lineXValues: Array.from({length: vectorData.xIndexes.length}, (_,i) => i),
    extraSpatialData: null,
    topRowScale: .8,
    ...options, 
  }
  
  
  const baseColor = "#ededee"
  const result = resultData

  // =====

  const labelMap = new Map(vectorData.zIndexes.map((d,i) => [d, result.labels[i]]))
  const labelCounts = Array.from({length: result.centroids.length}, () => 0)
  vectorData.zIndexes.map((d,i) => labelCounts[result.labels[i]]++)

  let colorer = null 
  if (options.colorScheme == "okhsl_flat") {
    colorer = positionColorer(result.embeddedCentroids, [.7,.7])
  } else if (options.colorScheme == "okhsl_cone") {
    colorer = positionColorer(result.embeddedCentroids, [.8,.4])
  } else {
    colorer = positionColorer(result.embeddedCentroids, [.6,.6])
  }

  const colors = result.embeddedCentroids.map(d => colorer(d))
  const colorScale = d => colors[d]
  
  
  
  // ====== Scatter plot ======

  const state = new PlotState()
  const id = d => d.id
  const fill = d => colorScale(id(d))

  const dotData = result.embeddedCentroids
  dotData.forEach((row,i) => row.id = i)

 
  function euclidean(a, b) {
    let total = 0;
    for (let i = 0; i < a.length; i++) {
        total += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(total);
  }

  //const center = [d3.mean(dotData, d => d[0]), d3.mean(dotData, d => d[1])]
  // const xExtent = d3.extent(dotData, d => d[0])
  // const yExtent = d3.extent(dotData, d => d[1])
  // const center = [(xExtent[0] + xExtent[1])/2, (yExtent[0] + yExtent[1])/2]
  const center = [0,0]
  const maxRadius = d3.max(dotData.map(p => euclidean(p, center)))
  const links = [
    {x1: center[0]-maxRadius, x2: center[0]+maxRadius, y1: center[1], y2: center[1]},
    {x1: center[0], x2: center[0], y1: center[1]-maxRadius, y2: center[1]+maxRadius}
  ]
  
  const scatterPlot = Plot.plot({
    width: options.width/2 * options.topRowScale,
    height: options.width/2 * options.topRowScale,
    axis: null,
    margin: 20,
    r: {range: [3,16]},
    marks: [
      Plot.dot(dotData, {
        x: d => d[0], y: d => d[1], 
        fill: d => labelCounts[id(d)] > 0 ? fill(d) : "none", stroke: "white",
        r: d => labelCounts[id(d)]}),
      Plot.link(links, {x1: "x1", x2: "x2", y1: "y1", y2: "y2", stroke: "lightgrey"}),
      Plot.dot(dotData.filter(d => labelCounts[id(d)] == 0), {x: d => d[0], y: d => d[1], stroke: "black", symbol: "times"})
    ]
  })


  const plotSelect = d3.select(scatterPlot)
  const groupSelect = plotSelect
    .select("g[aria-label='dot']")


  const dotText = d => {
    return `[${+d[0].toFixed(2)}, ${+d[1].toFixed(2)}] <br> ${labelCounts[d.id]} vectors`
  }
  addDotInteractivity(dotData, id, fill, state, groupSelect, plotSelect, baseColor, dotText)

  
  // ====== Line plot ======
  
  const lineData = result.centroids
  const stroke =  d => colorScale(d.id)

  const linePoints = []
  lineData.forEach((centroid,i) => {
    centroid.forEach((d,j) => {
      linePoints.push({x:j, y:d, id: i, j})
    })
  })

  const areaLinePoints = []
  vectorData.processedVectors.forEach((vector, i) => {
    vector.forEach((d,j) => {
      areaLinePoints.push({x: j, y: d, id: vectorData.zIndexes[i]})
    })
  })
   
  const linePlot = Plot.plot({
    style: { fontSize: 12},
    marginLeft: 50,
    marginBottom: 50,
    marginTop: 50,
    width: options.width * (3/4) * options.topRowScale,
    height: options.width/2 * options.topRowScale,
    y: {domain: d3.extent(linePoints, d => d.y), tickSpacing: 50, label: options.lineYLabel},
    x: {label: options.lineXLabel},
    marks: [
      //Plot.ruleY([0]),
      Plot.lineY(linePoints, {x: d => options.lineXValues[d.x], y: "y", z: id, stroke, strokeWidth: 2}),
      Plot.lineY(areaLinePoints, {x: d => options.lineXValues[d.x], y: "y", z: id, stroke: "slategrey", strokeWidth: 2, strokeDasharray: "2,4"}),
      Plot.dot(linePoints, {x: d => options.lineXValues[d.x], y: "y", z: id, stroke: "none", fill: "black", r:2}),
    ]
  })

  const linePlotSelect = d3.select(linePlot)
  const lineSelects = linePlotSelect
    .selectAll("g[aria-label='line']")
  const lineSelect = lineSelects.filter((d,i) => i == 0)
  const specificLineSelect = lineSelects.filter((d,i) => i == 1)
  const invisibleDotSelect = linePlotSelect
    .select("g[aria-label='dot']")
    .selectAll("circle")


  specificLineSelect.selectAll("path")
    .attr("visibility", "hidden")
    .data(vectorData.zIndexes.map(d => ({id: d})))


    
  //addLineInteractivity(lineData.map((d,i) => ({id: i})), id, stroke, state, lineSelect, linePlotSelect, baseColor)
  addLineInteractivity(lineData.map((d,i) => ({id: i})), id, stroke, state, lineSelect, linePlotSelect, baseColor)

  // TODO: Better way to handle dot so that it is synced to the line selection. This is quick hack.
  addInvisibleDotTooltip(linePoints, invisibleDotSelect, linePlotSelect, 13, d => {
    // TODO: Support more dates (this code will be bad if we need more precise dates, maybe moment can help)
    let t = options.lineXValues[d.j]
    t = t.toISOString != null ? t.toISOString().slice(0,10) : t
    const vec =  vectorData.processedVectors[d.id]
    return ` ${t} </br> ${vec[d.j].toFixed(3)} `
  }, d => {

    return state.focused == d?.id
  })



  // ====== Choropleth Plot ======

  const areaState = new PlotState()

  const vectorMap = new Map(vectorData.vectors.map((d,i) => [vectorData.zIndexes[i], d]))
  const geoFill = d => labelMap.has(d.id) ? colorScale(labelMap.get(d.id)) : "white"

  const marks =  [
    Plot.geo(spatialData, {
      stroke: options.drawBorders == "on" ? "#CCC" : geoFill,
      strokeWidth: options.drawBorders == "on" ? .3 : 1,
      fill: geoFill
    })
  ]
  
  if (options.extraSpatialData != null && options.drawBorders == "on") {

    marks.push(Plot.geo(options.extraSpatialData, {
      stroke: "white",
      strokeWidth: 1,
      fill: "none"
    }))
  }

  const geoPlot =  Plot.plot({
    projection: "albers-usa",
    width: options.width,
    marks
  })

  const geoPlotSelect = d3.select(geoPlot)
  const geoGroupSelect = geoPlotSelect
    .select("g[aria-label='geo']")

  let specificLineScaleY = null
  let specificLineScaleX = null
  let specificLineLine = d3.line()
    .x((d,i) => specificLineScaleX(i)) 
    .y((d,i) => specificLineScaleY(d))

  addGeoInteractivity(spatialData.features, d => labelMap.get(d.id), geoFill, state, geoGroupSelect, geoPlotSelect, baseColor, null, "fill")
  if (options.drawBorders == "off") {
     addGeoInteractivity(spatialData.features, d => labelMap.get(d.id), geoFill, state, geoGroupSelect, geoPlotSelect, baseColor, null, "stroke")
  }

  // Add some more state handling for area specific updates
  const geoSelect = geoGroupSelect
    .selectAll("path")

  addMouseHoverInteraction( areaState, d => d.id, geoSelect, geoGroupSelect, "area")

  let previousSpecificSelect = null 
  areaState.addResponder({
    update(source) {
      //focusAttributeUpdateUnfocused(specificLineSelect.selectAll("path"), areaState, id, "visibility", "hidden", d => "visible")
      if (previousSpecificSelect) { 
        previousSpecificSelect.attr("visibility", "hidden")
      }
      
      const select = specificLineSelect.selectAll("path")
        .filter(d => d.id == areaState.focused)
      select.attr("visibility", "visible")
      previousSpecificSelect = select
    }
  })

  
  const div = document.createElement("div")
  div.style.justifyContent = "center"
  if (options.layout == "a") {
    const divRow1 = div.appendChild( document.createElement("div"))
    divRow1.style.display = "flex"
    divRow1.style.justifyContent = "center"
    divRow1.style.gap = "20px"
    divRow1.appendChild(scatterPlot)
    divRow1.appendChild(linePlot)
    const divRow2 = div.appendChild( document.createElement("div"))
    divRow2.style.display = "flex"
    divRow2.style.justifyContent = "space-around"
    divRow2.appendChild(geoPlot)
  } else {
    div.style.display = "flex"

    const divColMap = div.appendChild( document.createElement("div"))
    divColMap.style.display = "flex"
    divColMap.style.justifyContent = "center"
    divColMap.appendChild(geoPlot)
    
    const divColOther = div.appendChild( document.createElement("div"))
    divColOther.style.display = "flex"
    divColOther.style.justifyContent = "center"
    divColOther.style.alignItems = "center"
    divColOther.style.gap = "20px"
    divColOther.style.flexDirection = "column"
    divColOther.appendChild(scatterPlot)
    divColOther.appendChild(linePlot)
  }
 



  
  return div
}