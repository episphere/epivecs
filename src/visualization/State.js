/**
 * Simple class which links a collection of properties to a collection of listeners. When any one
 * of the variables in the state is changed, all of the listeners are called. 
 */
export class State {

  constructor() {
    this.properties = {}
    this.listeners = new Map([["global", []]])
    this.onceListeners = new Map()
  }

  /**
   * Define a new property. When this property is updated (through this class) then all of the 
   * listeners will fire. If the property already exists, then it will remain as is (i.e. the given
   * value will be ignored). Defining a property will not trigger the listeners.
   * @param {string} property - The name of the property.
   * @param {*} value 
   */
  defineProperty(property, value) {
    if (!this.hasOwnProperty(property)) {
      Object.defineProperty(this, property, {
        set: function(value) { this._setProperty(property, value) },
        get: function() { return this.properties[property] }
      })
      this.properties[property] = value
    }
  }

  /**
   * Add a listener, will fire when any of the defined properties are changed.
   * @param {function} f - Will be called with three arguments: property name, updated value, 
   * old value.
   */
  addListener(f, ...properties) {
    if (properties.length == 0) {
      properties.push("global")
    }

    for (const property of properties) {
      if (!this.listeners.has(property)) {
        this.listeners.set(property, [])
      }
      this.listeners.get(property).push(f)
    }
  }

  /**
   * Add a listener that will only trigger once, will fire when any of the defined properties are changed.
   * @param {function} f - Will be called with three arguments: property name, updated value, 
   * old value.
   */
  addOnceListener(f, ...properties) {
    if (properties.length == 0) {
      properties.push("global")
    }
    
    for (const property of properties) {
      if (!this.onceListeners.has(property)) {
        this.onceListeners.set(property, [])
      }
      this.onceListeners.get(property).push(f)
    }
  }

  _setProperty(property, value) {
    
    if (value != this.properties[property]) {
       this.properties[property] = value

      const propertyListeners = this.listeners.get(property)
      if (propertyListeners) {
        for (const listener of propertyListeners) {
          listener(property, value)
        }
      }

      const propertyOnceListeners = this.onceListeners.get(property)
      if (propertyOnceListeners) {
        for (const listener of propertyOnceListeners) {
          listener(property, value)
        }

        this.onceListeners.set(property, [])
      }
      
      for (const listener of this.listeners.get("global")) {
        listener(property, value)
      }
    }
  }
    
   
}