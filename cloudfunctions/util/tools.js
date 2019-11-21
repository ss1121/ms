function objTypeof(obj, type) {
  // if (obj) return obj.nv_constructor ? obj.nv_constructor.toLowerCase() : (obj.constructor.toLowerCase && obj.constructor.toLowerCase())
  if (obj) {
    if (obj.nv_constructor) {
      return obj.nv_constructor.toLowerCase()
    } else {
      if (obj.constructor.toLowerCase) {
        return obj.constructor.toLowerCase()
      }
    }
    const typeofobj = typeof obj
    if (type && type == 'array') {
      return Array.isArray(obj) ? 'array' : typeofobj
    }
    return typeofobj
  }
}

function isString(title) {
  return typeof title == 'string'
}

function isObject(obj) {
  return objTypeof(obj) == 'object' && !isArray(obj)
}

function isArray(obj) {
  return objTypeof(obj, 'array') == 'array'
}

function isNumber(obj) {
  return objTypeof(obj) == 'number'
}

function isFunction(obj) {
  return objTypeof(obj) == 'function'
}

function clone(params) {
  return JSON.parse(JSON.stringify(params))
}

function isEmpty(params) {
  if (isObject(params)) {
    const len = Object.keys(params).length
    return len ? false : true
  }
  if (isArray(params)) {
    return params.length ? false : true
  }
  return true
}

function formatQuery(url) {
  let aim = url
  let query={};
  if (url) {
    let urls = url.split('?')
    aim = urls[0]
    if (urls[1]) {
      let params = urls[1].split('&')
      params.forEach(param => {
        let attrs = param.split('=')
        query[attrs[0]] = attrs[1] ? attrs[1] : true
      })
    }
  }
  return {url: aim, query}
}

let suidCount = -1
function suid(prefix) {
  resetSuidCount()
  suidCount++
  prefix = prefix || 'normal_'
  if (typeof prefix == 'string') {
    return prefix + suidCount
  }
}

function resetSuidCount() {
  if (suidCount > 9999) suidCount = -1
}

module.exports = {
  isString,
  isObject,
  isArray,
  isNumber,
  isFunction,
  clone,
  isEmpty,
  formatQuery,
  suid
}