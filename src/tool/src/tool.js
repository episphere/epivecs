import { clusterEmbed } from '../../cluster_embedding/dist/cluster_embedding.js'
// import { zNormalize, movingAverageSmooth, fillMeanColumnMissing, interpolateMissing } from "../../processing/dist/processing.min.js"
import { zNormalize, movingAverageSmooth, fillMeanColumnMissing, interpolateMissing } from "../../processing/dist/processing.js"
import { hookSelect, hookInput } from "./input.js"
import { State } from './State.js'
import { createDashboard, previewMap, previewVectors } from './dashboard.js'

import { createPopper } from '@popperjs/core'
import jszip from 'jszip'
import * as d3 from "d3"
import { toPng } from 'html-to-image'
import download from 'downloadjs'

// import { createPopper } from 'https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/+esm'
// import jszip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm'
// import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm'
// import { toPng } from 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/+esm'
// import download from 'https://cdn.jsdelivr.net/npm/downloadjs@1.4.7/+esm'



const BASE_URL = location.pathname.substring(0, location.pathname.lastIndexOf("/"))

const PROCESSING_MAPS = {
  missingMode: new Map([
    ["remove", d => d], 
    ["mean_column", fillMeanColumnMissing], 
    ["interpolate",  interpolateMissing]
  ]),
  smoothingMode: new Map([
    ["none", vectors => vectors], 
    ["ma_1", vectors => vectors.map(vec => movingAverageSmooth(vec, 1, "cut_window"))],
    ["ma_2", vectors => vectors.map(vec => movingAverageSmooth(vec, 2, "cut_window"))],
    ["ma_3", vectors => vectors.map(vec => movingAverageSmooth(vec, 3, "cut_window"))]
  ]),
  normMode: new Map([
    ["z_row", vectors => zNormalize(vectors, "row")],
    ["z_col", vectors => zNormalize(vectors, "column")],
    ["z_both", vectors => zNormalize(vectors, "both")],
    ["none", vectors => vectors]
  ])
}

const DICTIONARY = new Map([
  ["okhsl_cone", "OKHSL (Lightness Cone)"],
  ["okhsl_flat", "OKHSL (Flat)"],
  ["remove", "Remove"],
  ["mean_column", "Fill Column w/ Mean"],
  ["none", "None"],
  ["interpolate", "Interpolate"],
  ["ma_1", "Moving Average (size 3)"],
  ["ma_2", "Moving Average (size 5)"],
  ["ma_3", "Moving Average (size 7)"],
  ["z_row", "Z-score (row-wise)"],
  ["z_col", "Z-score (column-wise)"], 
  ["z_both", "Z-score (row and column-wise)"],
  ["som", "Self-Organizing Map"],
  ["kmc+sammon", "K-means + Sammon"],
  ["kmc+pca", "K-means + PCA"],
  ["kmc+umap", "K-means + UMAP"],
  ["kmc+tsne", "K-means + t-SNE"],
  ["on", "On"],
  ["off", "Off"],
])

const RUN_PARAMS = ["spatialDataValue", "vectorDataValue", "spatialFieldValue", "xFieldValue", "yFieldValue", 
"missingValuesValue", "normValue", "smoothingValue", "methodValue", "kValue"]
const OTHER_PARAMS = ["colorValue", "borderValue", "xDateValue"]

const DEFAULT_SPATIAL = ["counties.geojson", "states.geojson"]

const global = {}

start()


function changedSpatialDataValue() {
  
  global.state.spatialData = null

  document.getElementById("vector-file-upload").value = null

  if (!global.state.spatialDataValue.startsWith("[Upload]")) {
    const resolution = global.state.spatialDataValue == "counties.geojson" ? "county" : "state"
    global.state.vectorDataOptions = global.vectorDataMap.get(resolution).map(d => ({value: d, label: d.split("/")[1]}))
    global.spatialDataZip.file(global.state.spatialDataValue).async("string").then(d => {
      global.state.spatialData = JSON.parse(d)
    })

    global.spatialDataZip.file("states.geojson").async("string").then(d => {
      global.state.spatialExtraData = JSON.parse(d)
    })
  }
}

function changedVectorDataValue() {  
  
  global.state.vectorData = null

  if (global.state.vectorDataValue.startsWith("[Upload]")) {
    const fields = new Set() 
    for (const row of global.state.userVectorData) {
      for (const field of Object.keys(row)) {
        fields.add(field)
      }
    }

    global.state.spatialFieldOptions = [...fields]
    global.state.xFieldOptions = [...fields]
    global.state.yFieldOptions = [...fields]

    const estimatedFields = estimateFields(fields)
    global.state.xFieldValue = estimatedFields.date
    global.state.yFieldValue = estimatedFields.value
    global.state.spatialFieldValue = estimatedFields.id

    toggleVectorDataSelects(true)
   
  } else if (global.state.vectorDataValue == "...") {
     // Awaiting a user upload
    
    global.state.spatialFieldOptions = ["..."]
    global.state.xFieldOptions = ["..."]
    global.state.yFieldOptions = ["..."]

    toggleVectorDataSelects(false)
  } else {
    const data = global.vectorDataZip.file(global.state.vectorDataValue).async("string").then(d => {
      global.state.vectorData = JSON.parse(d)
      global.state.spatialFieldOptions = [global.state.vectorData.zField]
      global.state.xFieldOptions = [global.state.vectorData.xField]
      global.state.yFieldOptions = [global.state.vectorData.yField]
    })

    toggleVectorDataSelects(false)
  }
}

function toggleVectorDataSelects(enabled) {
  const selects = ["spatial-field-select", "x-field-select", "y-field-select"].map(d => document.getElementById(d))
  for (const select of selects) {
    if (enabled) {
      select.removeAttribute("disabled")
    } else {
      select.setAttribute("disabled", "")
    }
  }
}

function isNumeric(str) {
  if (typeof str != "string") return false
  return !isNaN(str) && 
         !isNaN(parseFloat(str))
}

function estimateFields(fields) {
  // This is super basic, perhaps update in future

  const dataSlice = global.state.userVectorData.slice(0,100)

  const ids = new Set(global.state.spatialData.features.map(d => d.id))
  const possibleIdFields = []
  for (const field of fields) {
    const fieldValues = new Set(dataSlice.map(d => d[field]))
    possibleIdFields.push([field, d3.intersection(fieldValues, ids).size])
  }
  possibleIdFields.sort((a,b) => b[1]-a[1])
  const idField = possibleIdFields[0][0]
  
  const dateField = [...fields].find(d => d.includes("date"))
  
  let possibleValueFields = []
  for (const field of fields) {
    const nums = dataSlice.map(d => parseFloat(d[field]))
    if (dataSlice.filter(d => isNumeric(d[field])).length > 50) {
      possibleValueFields.push(field)
    }
  }
  possibleValueFields = possibleValueFields.filter(d => d != dateField && d != idField)
  const valueField = possibleValueFields[0]

  return {id: idField, date: dateField, value: valueField}
}

function dataUpdated() {
  const info = []

  if (global.state.spatialData) {
    info.push(`${global.state.spatialData.features.length} areas`)
  }
  
  if (global.state.vectorData) {
    info.push(`${global.state.vectorData.vectors.length} vectors`)
  }

  global.infoSpan.innerText = info.join(", ")
}

function resultCalculated() {
  if (global.state.result == null) {
    changeButtonMode("disabled")
  } else {
    updateSpatialData()
    updateAndResizeDashboard()
    changeButtonMode("pointless")
  }
}

function updateSpatialData() {
  const assignmentMap = new Map(global.state.result.labels.map((label,i) => {
    return [global.state.vectorData.zIndexes[i], label]
  }))
  for (const feature of global.state.spatialData.features) {
    feature.properties.label_assignment = assignmentMap.get(feature.id)
  }
}

function updateAndResizeDashboard() {
  updateDashboard()
  resizeDashboard()
}

const DEFAULT_SIZE = 1100
function updateDashboard(width=DEFAULT_SIZE, layout="a") {
  global.plotContainer.innerHTML = ""

  const lineXValues = global.state.xDateValue == "on" ? 
    global.state.vectorData.xIndexes.map(d => new Date(d)) : global.state.vectorData.xIndexes
  const lineYLabel = global.state.normValue == "none" ? 
    global.state.yFieldValue : `${global.state.yFieldValue} (normalized)`
  
  global.plotContainer.appendChild(
    createDashboard(global.state.spatialData, global.state.vectorData, global.state.result, {
      layout,
      width: width,
      colorScheme: global.state.colorValue,
      drawBorders: global.state.borderValue,
      lineXLabel: global.state.xFieldValue,
      lineXValues,
      lineYLabel,
      extraSpatialData: global.state.extraSpatialData
    })
  )
}

function resizeDashboard() {
  const targetHeight = window.innerHeight * 0.75
  const currentHeight =  global.plotContainer.getBoundingClientRect().height
  const scaleFactor = targetHeight/currentHeight 

  const currentWidth =  global.plotContainer.getBoundingClientRect().width 
  const resizeWidth = scaleFactor * currentWidth 

  let layout = "a"
  if (DEFAULT_SIZE - resizeWidth > 250) {
    layout = "b"
  }

  updateDashboard(DEFAULT_SIZE*scaleFactor,layout)
}

function changeButtonMode(mode) {
  // ready, pointless, disabled

  for (const buttonId of ["run-button", "data-run-button"]) {
    const button = document.getElementById(buttonId)
    if (mode == "ready") {
      button.removeAttribute("disabled")
      button.className = "btn btn-primary w-25"
    } else if (mode == "pointless") {
      
      button.removeAttribute("disabled")
      button.className = "btn btn-light w-25"
    } else {
      button.className = "btn btn-secondary w-25"
      button.setAttribute("disabled", "")
    }
  }
  
}

function useUrlParams() {
  global.urlParams = new URLSearchParams(window.location.hash.replace("#", ""))

  for (const property of [...RUN_PARAMS, ...OTHER_PARAMS]) {
    if (global.urlParams.has(property)) {
      global.state.defineProperty(property, global.urlParams.get(property))
    }
  }
}

function hookUrlParams() {
  // Delay URL update until run
  for (const property of RUN_PARAMS) {
    global.state.addListener(() => {
      global.urlParams.set(property, global.state[property])
    }, property)
  }

  // Perform URL update immediately
  for (const property of OTHER_PARAMS) {
    global.state.addListener(() => {
      global.urlParams.set(property, global.state[property])
      window.location.hash = global.urlParams.toString()
    }, property)
  }
}



async function start() {
  toggleLoading(true)

  //populateTooltips()

  global.state = new State()
  global.runButton = document.getElementById("run-button")
  global.plotContainer = document.getElementById("plot-container")
  global.infoSpan = document.getElementById("info-span")
  global.state.defineProperty("result")

  useUrlParams()
  await loadDefaultData()

  hookInputs()
  hookTabs()

  global.state.addListener(changedSpatialDataValue, "spatialDataValue")
  global.state.addListener(changedVectorDataValue, "vectorDataValue")
  global.state.addListener(resultCalculated, "result"),
  //global.state.addListener(dataUpdated, "spatialData", "vectorData")
  global.state.addListener(updateAndResizeDashboard, "borderValue", "colorValue", "xDateValue")

  document.getElementById("spatial-file-upload").addEventListener("change", uploadSpatialFile)
  document.getElementById("spatial-extra-file-upload").addEventListener("change", uploadExtraSpatialFile)
  document.getElementById("vector-file-upload").addEventListener("change", uploadVectorFile)

  global.state.addListener((property) => {
    if (property != "result") {
      changeButtonMode("ready")
    }
  }, "spatialData", "vectorData", "spatialFieldValue", "xFieldValue", "yFieldValue", "missingValuesValue", "normValue",
   "smoothingValue", "methodValue", "kValue")

  // Run when both the vector and spatial data are ready on initial load.
  global.state.addOnceListener(() => {
    if (global.state.vectorData != null && global.state.spatialData != null) {
      preprocessData()
      global.state.fireListeners("missingValuesValue")
      run()
      hookUrlParams() 
    }
  }, "spatialData", "vectorData")

  global.runButton.addEventListener("click", () => {
    toggleLoading(true)
    setTimeout(() => run(), 50)
  })

  document.getElementById("data-run-button").addEventListener("click", () => {
    toggleLoading(true)
    setTimeout(() => run(), 50)
  })

  global.state.spatialDataOptions = DEFAULT_SPATIAL
  global.state.spatialExtraDataOptions = ["states.geojson"]

  global.state.addListener(() => {
    if (global.state.spatialData) {
      // let previewStr = `${global.state.spatialData.features.length} main features.`
      // if (global.state.spatialExtraData) {
      //   previewStr = previewStr += `</br>${global.state.spatialExtraData.features.length} extra features.`
      // }
      // document.getElementById("map-preview-container").innerHTML = previewStr
      const mapPreview = previewMap(global.state.spatialData, global.state.spatialExtraData, 480)
      const element = document.getElementById("map-preview-container")
      element.innerHTML = ``
      element.appendChild(mapPreview)
    }
  }, "spatialData", "spatialExtraData")

  global.state.addListener(() => {

    if (global.state.vectorDataValue.startsWith("[Upload]")) {
      // The vector is not in the proprietary vector format, convert
      global.state.vectorData = rowDataToVectorFormat(global.state.userVectorData, global.state.xFieldValue,
        global.state.yFieldValue, global.state.spatialFieldValue)
    }

    if (global.state.vectorData) {
      const preview = previewVectors(global.state.vectorData)
      const element = document.getElementById("vector-preview-container")
      element.innerHTML = ``
      element.appendChild(preview)
    }
  }, "vectorDataValue", "userVectorData", "spatialFieldValue", "xFieldValue", "yFieldValue",)

  global.state.addListener(() => {
    preprocessData()
    const preview = previewVectors(global.state.vectorData, true)
    const element = document.getElementById("preprocess-preview-container")
    element.innerHTML = ``
    element.appendChild(preview)
  }, "missingValuesValue", "normValue", "smoothingValue")

  // Shouldn't need to set this here. The hookSelect() function is not set up well to handle default values. Fix later.
  global.state.fireListeners("spatialDataValue")
  global.state.fireListeners("vectorDataValue")

  //global.state.vectorDataValue = "county/cdc_covid_cases_county_week.json"
}

function hookTabs() {
  const tabs = ["map-file", "vector-data", "processing"].map(tabName => {
    const navLink = document.getElementById(`nav-${tabName}`)
    return {
      tabName,
      navLink,
      tabPane: document.getElementById(`tab-${tabName}`),
      active: navLink.classList.contains("active")
    }
  })

  for (const tab of tabs) {
    tab.navLink.addEventListener("click", e => {
      if (!tab.active) {
        tab.navLink.classList.add("active")
        tab.tabPane.classList.add("show")
        tab.tabPane.classList.add("active")
        for (const otherTab of tabs.filter(d => d.tabName != tab.tabName)) {
          if (otherTab.active) {
            otherTab.active = false 
            otherTab.navLink.classList.remove("active")
            otherTab.tabPane.classList.remove("show")
            otherTab.tabPane.classList.remove("active")
          }
        }
        tab.active = true
      } 
    })
  }
}

function toggleLoading(loading) {
  if (loading) {
    document.getElementById("dash-container").classList.add("d-none")
    document.getElementById("loading-spinner").classList.remove("d-none")
  } else {
    document.getElementById("dash-container").classList.remove("d-none")
    document.getElementById("loading-spinner").classList.add("d-none")
  }
}

function preprocessData() {
  let processedVectors = [...global.state.vectorData.vectors]
  processedVectors = preprocess(processedVectors)

  global.state.vectorData.zIndexesAll = [... global.state.vectorData.zIndexes]
  global.state.vectorData.zIndexes = []

  // Remove incomplete vectors
  processedVectors = processedVectors.filter((vector,i) => {
    const keep = vector.every(d => Number.isFinite(d))
    if (keep) global.state.vectorData.zIndexes.push(global.state.vectorData.zIndexesAll[i])
    return keep 
  })
  global.state.vectorData.processedVectors = processedVectors
}

async function run() {
  window.location.hash = global.urlParams.toString()
  global.state.result = null   

  if ((global.state.vectorDataValue == "USER UPLOAD" && !global.state.userVectorData) ||
     (global.state.vectorDataValue != "USER UPLOAD" && !global.state.vectorData)) {
    console.warn("Data not loaded yet!")
    return 
  }

  // if (global.state.vectorDataValue == "USER UPLOAD" && !global.state.userVectorData.hasOwnProperty("xIndexes")) {
  //   // The vector is not in the proprietary vector format, convert
  //   global.state.vectorData = rowDataToVectorFormat(global.state.userVectorData, global.state.xFieldValue,
  //      global.state.yFieldValue, global.state.spatialFieldValue)
  // }
  //preprocessData()


  clusterEmbed(global.state.vectorData.processedVectors, parseInt(global.state.kValue), global.state.methodValue).then(result => {
    global.state.result = result
  })

  toggleLoading(false)
}

function preprocess(vectors) {
  // Pre-processing is in a default order. If the user wants more flexible pre-processing, they will have to do it manually.

  vectors = PROCESSING_MAPS.missingMode.get(global.state.missingValuesValue)(vectors)
  vectors = PROCESSING_MAPS.smoothingMode.get(global.state.smoothingValue)(vectors)
  vectors = PROCESSING_MAPS.normMode.get(global.state.normValue)(vectors)
  

  return vectors
}

function downloadData(data, filename, format="json") {
  const text = format == "csv" ? d3.csvFormat(data) : JSON.stringify(data) 

  const blobFile = new Blob([text], {type: `text/${format};charset=utf-8`})
  const blobUrl = URL.createObjectURL(blobFile)

  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.target = "_blank"
  anchor.download = `${filename}.${format}`
  anchor.click()

  URL.revokeObjectURL(blobUrl)
}

function uploadSpatialFile(e) {
  const file = e.target.files[0]
  loadFile(file).then(data => {
    const optionName = "[Upload] " + file.name
    global.state.spatialDataOptions = [...DEFAULT_SPATIAL, optionName]
    global.state.spatialDataValue = optionName   
    
    global.state.spatialData = data 
    global.userSpatialData = data 
  })

  // if (e.target.files.length > 1) { 
  //   loadFile(e.target.files[1]).then(data => {
  //     if (data.features.length < global.state.spatialData.features.length) {
  //       global.extraSpatialData = data 
  //     } else {
  //       const extraSpatialData =  global.state.spatialData
  //       global.state.spatialData = data 
  //       global.extraSpatialData = extraSpatialData
  //     }
  //   })
  // }
}

function uploadExtraSpatialFile(e) {
  const file = e.target.files[0]
  loadFile(file).then(data => {
    const optionName = "[Upload] " + file.name
    global.state.spatialExtraDataOptions = ["states.geojson", optionName]
    global.state.spatialExtraDataValue = optionName   
    global.state.extraSpatialData = data 
  })
}

function uploadVectorFile(e) {
  const file = e.target.files[0]
  loadFile(file).then(data => {
         
    global.state.userVectorData = data 
    const optionName = "[Upload] " + file.name
    const defaultVectorOptions = global.state.vectorDataOptions.filter(d => !d.value.startsWith("[Upload]"))
    global.state.vectorDataOptions = [...defaultVectorOptions, optionName]
    global.state.vectorDataValue = optionName
 
  })
}

function loadFile(file) {
  
  let resolver = null
  const promise = new Promise((resolve) => resolver = resolve)
  
  const reader = new FileReader()
  function parseFile() {
    let data = null
    if (file.type == "application/json" || file.type == "application/geo+json") {
      data = JSON.parse(reader.result)
    } else {
      data = d3.csvParse(reader.result)
    }
    resolver(data)
  }

  reader.addEventListener("load", parseFile, false);
  if (file) {
    reader.readAsText(file)
  }

  return promise
}

const format = d => DICTIONARY.has(d) ? DICTIONARY.get(d) : d



function hookInputs() {

  // Input elements state 
  global.state.defineProperty("spatialDataOptions")
  global.state.defineProperty("spatialDataValue", "counties.geojson")
  global.state.defineProperty("spatialExtraDataOptions")
  global.state.defineProperty("spatialExtraDataValue", "states.geojson")
  global.state.defineProperty("vectorDataOptions")
  global.state.defineProperty("vectorDataValue", "county/cdc_covid_cases_county_week.json")
  global.state.defineProperty("spatialFieldOptions")
  global.state.defineProperty("spatialFieldValue")
  global.state.defineProperty("xFieldOptions")
  global.state.defineProperty("xFieldValue")
  global.state.defineProperty("yFieldOptions")
  global.state.defineProperty("yFieldValue")
  global.state.defineProperty("colorOptions", ["okhsl_flat", "okhsl_cone"])
  global.state.defineProperty("colorValue", "okhsl_cone")
  global.state.defineProperty("borderOptions", ["on", "off"])
  global.state.defineProperty("borderValue")
  global.state.defineProperty("xDateOptions", ["on", "off"])
  global.state.defineProperty("xDateValue")
  
  global.state.defineProperty("missingValuesOptions", [...PROCESSING_MAPS.missingMode.keys()])
  global.state.defineProperty("missingValuesValue")
  global.state.defineProperty("normOptions", [...PROCESSING_MAPS.normMode.keys()])
  global.state.defineProperty("normValue")
  global.state.defineProperty("smoothingOptions", [...PROCESSING_MAPS.smoothingMode.keys()])
  global.state.defineProperty("smoothingValue")
  global.state.defineProperty("methodOptions", ["som", "kmc+sammon", "kmc+pca", "kmc+umap", "kmc+tsne"])
  global.state.defineProperty("methodValue", "kmc+sammon")
  global.state.defineProperty("kValue", "9")

  
  // Main state 
  global.state.defineProperty("spatialData")
  global.state.defineProperty("spatialExtraData")
  global.state.defineProperty("vectorData")
  global.state.defineProperty("userVectorData")


  hookSelect("#spatial-data-select", global.state, "spatialDataOptions", "spatialDataValue", format)
  hookSelect("#spatial-extra-data-select", global.state, "spatialExtraDataOptions", "spatialExtraDataValue", format)
  hookSelect("#vector-data-select", global.state, "vectorDataOptions", "vectorDataValue", format)
  hookSelect("#spatial-field-select", global.state, "spatialFieldOptions", "spatialFieldValue", format)
  hookSelect("#x-field-select", global.state, "xFieldOptions", "xFieldValue", format)
  hookSelect("#y-field-select", global.state, "yFieldOptions", "yFieldValue", format)

  
  hookSelect("#missing-select", global.state, "missingValuesOptions", "missingValuesValue", format)
  hookSelect("#norm-select", global.state, "normOptions", "normValue", format)
  hookSelect("#smooth-select", global.state, "smoothingOptions", "smoothingValue", format)
  hookSelect("#method-select", global.state, "methodOptions", "methodValue", format)

  hookInput("#k-input", global.state, "kValue")
  
  hookSelect("#color-select", global.state, "colorOptions", "colorValue", format)
  hookSelect("#border-select", global.state, "borderOptions", "borderValue", format)
  hookSelect("#x-date-select", global.state, "xDateOptions", "xDateValue", format)

  document.getElementById("download-results-json").addEventListener("click", () => {
    if (global.state.result) {
      const downloadResult = {
        centroids: global.state.result.centroids,
        embeddedCentroids: global.state.result.embeddedCentroids,
        assignments: global.state.result.labels.map((label,i) => {
          return {id: global.state.vectorData.zIndexes[i], label}
        })
      }
      downloadData(downloadResult, "epivecs_full_results", "json")
    }
  })

  document.getElementById("download-results-csv").addEventListener("click", () => {
    if (global.state.result) {
      const assignments = global.state.result.labels.map((label,i) => {
        return {id: global.state.vectorData.zIndexes[i], label}
      })
      downloadData(assignments, "epivecs_cluster_assignments", "csv")
    }
  })

  document.getElementById("download-results-geojson").addEventListener("click", () => {
    if (global.state.result) {
      downloadData(global.state.spatialData, "epivecs_geo", "geojson")
    }
  })

  let downloading = false
  document.getElementById("download-plot-png").addEventListener("click", () => {
    
    if (!downloading) {
      downloading = true
      document.getElementById("button-download-svg").style.display = "none"
      document.getElementById("download-spinner").style.display = "inline-block"


      setTimeout(() => {
        toPng(document.getElementById("plot-container"))
          .then(function (dataUrl) {
            download(dataUrl, "epivecs-plots.png")
            downloading = false

            document.getElementById("button-download-svg").style.display = "inline-block"
            document.getElementById("download-spinner").style.display = "none"
          })
      }, 10)
     
    }
  })
}

function rowDataToVectorFormat(rowData, xField, yField, zField) {
  function timeSort(xIndexes) {
    // Will work with time and with numbers
    const pairs = xIndexes.map(d => [new Date(d), d])
    pairs.sort((a,b) => a[0]-b[0])
    return pairs.map(d => d[1])
  }
  
  let xIndexes = [...new Set(rowData.map(d => d[xField]))].filter(d => d != null) 
  xIndexes = timeSort(xIndexes)

  let zIndexes = [...new Set(rowData.map(d => d[zField]))].filter(d => d != null) 

  const grouped = d3.group(rowData, d => d[zField], d => d[xField])

  const vectors = []
  for (const [id, byX] of grouped.entries()) {
    const vector = []
    xIndexes.forEach((xIndex,i) => {
      const rawVal = byX.get(xIndex)
      if (rawVal != null) {
        const val = parseFloat(rawVal[0][yField])
        vector[i] = Number.isFinite(val) ? val : null
      }
    
      
    })
    vectors.push(vector)
  }
  
  return {xField, yField, xIndexes, zIndexes, vectors}
}

async function loadDefaultData() {
  const spatialZip = new jszip()
  const spatialData = await (await fetch(`${BASE_URL}/data/example_spatial_data.zip`)).blob()
  await spatialZip.loadAsync(spatialData)
  global.spatialDataZip = spatialZip 

  const vectorZip = new jszip()
  const vectorData = await (await fetch(`${BASE_URL}/data/example_vector_data.zip`)).blob()
  await vectorZip.loadAsync(vectorData)

  const map = new Map([["county", []], ["state", []]])
  for (const file of Object.values(vectorZip.files)) {
    if (!file.dir) {
      const splitName = file.name.split("/")
      map.get(splitName[0]).push( file.name)
    }
  }

  global.vectorDataMap = map
  global.vectorDataZip = vectorZip 
}

function populateTooltips() {
  // Kind of a crude way to handle information tooltips, but it works.
  const tooltip = document.getElementById("tooltip")

  addInformationTooltip(document.getElementById("spatial-data-label"), tooltip, 
    "Upload a GeoJSON file containing the areas you wish to visualize. Optionally, you can upload 2 files and the one with fewer areas will be used to draw extra borders on the map.")
  addInformationTooltip(document.getElementById("vector-data-label"), tooltip, 
    "Upload a file containing row data (CSV or JSON). This data will be turned into vectors which will then be passed to the cluster embedding method.")
  addInformationTooltip(document.getElementById("spatial-id-label"), tooltip, 
    "The values in this field should match the ID field in the GeoJSON.")
  addInformationTooltip(document.getElementById("x-field-label"), tooltip,
    "The field which will be used to index the vectors. For spatiotemporal, this will be a date/time field.")
  addInformationTooltip(document.getElementById("y-field-label"), tooltip, 
    "The value field. Can be any numeric field. These values will form the vectors.")
  addInformationTooltip(document.getElementById("missing-select-label"), tooltip, 
    "How to handle missing data.")
  addInformationTooltip(document.getElementById("norm-select-label"), tooltip, 
    "Vector normalization algorithm.")
  addInformationTooltip(document.getElementById("smooth-select-label"), tooltip,
    "Smoothing algorithm.")
  addInformationTooltip(document.getElementById("method-select-label"), tooltip, 
    "The cluster embedding method which will be applied.")
  addInformationTooltip(document.getElementById("k-input-label"), tooltip, 
    "The number of clusters.")
  addInformationTooltip(document.getElementById("color-select-label"), tooltip, 
    "The coloring method.")
  addInformationTooltip(document.getElementById("border-select-label"), tooltip, 
    "Whether or not area borders are drawn.")
  addInformationTooltip(document.getElementById("x-date-select-label"), tooltip, 
    "Whether or not to treat 'x' as a date in the line chart")

}

function addInformationTooltip(element, tooltip, text) {
  const popperInstance = createPopper(element, tooltip , {
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [16, 8],
        },
      },
    ],
  })

  function show() {
    tooltip.innerHTML = text
    tooltip.setAttribute('data-show', '')
    popperInstance.update();
  }
  
  function hide() {
    tooltip.removeAttribute('data-show')
  }

  const showEvents = ['mouseenter', 'focus']
  const hideEvents = ['mouseleave', 'blur']
  
  showEvents.forEach((event) => {
    element.addEventListener(event, show)
  })
  
  hideEvents.forEach((event) => {
    element.addEventListener(event, hide)
  })
}

