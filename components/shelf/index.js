/**
 * 作者： 天天修改
 * github: webkixi
 * 小程序的模板真是又长又臭
 */
const app = getApp()
const Core = require('../aotoo/core')
const createShelf = require('./common/createshelf')
const formatPayload = require('./common/formatpayload')
const lib = Core.lib
const dbkit = Core.kit
const { reSetList } = lib
const poisHooks = lib.hooks('shelf-pois', {localstorage: true, max: 500})
const imgsCache = lib.hooks('pois-imgs', {localstorage: true, max: 150})
const fs = wx.getFileSystemManager()
imgsCache.once('cache-switch', function(shadowData) {
  /** storeData与shadowData数据交换时，会丢弃shadowData的所有本地图片数据 
   * 在丢弃之前应该要清除所有本地缓存的图片
  */
 Object.keys(shadowData).forEach(poi=>{
   let imgsrc = shadowData[poi].$$value.target
   imgsCache.delete(poi)
   wx.removeSavedFile({ filePath: imgsrc })
 })
})

imgsCache.once('cache-delete', function(value) {
 if (value && value.target) {
  let imgsrc = value.target
  wx.removeSavedFile({ filePath: imgsrc })
 }
})

imgsCache.once('cache-destory', function(allData) {
 Object.keys(allData).forEach(poi => {
   let imgobj = allData[poi].$$value
   wx.removeSavedFile({ filePath: imgobj.target })
 })
})

poisHooks.once('cache-destory', function() {
  // imgsCache.clear()
})

let downloadFile = wx.cloud.downloadFile
function saveImageToLocalCache(poi, imgsrc) {
  return new Promise((resolve, reject) => {
    let config = {
      fileID: imgsrc, // wx.cloud.downloadFile
      // url: imgsrc,  // wx.downloadFile
      // header: {},
      fail(err) {
        console.log(err);
      },
      success: function (res) {
        if (res.statusCode === 200) {
          wx.saveFile({
            tempFilePath: res.tempFilePath, // 传入一个临时文件路径
            fail(err) {
              console.log(err);
            },
            success(res) {
              let imgObj = {
                ori: imgsrc,
                target: res.savedFilePath
              }
              imgsCache.setItem(poi, imgObj)
              resolve(imgObj)
            }
          })
        }
      }
    }

    if (imgsrc && imgsrc.indexOf('cloud://') === 0) {
      downloadFile = wx.isCloud ? wx.cloud.downloadFile : ()=>{}
    }

    downloadFile(config)
  })
}


// 触发更新version的值
const re = /(add|update|set|delete|remove)/
dbkit.hooks.once('response', function (param) {
  if (re.test(param.$url)) {
    dbkit.cloud('one/site/upVersion')
  }
})

function grabData(dataSource) {
  let ds = dataSource
  let myds = createShelf.call(this, ds.data)
  let vType = {
    bindscroll: '_bindscroll',
    bindscrolltoupper: '_bindscrolltoupper',
    bindscrolltolower: '_bindscrolltolower'
  }

  let hType = {
    bindscroll: '_bindscroll_h',
    bindscrolltoupper: '_bindscrolltoupper_h',
    bindscrolltolower: '_bindscrolltolower_h'
  }

  ds.type = vType
  ds.scrollType = hType

  let preData = formatPayload.call(this, myds, ds)
  return reSetList(preData, preData)
}

/**
 * 
 * {
 *    data: [
 *  {name: 'recycle', title: '可回收', size: 3, content: {title: '可回收的东西'}}, 
    {name: 'damage', title: '有害', size: 3, content: ['有害的东西', '有害的东西aaa']}, 
    {name: 'kitchenWaste', title: '厨余', size: 3, content: '厨房剩余的东西'}, 
    {name: 'others', title: '其他', size: 3, content: '其他东西'}, 
    {name: 'unrecycle', title: '不可回收', size: 3, content: '哪些是不可回收'}, 
 * ],
    listClass
    itemClass
    edit: false
 * }
 */

// 基于item的组件
Component({
  options: {
    multipleSlots: true, // 在组件定义时的选项中启用多slot支持
    addGlobalClass: true
  },
  properties: {
    dataSource: Object,
  },
  data: {
  },
  behaviors: [Core.treeComponentBehavior(app, 'shelf')],
  pageLifetimes: {
    show: function () {},
    hide: function () {},
    resize: function () {},
  },
  lifetimes: {
    created: function () {
      this.query = wx.createSelectorQuery().in(this)
      this.zoneItems = []  // 在显示区的元素
      this.plusPics = []   // 所有img .plusMedia元素
      this.zonePois = []
      this.v_scrollTimer = null
      this.enabelLazy = false
      this.pagination = {
        total: 10,
        pageSize: 100,
        current: 0
      }
      this.isloading = false
    },
    attached: function() { //节点树完成，可以用setData渲染节点，但无法操作节点
      let properties = this.properties
      let dataSource = properties.list || properties.dataSource
      const result = grabData.call(this, dataSource)
      this.setData({ $list: result })
    }, 
    ready(){
      const that = this
      const ctx = this.activePage
      ctx.hooks.on('onReady', function () {
        let sysInfo = wx.getSystemInfoSync()
        that.screenWidth = sysInfo.screenWidth
        that.screenHeight = sysInfo.screenHeight
        that.scrollTop = 0
        that.scrollLeft = 0
        that.offsetTop = 0
        that.offsetLeft = 0
      })
    }
  },
  methods: {
    _bindscroll(e){
      let detail = e.detail
      let currentTarget = e.currentTarget
      this.scrollTop = detail.scrollTop
      this.offsetTop = currentTarget.offsetTop
      this.offsetLeft = currentTarget.offsetLeft
      if (this.enabelLazy) {
        this.hooks.emit('upItems', {axle: 'y'})
      }
    },
    _bindscrolltoupper(e) {},
    _bindscrolltolower(e) {},
    
    _bindscroll_h(e){
      let detail = e.detail
      let currentTarget = e.currentTarget
      this.scrollLeft = detail.scrollLeft
      this.offsetTop = currentTarget.offsetTop
      this.offsetLeft = currentTarget.offsetLeft
      if (this.enabelLazy) {
        this.hooks.emit('upItems', {axle: 'x'})
      }
    },
    _bindscrolltoupper_h(e) {},
    _bindscrolltolower_h(e) {},

    // 查询所有未被加载的子元素
    __queryPlusPics(){
      let that = this
      that.query.selectAll('.shelf-boxer >>> .plusMedia').boundingClientRect((ret) => {
        if (ret && ret.length) {
          that.__computZoneItems(ret)
        }
      }).exec()
    },


    // 计算位于可视区域的子元素
    __computZoneItems(ret, axle='y'){
      let that = this
      let zoneItems = this.zoneItems
      let plusPics = ret || this.plusPics
      let screenWidth = this.screenWidth
      let screenHeight = this.screenHeight
      let scrollTop = this.scrollTop
      let scrollLeft = this.scrollLeft
      let offsetTop = this.offsetTop-5
      let offsetLeft = this.offsetLeft-5

      let sw = screenWidth
      let sh = screenHeight
      let st = scrollTop
      let sl = scrollLeft
      let ot = offsetTop
      let ol = offsetLeft
      let re = /(poi=(.*))&name/

      if (plusPics && plusPics.length) {
        let tmp_plus = []
        plusPics.forEach((item, ii) => {
          let {top, left, right, bottom, height, width, dataset} = item
          let evt = dataset.evt
          let matchIt = re.exec(evt)
          item.poi = matchIt[2]

          // 纵向滚动
          if (
            axle == 'y'
            && top > st 
            && top < (st+sh+parseInt(sh/2))  // 纵向一屏半
            && left > sl
            && left < (sl+sw)
            && matchIt.length === 3
          ) {
            zoneItems.push({
              index: ii,
              item,
              poi: matchIt[2]
            })
          } 

          // 横向滚动
          else if (
            axle == 'x'
            && top > ot
            && top < (ot+10+height)
            && left > sl 
            && left < (sl + 4*sw)  // 横向4屏
            // && left < (sl + sw)
          ){
            zoneItems.push({
              index: ii,
              item,
              poi: matchIt[2]
            })
          } 

          // 未出现在可视区域内的子元素
          else {
            tmp_plus.push(item)
            return item
          }
        })
        that.zoneItems = zoneItems
        that.plusPics = tmp_plus
      }
    },

    // 第三版，支持lru，缓存
    async __layzyItems(target, pois, opts) {
      let axle = opts&&opts.axle
      let zoneItems = this.zoneItems
      let plusPics = this.plusPics
      let thePois = this.zonePois
      let layzyItems = null
      if (!zoneItems.length) {
        this.__computZoneItems(null, axle)
        zoneItems = this.zoneItems
      }
      if (plusPics.length && zoneItems.length) {
        let _zonePois = zoneItems.map(item => item.poi)
        let zonePois = _zonePois.filter(poi => thePois.indexOf(poi) === -1)
        this.zonePois = this.zonePois.concat(zonePois)

        if (zonePois.length) {
          let result = []
          let zPois = []
          let cache = poisHooks.getItem('*')
          
          for (let ii = 0; ii < zonePois.length; ii++) {
            let poi = zonePois[ii]
            if (cache[poi]) {
              let poiItem = poisHooks.getItem(poi) 
              if (poiItem.img) {
                result.push(poiItem)
              } else {
                zPois.push(poiItem.poi)
              }
            } else {
              zPois.push(poi)
            }
          }
          zonePois = zPois
          
          if (!this.isloading) {
            this.isloading = true
            wx.showLoading({ title: '努力更新中' })
          }
          if (zonePois.length) {
            let res = await dbkit.cloud('one/showcase/catch', {zone: zonePois})
            if (res && res.result && res.result.data && res.result.data.length) {
              res.result.data.forEach(item => {
                poisHooks.setItem(item.poi, item)
              })
              result = result.concat(res.result.data)
            }
          }

          if (result.length) {
            layzyItems = {}
            result.forEach(item => {
              if (item.img) {
                let localCacheImg = imgsCache.getItem(item.poi)
                if (localCacheImg) {
                  if (item.img === localCacheImg.ori) {
                    try {
                      if (fs.accessSync(localCacheImg.target)) {
                        item.img = localCacheImg.target
                      }
                    } catch (error) {
                      item.img = item.___img
                      imgsCache.delete(item.poi)
                      saveImageToLocalCache(item.poi, item.___img)
                    }
                  } else {
                    imgsCache.delete(item.poi)
                    saveImageToLocalCache(item.poi, item.img)
                  }
                }
                else {
                  if (item.img.indexOf('http://store/') === 0) { // img属性被污染了，缓存过的图片，storage又被清空了，
                    item.img = item.___img
                  } else {
                    item.___img = item.img
                  }
                  saveImageToLocalCache(item.poi, item.img) // 缓存图片到本地
                }
              }
              this.upItem(item, findIt => {
                let updateKey = `data[${findIt.__realIndex}]`
                layzyItems[updateKey] = findIt
              })
            })
          }
        }
        this.zoneItems = []
        return layzyItems
      }
    },


    // // 第二版，有缓存，但不能lru版
    // async __layzyItems(target, pois, opts){
    //   let axle = opts&&opts.axle
    //   let zoneItems = this.zoneItems
    //   let plusPics = this.plusPics
    //   let thePois = this.zonePois
    //   let layzyItems = {}
    //   if (!zoneItems.length) {
    //     this.__computZoneItems(null, axle)
    //     zoneItems = this.zoneItems
    //   }
    //   if (plusPics.length && zoneItems.length) {
    //     let _zonePois = zoneItems.map(item => item.poi)
    //     let zonePois = _zonePois.filter(poi => thePois.indexOf(poi) === -1)
    //     this.zonePois = this.zonePois.concat(zonePois)

    //     if (zonePois.length) {
    //       let result = []
    //       let zPois = []
    //       let localCachePois = poisHooks.getItem('pois') || []

    //       for (let ii=0; ii<zonePois.length; ii++) {
    //         let has = false
    //         let poi = zonePois[ii]
    //         for (let jj=0; jj<localCachePois.length; jj++) {
    //           let item = localCachePois[jj]
    //           if (item.poi === poi) {
    //             has = true
    //             result.push(item)
    //             break;
    //           }
    //         }
    //         if (!has) zPois.push(poi)
    //       }
    //       zonePois = zPois
            
    //       wx.hideLoading()
    //       wx.showLoading({ title: '正在更新商品' })

    //       if (zonePois.length) {
    //         let res = await dbkit.cloud('one/showcase/catch', {zone: zonePois})
    //         if (res && res.result && res.result.data && res.result.data.length) {
    //           poisHooks.append('pois', res.result.data)
    //           result = result.concat(res.result.data)
    //         }
    //       }

    //       if (result.length) {
    //         result.forEach(item => {
    //           this.upItem(item, findIt => {
    //             let updateKey = `data[${findIt.__realIndex}]`
    //             layzyItems[updateKey] = findIt
    //           })
    //         })
    //       }
    //     }

    //     this.zoneItems = []
    //     return layzyItems
    //   }
    // },

    // // 第一版，没有缓存版
    // async __layzyItems(target, pois, opts){
    //   let axle = opts&&opts.axle
    //   let zoneItems = this.zoneItems
    //   let plusPics = this.plusPics
    //   let layzyItems = {}
    //   if (!zoneItems.length) {
    //     this.__computZoneItems(null, axle)
    //     zoneItems = this.zoneItems
    //   }
    //   if (plusPics.length && zoneItems.length) {
    //     zoneItems.forEach(item => {
    //       let poi = item.poi
    //       if (pois[poi]) {
    //         let upKey = pois[poi]
    //         layzyItems[upKey] = target[upKey]
    //       } 
    //       else {
    //         // 超出总数量
    //         let res = dbkit.cloud('one/showcase/get')
    //         res.then(data=>{
    //           console.log(data);
    //         })
    //       }
    //     })
    //     this.zoneItems = []
    //     return layzyItems
    //   }
    // },

    clearStorage(){
      poisHooks.clear()
    },
    
    reBuild(param=[]){
      if (lib.isArray(param)) {
        let result = grabData.call(this, {data: param})
        let _list  = this.data.$list
        _list.data = result.data
        this.update({ data: result.data }, ()=>{
          this.__queryPlusPics()
          setTimeout(() => {
            this.fillShelfs()
          }, 300);
        })
      }
    },

    // 抬头
    // title[0]
    upTitle(param={}, ori, cb){
      const {poi} = param
      if (lib.isFunction(ori)) {
        cb = ori; ori = undefined
      }
      const findIt = ori||this.find({poi})
      if (findIt) {
        if (param.title) {
          // findIt.title[0].title = param.serialNumber || param.title
          findIt.title = param.serialNumber || param.title
          if (ori) return findIt
          const updateKey = `data[${findIt.__realIndex}]`
          this.update({ [updateKey]: findIt })
          if (lib.isFunction(cb)) cb(findIt)
        }
        if (ori) return findIt
      }
    },

    getCover(param={}){
      if (param.poi) {
        const findIt = this.find(param)
        if (findIt) {
          let img = findIt.img ? findIt.img.src ? findIt.img.src : findIt.img : ''
          return {img, data: findIt}
        }
      }
    },

    _upCover(param, ori) {
      let {poi} = param
      let findIt = ori||this.find({poi})
      if (findIt) {
        if (param.img) {
          let imgPath = lib.isString(param.img) ? param.img : param.img.src
          let oldImg = findIt.img
          let myimg = { src: imgPath, itemClass: 'shelfItem-property realMedia' }
          findIt.img = Object.assign({}, oldImg, myimg)
        }
        return findIt
      }
    },
    // cover图片
    // title[1]
    upCover(param={}, ori, cb){
      // if (lib.isFunction(ori)) {
      //   cb = ori; ori = undefined
      // }
      // let findIt = this._upCover(param, ori)
      // if (findIt) {
      //   if (ori) return findIt
      //   else {
      //     const updateKey = `data[${findIt.__realIndex}]`
      //     this.update({ [updateKey]: findIt })
      //     if (lib.isFunction(cb)) {
      //       cb(findIt)
      //     }
      //   }
      // }


      let that = this
      let {poi} = param
      if (lib.isFunction(ori)) {
        cb = ori; ori = undefined
      }
      let findIt = ori||this.find({poi})
      if (findIt) {
        if (param.img) {
          let imgPath = lib.isString(param.img) ? param.img : param.img.src
          let oldImg = findIt.img
          let myimg = { src: imgPath, itemClass: 'shelfItem-property realMedia' }
          findIt.img = Object.assign({}, oldImg, myimg)
          if (ori && lib.isFunction(cb)) {
            cb(findIt)
          } else {
            let updateKey = `data[${findIt.__realIndex}]`
            that.update({ [updateKey]: findIt })
            if (lib.isFunction(cb)) cb(findIt)
          }
          // wx.getImageInfo({
          //   src: imgPath,
          //   success(res) {
          //     let oldImg = findIt.img
          //     let myimg = { src: imgPath, itemClass: 'shelfItem-property realMedia' }
          //     findIt.img = Object.assign({}, oldImg, myimg)
          //     if (ori && lib.isFunction(cb)) {
          //       cb(findIt)
          //     } else {
          //       let updateKey = `data[${findIt.__realIndex}]`
          //       that.update({ [updateKey]: findIt })
          //       if (lib.isFunction(cb)) cb(findIt)
          //     }
          //   }
          // })
        }
        if (ori && lib.isFunction(cb)) {
          return cb(findIt)
        }
        return findIt
      }
    },

    __findProperty(data=[], cls) {
      let findIt = false
      if (data && cls) {
        for (let ii=0; ii<data.length; ii++) {
          let item = data[ii]
          let className = item.itemClass
          if (className && className.indexOf(cls) > -1) {
            findIt = ii
            break;
          }
        }
      }
      if (findIt || findIt === 0) {
        data.splice(findIt, 1)
      }
      return data
    },

    
    _upCaption(param, ori){
      let {poi} = param
      let findIt = ori||this.find({poi})
      if (findIt) {
        if (param.caption) {
          if (findIt.footer) {
            let _data = this.__findProperty(findIt.footer, 'shelfItem-property caption')
            _data.push({ title: param.caption, itemClass: 'shelfItem-property caption' })
            findIt.footer = _data
          } else {
            findIt.footer = [
              {title: param.caption, itemClass: 'shelfItem-property caption'}
            ]
          }
        }
        return findIt
      }
    },
    // 标题
    // title[2]
    upCaption(param={}, ori, cb) {
      if (lib.isFunction(ori)) {
        cb = ori; ori = undefined
      }
      let findIt = this._upCaption(param, ori)
      if (findIt) {
        if (ori) return findIt
        else {
          const updateKey = `data[${findIt.__realIndex}]`
          this.update({ [updateKey]: findIt })
          if (lib.isFunction(cb)) {
            cb(findIt)
          }
        }
      }

      // const {poi} = param
      // if (lib.isFunction(ori)) {
      //   cb = ori; ori = undefined
      // }
      // const findIt = ori||this.find({poi})
      // if (findIt) {
      //   if (param.caption) {
      //     if (findIt.footer) {
      //       const _data = this.__findProperty(findIt.footer, 'shelfItem-property caption')
      //       _data.push({ title: param.caption, itemClass: 'shelfItem-property caption' })
      //       findIt.footer = _data
      //     } else {
      //       findIt.footer = [
      //         {title: param.caption, itemClass: 'shelfItem-property caption'}
      //       ]
      //     }
      //     if (ori) return findIt
      //     const updateKey = `data[${findIt.__realIndex}]`
      //     this.update({ [updateKey]: findIt })
      //     if (lib.isFunction(cb)) cb(findIt)
      //   }
      //   if (ori) return findIt
      // }
    },

    _upDesc(param, ori){
      let {poi} = param
      let findIt = ori||this.find({poi})
      if (findIt) {
        if (param.descript) {
          if (findIt.footer) {
            const _data = this.__findProperty(findIt.footer, 'shelfItem-property descript')
            _data.push({ title: param.descript, itemClass: 'shelfItem-property descript' })
            findIt.footer = _data
          } else {
            findIt.footer = [
              {title: param.descript, itemClass: 'shelfItem-property descript'}
            ]
          }
        }
        return findIt
      }
    },

    // 描述
    // title[3]
    upDesc(param={}, ori, cb) {
      if (lib.isFunction(ori)) {
        cb = ori; ori = undefined
      }
      let findIt = this._upDesc(param, ori)
      if (findIt) {
        if (ori) return findIt
        else {
          const updateKey = `data[${findIt.__realIndex}]`
          this.update({ [updateKey]: findIt })
          if (lib.isFunction(cb)) {
            cb(findIt)
          }
        }
      }

      // const {poi} = param
      // if (lib.isFunction(ori)) {
      //   cb = ori; ori = undefined
      // }
      // const findIt = ori||this.find({poi})
      // if (findIt) {
      //   if (param.descript) {
      //     if (findIt.footer) {
      //       const _data = this.__findProperty(findIt.footer, 'shelfItem-property descript')
      //       _data.push({ title: param.descript, itemClass: 'shelfItem-property descript' })
      //       findIt.footer = _data
      //     } else {
      //       findIt.footer = [
      //         {title: param.descript, itemClass: 'shelfItem-property descript'}
      //       ]
      //     }
      //     if (ori) return findIt
      //     const updateKey = `data[${findIt.__realIndex}]`
      //     this.update({ [updateKey]: findIt })
      //     if (lib.isFunction(cb)) cb(findIt)
      //   }
      //   if (ori) return findIt
      // }
    },

    _upProperty(){
      return this.upProperty.apply(this, arguments)
    },
    upProperty(param={}, prefix){
      let {poi} = param
      if (typeof prefix !== 'string') prefix = 'property'
      if (prefix.indexOf('-') == -1) {
        prefix = prefix+'-'
      }
      let findIt = this.find({poi})
      if (findIt) {
        let mykeys = Object.keys(param)
        let nparam = []
        mykeys.forEach(ky=>{
          if (ky.indexOf(prefix) > -1) {
            (param[ky]||param[ky]===0) ? nparam.push(ky) : ''
          }
        })
        nparam.forEach(myky=>{
          let [kyPrefix, kyName] = myky.split('-')
          if (findIt.footer) {
            let _data = this.__findProperty(findIt.footer, `shelfItem-property ${kyName}`)
            _data.push({ title: param[myky], itemClass: `shelfItem-property ${kyName}`})
            findIt.footer = _data
          } else {
            findIt.footer = [{
              title: param[myky],
              itemClass: `shelfItem-property ${kyName}`
            }]
          }
        })
        return findIt
      }
    },

    upItem(param={}, opts={}, cb) {
      const that = this
      const {poi} = param
      if (lib.isFunction(opts)) {
        cb = opts
        opts = undefined
      }

      let _ups = []
      if (lib.isString(opts)) _ups.push(opts)
      if (lib.isArray(opts)) _ups.concat(opts)

      // const ups = ['upTitle', 'upCaption', 'upDesc']
      // const ups = ['upCaption', 'upDesc']
      const ups = ['upCaption', 'upDesc', 'upProperty']
      let findIt = this.find({poi})
      findIt = ups.reduce((p, n)=>{ 
        if (p) return this[n](param, p) 
      }, findIt)

      this.upCover(param, findIt, function(_findIt) {
        const updateKey = `data[${findIt.__realIndex}]`
        if (lib.isFunction(cb)) cb(_findIt)
        else {
          that.update({ [updateKey]: _findIt })
        }
      })
    },

    // 填充货架
    async fillShelfs() {
      // wx.showLoading()
      // const res = await dbkit.cloud('one/showcase/get')
      // if (res.result && res.result.data && res.result.data.length) {
      //   this.upItems(res.result.data, 'lazy')
      // }
      // wx.hideLoading()

      this.upItems([], 'lazy')
    },

    upItems(param, options, cb){
      let that = this
      let upTimer = null
      let loadingTimmer = null

      if (lib.isFunction(options)) {
        cb = options
        options = null
      }

      if (lib.isArray(param)) {
        let target = {}
        let pois = {}

        this.hooks.once('upItems', function (param) {
          clearTimeout(upTimer)
          loadingTimmer = setTimeout(() => {
            wx.hideLoading()
            that.isloading = false
          }, 15000);

          upTimer = setTimeout(async () => {
            let axle = (param&&param.axle) || 'y'
            let layzyItems = await that.__layzyItems(target, pois, {axle})
            if (layzyItems) {
              that.update(layzyItems, function() {
                clearTimeout(loadingTimmer)
                wx.hideLoading()
                that.isloading = false
              })
            } else {
              clearTimeout(loadingTimmer)
              wx.hideLoading()
              that.isloading = false
              return 'noLayzy'
            }
          }, 100);
        })

        if (cb && lib.isFunction(cb)) {
          cb.call(this, target)
        } else {
          if (options === 'lazy') {
            this.enabelLazy = true
            let res_upi = this.hooks.emit('upItems')
            if (res_upi[0] === 'noLayzy') {
              this.update(target)
            }
          } else {
            this.update(target)
          }
        }
      }
    },
    // upItems(param, options, cb){
    //   if (lib.isFunction(options)) {
    //     cb = options
    //     options = null
    //   }

    //   let that = this
    //   if (lib.isArray(param)) {
    //     let target = {}
    //     let pois = {}
    //     param.forEach(item=>{
    //       this.upItem(item, findIt=> {
    //         let updateKey = `data[${findIt.__realIndex}]`
    //         let poi = findIt.poi
    //         pois[poi] = updateKey
    //         target[updateKey] = findIt
    //       })
    //     })

    //     this.hooks.once('upItems', async function (param) {
    //       let axle = (param&&param.axle) || 'y'
    //       if (lib.isEmpty(target)) {
    //         return 'noValue'
    //       }
    //       let layzyItems = await that.__layzyItems(target, pois, {axle})
    //       if (layzyItems) {
    //         that.update(layzyItems, () => {
    //           Object.keys(layzyItems).forEach(kyName => {
    //             delete target[kyName]
    //           })
    //         })
    //       } else {
    //         return 'noLayzy'
    //       }
    //     })

    //     if (cb && lib.isFunction(cb)) {
    //       cb.call(this, target)
    //     } else {
    //       if (options === 'lazy') {
    //         this.enabelLazy = true
    //         let res_upi = this.hooks.emit('upItems')
    //         if (res_upi[0] === 'noLayzy') {
    //           this.update(target)
    //         }
    //       } else {
    //         this.update(target)
    //       }
    //     }
    //   }
    // },

    resetItem(param={}){
      const {poi} = param
      let findIt = this.find({poi})
      if (findIt) {
        delete findIt.body
        delete findIt.footer
        delete findIt.dot
        findIt.img = {src: '/images/plus.png', itemClass: 'shelfItem-property plusMedia', aim: `addMedia?poi=${poi}`}
        const updateKey = `data[${findIt.__realIndex}]`
        this.update({ [updateKey]: findIt })
      }
    },

    // 图片组
    // body[0]
    upImgs(){}
  }
})