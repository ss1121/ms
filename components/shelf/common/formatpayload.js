
let types  = ['recycle',   'damage',    'kitchenWaste', 'others',    'unrecycle']
let colors = ['bg-02943e', 'bg-dc251a', 'bg-0092df', 'bg-e99718', 'bg-0092df']
let wrapType = {is: 'scroll'}
let scrollType = {
  is: 'scroll',
  "scroll-x": true,
  "scroll-y": false,
}


/**
 * 数据结构
 * title: cnt,
   serialNumber: ii,
   parent: name,
   poi,
   name  // 随机
 */

/**
 * {
 *  title: [
 *   {title: '左上角标题'},
 *   {img: {src: 'cover首页图'}},
 * ],
 * img: [图组]
 * body: [属性类]  
 * footer: [功能类]  
 * }
 * 
 */

function catName(data, idf) {
  let findIt
  for(let ii=0; ii<data.length; ii++) {
    let item = data[ii]
    if (item.idf === idf) {
      findIt = item
    }
  }
  return findIt
}

module.exports = function formatPayload(params, dataSource, wrapCls='d-swiper-ul') {
  if (typeof dataSource === 'object' && !Array.isArray(dataSource)) {
    // wrapCls = dataSource.listClass || wrapCls
    wrapType = Object.assign(wrapType, (dataSource.type||{}))
    scrollType = Object.assign(scrollType, (dataSource.scrollType || {}))

    delete dataSource.type
    delete dataSource.scrollType
  }
  // formData.fromComponent = this.uniqId

  const data = params.map(item=>{
    if (item.parent && item.idf) {
      return item
    } 
    
    else if(item.parent) {
      const parent = item.parent
      const itCls = colors[types.indexOf(parent)]
      const oTitle = item.title
      const cat = catName(params, item.parent) || {}
      let catTitle = cat.title
      if (typeof catTitle == 'object' && !Array.isArray(catTitle)) {
        catTitle = catTitle.title
      }
      // item.title = [
      //   // {title: item.title},
      //   {title: item.serialNumber, itemClass: 'shelfItem-property serialNumber'},
      //   {img: {src: '/images/plus.png'}, itemClass: 'shelfItem-property plusMedia', aim: `addMedia?poi=${item.poi}&name=${item.name}`}
      // ]
      item.title = {title: item.serialNumber, itemClass: 'shelfItem-property serialNumber'}
      item.img = {src: '/images/plus.png', itemClass: 'shelfItem-property plusMedia', aim: `addMedia?poi=${item.poi}&name=${item.name}&cat=${catTitle}`}
      item.itemClass = 'd-swiper-title'
      return item
    } 
    
    else {
      if (item.idf) {
        item.type = scrollType
        const itCls = colors[types.indexOf(item.idf)]
        item.liClass = `${wrapCls} ${itCls ? 'ds-li-'+itCls : '' }`
        item.title = {title: item.title, itemClass: 'item-title', aim: `addMedia?type=cat&name=${item.idf}&poi=${item.poi}`}
        // item.title = {title: item.title, itemClass: 'item-title', aim: `addMedia?type=cat&poi=${item.poi}`}
      }
      return item
    }
  })

  let listCls = dataSource.listClass ? 'ul ' + dataSource.listClass : 'ul'
  return Object.assign({}, dataSource, {
    data,
    type: wrapType,
    listClass: listCls
  })
}