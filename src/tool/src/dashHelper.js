import * as d3 from "d3"
//import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm'

export function addSelectionInteraction(state, plotSelect) {
  state.addResponder({
    update(source) {
      if (state.focused != null || state.selected.size > 0) {
        plotSelect.style("cursor", "pointer")
      } else {
        plotSelect.style("cursor", "default")
      }
    }
  })

  plotSelect
    .on("click", e => {
      if (state.focused != null) {
        if (state.selected.has(state.focused)) {
          state.removeSelected(state.focused)
        } else {
          state.addSelected(state.focused)
        }
        
      } else {
        state.clearSelected()
      }
    })
}

export function addProximityHoverInteraction(state, points, plotSelect, minDistance=null) {
  const delauney = d3.Delaunay.from(points, d => d.x, d => d.y)
  const distSqr = minDistance**2
  const element = plotSelect.node()

  plotSelect
    .on("mousemove", (e,d) => {
      // To account for elements rescaled by CSS
      const domPoint = new DOMPointReadOnly(e.clientX, e.clientY)
      const pt = domPoint.matrixTransform(element.getScreenCTM().inverse())
      const mousePoint = [pt.x, pt.y]
      
      const index = delauney.find(mousePoint[0], mousePoint[1])
      const id = points[index].id 
      const point = points[index] 

      let updateId = id 

      if (minDistance != null) {
        const distance = (mousePoint[0]-point.x)**2 + (mousePoint[1]-point.y)**2
        if (distance > distSqr) {
          updateId = null 
        }
      }

      // if (updateId != null) {
      //   console.log(points, id, mousePoint) 
      // }

      state.setFocused(updateId, points[index].element) 
    })
    .on("mouseleave", (e,d) => {
      state.setFocused(null, e.target)
    })
}

export function addMouseHoverInteraction(state, id, select, groupSelect, eventId=null) {
  if (eventId != null) {
    eventId = "." + eventId
  } else {
    eventId = ""
  }
  
  select
    .on(`mouseover${eventId}`, (e,d) => state.setFocused(id(d), e.target))

  if (groupSelect) {
    groupSelect
      .on(`mouseleave${eventId}`, (e,d) => state.setFocused(null, e.target))
  }
}

export function focusAttributeUpdateUnfocused(select, state, id, attribute, unfocusedValue, changeFunction) {
  select
    .attr(attribute, d => {
      const elemId = id(d)
      if ((elemId == state.focused) || state.selected.has(elemId)) {
        return changeFunction(d) 
      } else {
        return unfocusedValue
      }
    })
}

export function focusAttributeUpdate(select, state, id, attribute, unfocusedValue, changeFunction) {
  select
    .attr(attribute, d => {
      const elemId = id(d)
      if ((elemId == state.focused || state.focused == null && state.selected.size == 0) || state.selected.has(elemId)) {
        return changeFunction(d) 
      } else {
        return unfocusedValue
      }
    })
}

export function addDotInteractivity(data, id, fill, state, dotGroupSelect, plotSelect, baseColor="lightgrey", text=null) {

  // TODO: Support multiple symbols
  
  const select = dotGroupSelect
    .selectAll("*")

  select.data(select.data().map(d => data[d]))

  state.addResponder({
    update(source) {
      focusAttributeUpdate(select, state, id, "fill", baseColor, fill)
    }
  })

  const points = []
  select.each(function (d,i,elems) {    
    const elem = this
    points.push({
      x: parseFloat(elem.getAttribute("cx")),
      y: parseFloat(elem.getAttribute("cy")),
      id: id(d)
    })
  })  

  if (text != null) {
     const tooltip = addTooltip(plotSelect)

    // TODO: Make proximity interaction for tooltip
    select.on("mouseover.tooltip", (e,d) => {
      const bbox = e.target.getBBox()
      const centroid = [bbox.x + bbox.width/2, bbox.y+bbox.height/2]
      tooltip.show(text(d), centroid[0], centroid[1])
    })

    select.on("mouseleave.tooltip", () => tooltip.hide())
  }
 

  addProximityHoverInteraction( state, points, plotSelect, 15)
  addSelectionInteraction(state, plotSelect)
}

export function addGeoInteractivity(features, id, fill, state, geoGroupSelect, plotSelect, baseColor="lightgrey", text=null, property="fill") {
  const select = geoGroupSelect
    .selectAll("path")
    .data(features) 

  if (text == null) {
     text = feature => {
      const lines = []
      for (const [k,v] of Object.entries(feature.properties)) {
        lines.push(`<b>${k}:</b> ${v}`)
      }
      return lines.join("<br>")
    }
  }

  const tooltip = addTooltip(plotSelect)

  select
   .on("mouseover.tooltip", (e,d) => {
      const bbox = e.target.getBBox()
      const centroid = [bbox.x + bbox.width/2, bbox.y+bbox.height/2]
      tooltip.show(text(d), centroid[0], centroid[1])
    })

  geoGroupSelect
    .on("mouseleave.tooltip", () => tooltip.hide())

  state.addResponder({
    update(source) {
      focusAttributeUpdate(select, state, id, property, baseColor, fill)
    }
  })

  addMouseHoverInteraction( state, id, select, geoGroupSelect)
  addSelectionInteraction(state, plotSelect)
}

export function addLineInteractivity(data, id, stroke, state, lineGroupSelect, plotSelect, baseColor="lightgrey") {
  const select = lineGroupSelect
    .selectAll("path")
    .data(data)

  const proxPointDistance = 10
  const proxPoints = []
  select.each((_,i,elems) => {
    const element = elems[i]
    const pathLength = element.getTotalLength()
    for (let l = 0; l < pathLength; l+=proxPointDistance) {
      const p = element.getPointAtLength(l)
      proxPoints.push({x: p.x, y: p.y, id: id(data[i]), element})
    }
  })

   state.addResponder({
    update(source) {
      
      select
        .filter(d => id(d) == state.focused)
        .raise()

      focusAttributeUpdate(select, state, id, "stroke", baseColor, stroke)
    }
  })

  addProximityHoverInteraction( state, proxPoints, plotSelect, 15)
  addSelectionInteraction(state, plotSelect)
}


// Could probably replace this with Popper.js
export function addTooltip(svgSelect, elementSelect=null) {
  const mouseOffset = [10,10]

  const style = `
    .svg-tooltip {
      background-color: rgba(255, 255, 255, 0.7);
      position: absolute;
      transform: translate(178px, 410.19px);
      border-style: solid;
      border-color: black;
      border-width: 1px;
      border-radius: 2px;
      font-family: sans-serif;
      font-size: 12px;
      padding: 8px;
      visibility: hidden;
      max-width: 150px;
  }`

  svgSelect.append("style").text(style)
  
  const foreignObject = svgSelect.append("foreignObject")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("pointer-events", "none")

  const tooltip = foreignObject.append("xhtml:div")
    .attr("class", "svg-tooltip")

  function show(text, x, y) {
    let posX = x + mouseOffset[0]
    let posY = y + mouseOffset[1]
    
    tooltip.html(text)
    tooltip.style("visibility", "visible")
    
    const svgBox = svgSelect.node().getBBox()
    const tooltipBox = tooltip.node().getBoundingClientRect()

    if (posX > svgBox.width - tooltipBox.width) {
      posX = x - tooltipBox.width - mouseOffset[0]
    }
    if (posY > svgBox.height - tooltipBox.height) {
      posY = y - tooltipBox.height - mouseOffset[1]
    }
    
    tooltip.style("transform", `translate(${posX}px,${posY}px)`)
  }

  function hide() {
    tooltip.style("visibility", "hidden")
  }

  if (elementSelect != null) {
    elementSelect.on("mouseover", e => {
      const title = d3.select(e.target).select("title").text()
      const bbox = e.target.getBBox()
      const centroid = [bbox.x + bbox.width/2, bbox.y+bbox.height/2]
      show(title, centroid[0], centroid[1])
    })
    .on("mouseleave", () => hide())
  }
  
  return {show, hide}
}

export class PlotState {
  // Less flexible dynamic state, specific to plotting.

  constructor() {
    this.focused = null 
    this.selected = new Set()
    this.focusedOld = null
    this.selectedOld = new Set() 
    this.responders = []
  }

  addResponder(responder) {
    this.responders.push(responder)
  }

  setFocused(focused, element=null) {
    if (focused == this.focused) {
      return 
    }
    
    this.focused = focused 

    for (const responder of this.responders) {
      responder.update(element)
    }
  }

  addSelected(id, element=null) {
    if (!this.selected.has(id)) {
      this.selected.add(id)
      for (const responder of this.responders) {
        responder.update(element)
      }
    }
  }

  removeSelected(id, element=null) {
    if (this.selected.has(id)) {
      this.selected.delete(id)
      for (const responder of this.responders) {
        responder.update(element)
      }
    }
  }

  clearSelected(element=null) {
    this.selected.clear()
    for (const responder of this.responders) {
      responder.update(element)
    }
  }

}

export function addInvisibleDotTooltip(data, dotSelect, plotSelect, minDistance=30, tooltipText=null, condition=null) {
  // A bit hack-y and repetitive of other code, but this sort of thing is fine in the first draft of this library.

  const tooltip = addTooltip(plotSelect)
  
  dotSelect.data(data)
  dotSelect.attr("visibility", "hidden")
  
  const points = []
  dotSelect.each(function (d,i,elems) {    
    const elem = this
    points.push({
      x: parseFloat(elem.getAttribute("cx")),
      y: parseFloat(elem.getAttribute("cy")),
    })
  })  

  const delauney = d3.Delaunay.from(points, d => d.x, d => d.y)
  const distSqr = minDistance**2
  const element = plotSelect.node()

  let previousIndex = null 

  plotSelect
    .on("mousemove.dottooltip", (e,d) => {
      // To account for elements rescaled by CSS
      const domPoint = new DOMPointReadOnly(e.clientX, e.clientY)
      const pt = domPoint.matrixTransform(element.getScreenCTM().inverse())
      const mousePoint = [pt.x, pt.y]
      
      let index = delauney.find(mousePoint[0], mousePoint[1])
      const point = points[index] 

      if (minDistance != null) {
        const distance = (mousePoint[0]-point.x)**2 + (mousePoint[1]-point.y)**2
        if (distance > distSqr) {
          index = null 
        }
      }

      if (condition) {
        if (!condition(data[index])) {
          index = null
        }
      }

      if (index != previousIndex) {
        dotSelect.attr("visibility", "hidden")
        
        previousIndex = index
        if (index != null) {
          d3.select(dotSelect.nodes()[index]).attr("visibility", "visible")
          const text = tooltipText == null ? `${point.x},${point.y}` : tooltipText(data[index])
          tooltip.show(text, point.x, point.y)
        } else {
          tooltip.hide()
        }
      }
      

    })
    .on("mouseleave.dottooltip", (e,d) => {
      tooltip.hide()
    })

  return points
}