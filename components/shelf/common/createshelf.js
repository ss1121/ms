/**
 * [
 *  {name: String, title: String, size: Number, content: String},
 * ]
 */
const app = getApp()

function reSort(params) {
  let resort = []
  params.forEach((item, ii)=>{
    if (item.sequence) {
      const index = parseInt(item.sequence)
      resort[index] = item
    } else {
      resort[ii] = item
    }
  })
  return resort
}

module.exports = function createShelf(params) {
  const result = []
  const re_cat = /\w/
  const that = this
  if (Array.isArray(params)) {
    params = reSort(params)
    params.forEach((item, index) => {
      
      if (typeof item == 'string') item = {name: item}
      let {name, title, size, content} = item
      if (name && re_cat.test(name)) {
        size = size || 3
        title = (title || name)+`(${size})`
        
        // 父级，分类
        // const _poi = `${name}-${index}`
        const _poi = `${name}`
        result.push({
          title, 
          idf: name, 
          poi: _poi,
          name
        })
        
        // 子级，元素内容
        content = [].concat(content||'')
        for (let ii=0; ii<size; ii++) {
          const poi = `${_poi}-${ii}`
          const cnt = content[ii] || `${title}的内容`
          result.push({
            title: cnt, 
            serialNumber: (ii+1),
            parent: name, 
            poi,
            name
          })
        }
      }
    })
  }

  result.forEach(item=>{
    if (item.parent) {
      const poi = item.poi
      app.hooks.once(poi, function(props) {
        if (props && props.cb && typeof props.cb == 'function') {
          const cb = props.cb
          delete props.cb
          return cb.call(that, props)
        } else {
          if (props) that.upItem(props)
          else {
            that.resetItem({poi})
          }
        }
      })
    }
  })

  return result
}