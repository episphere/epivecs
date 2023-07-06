export function hookSelect(selector, state, stateDataProperty, stateValueProperty, format = d => d) {
  
  const select = document.querySelector(selector)
  if (select == null) {
    throw new Error(`No element found for ${selector}`)
  }

  function setOptions(options) {
    if (selector == "#vector-data-select") {
      console.log("options:",options)
    }
    
    const selectOptions = []
    select.innerHTML = ``

    if (options) {
      for (let option of options) {
        if (typeof option == "string") {
          option = { value: option, label: format(option) }
        }
        selectOptions.push(option)
        const optionElement = document.createElement("option")
        optionElement.value = option.value
        optionElement.innerText = option.label
        
        if (option.value == state[stateValueProperty]) {
          optionElement.selected = true
        }
        select.appendChild(optionElement)
      }
    }
  }

  state.addListener(() => {
    setOptions(state[stateDataProperty])
    state[stateValueProperty] = select.value
  }, stateDataProperty)

  state.addListener(() => {   

    for (const option of select.options) {
      if (option.value == state[stateValueProperty]) {
        option.selected = true 
      } else {
        option.selected = false
      }
    }
  }, stateValueProperty)

  select.addEventListener("change", () => {
    state[stateValueProperty] = select.value 
  })


  setOptions(state[stateDataProperty])

  
  state[stateValueProperty] = select.value
}

export function hookInput(selector, state, stateValueProperty) {
  const input = document.querySelector(selector)
  if (input == null) {
    throw new Error(`No element found for ${selector}`)
  }

  state.addListener(() => {   
    input.value = state[stateValueProperty]
  }, stateValueProperty)

  input.addEventListener("change", () => {
    state[stateValueProperty] = input.value 
  })

  input.value = state[stateValueProperty]
}