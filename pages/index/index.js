//index.js
//获取应用实例
const app = getApp()
const Pager = require('components/aotoo/core')
const lib = Pager.lib
const nav = lib.nav
const indexHook = lib.hooks('INDEX-HOOKS', true)
const dbkit = Pager.kit
const { manager } = require('./forIndex/plugins/recode')
const { shelfData,  myStickyBottomBar } = require('./forIndex/datasource')
let   pageElements = {}
let   pageStat = { catChange: false }

// 触发更新version的值
const re = /(cat|showcase|site)\/(add|update|set|delete|remove)/
// const re = /(add|update|set|delete|remove)/
dbkit.hooks.once('response', function (param) {
  if (re.test(param.$url)) {
    dbkit.cloud('one/site/upVersion')
  }
})

wx.setNavigationBarColor({
  frontColor: '#ffffff',
  backgroundColor: '#ff0000',
  animation: {
    duration: 400,
    timingFunc: 'easeIn'
  }
})

indexHook.once('getLocation', function(param) {
  return new Promise((resolve, rej)=>{
    Pager.kit.auth('userLocation').then(res => {
      wx.getLocation({
        type: 'wgs84',
        success(loc){
          const location = {
            latitude: loc.latitude, // 纬度
            longitude: loc.longitude, // 经度
            speed: loc.speed, // 速度
            accuracy: loc.accuracy, // 位置的精确度
          }
          app.globalData.location = location
          if (param) resolve(location)
        },
        fail(){}
      })
    }).catch(err => {
      Pager.alert('需要授权访问您的位置信息')
      wx.openSetting()
    })
  })
})

// 保存站点信息到本地
indexHook.once('shelf-site-info', async function (param) {
  let context = this
  let init = context&&context.doneSiteInfo ? true : false  // 由pages/index进入，初始化状态
  let oldVersion
  let localSiteInfo = indexHook.getItem('shelf-site-info')
  let siteInfo = app.globalData.siteInfo || localSiteInfo
  app.globalData.siteInfo = siteInfo
  
  if (param && param.newInfo) {
    siteInfo = Object.assign({}, siteInfo, param.newInfo)
    delete siteInfo.password
    delete siteInfo.password2
    app.globalData.siteInfo = siteInfo
    // siteInfo = undefined
    // app.globalData.siteInfo = undefined
  }
  
  if (siteInfo) {
    if (!siteInfo.version) {
      siteInfo = undefined
      app.globalData.siteInfo = undefined
      app.globalData.userInfo = undefined
      indexHook.delete('*')
    } else {
      oldVersion = siteInfo.version
    }
  }

  if (init) {
    // 刚进入小程序时
    siteInfo && setNavigationBar(siteInfo)
    let res = await dbkit.cloud('one/site/get')
    if (res.result && res.result.data && res.result.data.length) {
      siteInfo = res.result.data[0]
      app.globalData.siteInfo = siteInfo
    }
    if (siteInfo && oldVersion !== siteInfo.version) {
      context.versionChange = true
      indexHook.delete('shelfData') // shelf-site-info | global-user-info-expire | global-user-info | shelfData
    }
  } else {
    // 当修改站点信息时
    // indexHook.delete('shelf-site-info')
  }

  if (!siteInfo) siteInfo = {}
  indexHook.setItem('shelf-site-info', {
    username: siteInfo.username,
    descript: siteInfo.descript,
    version: siteInfo.version,
    period: siteInfo.period,
    distance: siteInfo.distance,
    location: siteInfo.location
  })

  init && context.doneSiteInfo.call(context)
  // context.setData({ siteInfo })
})

// 获取用户信息完成后的响应钩子
indexHook.once('doneUserInfo', function (uInfo={}) {
  saveUser(uInfo, 'init')
  reStickyBar(this, uInfo)
  // reSFSData(this) // 获取用户信息后，然后刷新产品列表

  // saveUser(uInfo)
  // setTimeout(() => {
  //   const url = './siteconfig/index'
  //   // const url = '../../demo/form/multipypicker/index'
  //   nav.navigateTo({ url })
  // }, 1000);
})

// 设置当前用户是否为管理员
indexHook.once('admin-user', function(param) {
  indexHook.setItem('admin-user', param, 3*24*60*60*1000)
  let uInfo = app.globalData.userInfo
  if (uInfo && !uInfo.admin) {
    uInfo.admin = true
    saveUser(uInfo)
  }
})

// 保存分类本地数据
indexHook.once('saveItem', function(param) {
  const context = this || {}
  if (param) {
    // 排序后
    let nparam = param
    if ( lib.isArray(param) && param.__sequence) {
      delete param.__sequence
      nparam = param.map((item, ii) => {
        item.sequence = ii.toString()
        return item
      })
    }
    
    // 分类被修改过
    if (param.__catchage) {
      pageStat.catChange = true
      delete param.__catchage
    }
    
    indexHook.setItem('shelfData', nparam)
    if (!context.noup) {
      batchUpdate(nparam)
    }
  }
})

// 分类增加
indexHook.once('add-cat', async function (param) {
  if (param) {
    pageStat.catChange = true
    return await dbkit.cloud('one/cat/add', param)
  }
})

// 更新分类
indexHook.once('update-cat', async function (param) {
  if (param) {
    pageStat.catChange = true
    param.where = {name: param.name}
    return await dbkit.cloud('one/cat/update', param)
  }
})

// 删除分类
indexHook.once('delete-cat', async function (param) {
  if (param) {
    pageStat.catChange = true
    return await dbkit.cloud('one/cat/delete', {name: param.name})
  }
})

// 保存本地用户信息和云端用户信息
function saveUser(uInfo, from) {
  if (uInfo) {
    delete uInfo.__onlysetglobal
    app.globalData.userInfo = uInfo
    indexHook.setItem('global-user-info', uInfo, 3 * 24 * 60 * 60 * 1000)
    if (from && from === 'init') {
      dbkit.cloud('one/user/add', uInfo)
    }
  }
}

// 检查并获取用户信息
async function checkUserInfo(context, opts, cb) {
  const modal = pageElements.modal
  const modalBotPop = { itemClass: 'bar', itemStyle: "height: 26vh;" }
  if (lib.isFunction(opts)) { 
    cb = opts; 
    opts = null 
  }

  let localUser = indexHook.getItem('global-user-info')
  let uInfo = app.globalData.userInfo || localUser
  if (!uInfo) {
    modal.reset().bot(modalBotPop)
  } else {
    uInfo && (uInfo.__onlysetglobal=true)
    indexHook.emit('doneUserInfo', uInfo, context)
  }

  responseUserButton(context, modal, uInfo, cb)
}

// 响应用户信息授权按钮
function responseUserButton(context, modal, uInfo, cb) {
  context.hooks.once('getUserInfo', async function(userInfo) {
    modal.hide()
    if (wx.isCloud) {
      // await dbkit.cloud('one/user/add', userInfo)
      let res = await dbkit.cloud('one/user/selfInfo')
      if (res && res.result && res.result.data && res.result.data.length) {
        let myInfo = res.result.data[0]
        let {uid, admin} = myInfo
        userInfo.admin = admin
        userInfo.uid = uid
      }
      indexHook.emit('doneUserInfo', userInfo, context)
      lib.isFunction(cb) && cb(userInfo)
    }
  })
}

// 批量更新分类
async function batchUpdate(payload){
  try {
    if (payload.length) {
      let param = payload.shift()
      param.where = {name: param.name}
      await dbkit.cloud(`one/cat/update`, param)
      batchUpdate(payload)
    }
  } catch (error) {
    console.error(error);
  }
}

// 设置全局标题
function setNavigationBar(siteInfo) {
  if (siteInfo && siteInfo.username) {
    wx.setNavigationBarTitle({
      title: siteInfo.username
    })
  }
}

// 重新渲染货架数据
async function reSFSData(context, param={}) {
  if (context.versionChange) {
    pageElements.shelfs.clearStorage()
  }
  let sfData = indexHook.getItem('shelfData')
  if (!sfData) {
    let myData
    const cats = await dbkit.cloud('one/cat/get')
    if (cats && cats.result && cats.result.data.length) {
      const sd = cats.result.data
      const catsData = sd.sort((a, b) => (a.sequence - b.sequence))
      myData = catsData
    }

    // 初始化数据
    if (!myData) {
      myData = shelfData
      context.initStat = true
      indexHook.emit('add-cat', myData[0])  // 上传到数据库
    }

    indexHook.emit('saveItem', myData, {noup: true})
    pageElements.shelfs.reBuild(myData)
  } else {
    pageElements.shelfs.reBuild(sfData)
  }
}

// 管理状态需要重构导航栏
function reStickyBar(context, param) {
  let stickyBottomBar = context.getElementsById('stickyBottomBar')
  let uInfo = app.globalData.userInfo
  let data = stickyBottomBar.getData()
  let title = data.title
  if (!param.from && uInfo.admin) {
    title.push(appendAdminSwitch(context))
  }
  stickyBottomBar.update({
    title
  })
}

// 响应admin用户状态
function appendAdminSwitch(context) {
  return {
    "@switch": {
      title: '编辑',
      itemClass: 'isAdmin',
      hooks: {
        'changeValue': function (param) {
          let val = this.value()
          context.editer = val
        }
      }
    }
  }
}

let initData = {
  shelfs: ()=>{
    // const mydata = indexHook.getItem('shelfData') || []
    const mydata = []
    return Pager.list({ data: mydata })
  },
  modal: ()=>{
    return Pager.item({
      slot: true,
      title: [ { title: '将获取您的用户信息(包括头像、昵称等)' }]
    })
  },
  pop: ()=>{
    return Pager.item({})
  }
}

Pager({
  data: {
    shelfs: initData.shelfs(),
    modal: initData.modal(),
    popData: initData.pop(),
    stickyBottomBar: Pager.item(myStickyBottomBar),
    siteInfo: undefined
  },

  // onPullDownRefresh(a, b, c) {
  //   wx.showNavigationBarLoading()
  //   wx.stopPullDownRefresh({
  //     success: function (a, b, c) {
  //       console.log('============= uuuuuu');
  //     },
  //     complete: function (res) {
  //       setTimeout(() => {
  //         wx.hideNavigationBarLoading() //完成停止加载
  //       }, 3000);
  //     }
  //   })
  // },

  versionChange: false,   // 版本是否变化

  initStat: false,  // 是否为初始数据

  closepreview() {
    const pop = pageElements.pop
    pop.hide()
  },

  addMedia(e, param, inst) {
    const uInfo = app.globalData.userInfo
    const pop = pageElements.pop
    let url = lib.formatToUrl('./shelfedit/index', param)
    if (param.type) {
      url = lib.formatToUrl('./shelfcatlist/index', param)
    }
    if (this.editer) {
      nav.navigateTo({ url })
    } else {
      if (param.type) {
        
      } else {
        const item = pageElements.shelfs.getCover(param)
        if (item) {
          const img = item.img
          const data = item.data
          const title = data.footer && data.footer[0].title || '预览'
          if (img && img !== '/images/plus.png') {
            pop.reset().css({ width: '85%', height: '80%', top: '-60px' })
            .pop({
              "@item": {
                title: title,
                img: {src: img, mode: 'widthFix', aim: 'closepreview'}, 
                itemClass: 'popMedia'
              },
            })
          }
        }
      }
    }
  },

  siteTimer: undefined,
  siteConfigEnabel: false,
  onRecode(e, param, inst) {
    wx.vibrateShort()
    this.siteConfigEnabel = false
    this.siteTimer = setTimeout(() => {
      this.siteConfigEnabel = true
      wx.showToast({
        title: '聆听中……',
        icon: 'loading',
        duration: 2000
      })
      manager.start()
      indexHook.once('si-start', function (param) {})
    }, 3000);
  },

  onStopRecode(e, param, inst) {
    const siteInfo = app.globalData.siteInfo
    clearTimeout(this.siteTimer)
    if (this.siteConfigEnabel) {
      const that = this
      manager.stop();
      wx.showToast({
        title: '正在识别……',
        icon: 'loading',
        duration: 2000
      })
      indexHook.once('si-stop', function (param) {
        const { duration, fileSize, result, tempFilePath } = param
        if (result && result.indexOf('打开编辑')>-1) {
          const url = './siteconfig/index'
          nav.navigateTo({ url })
        } else {
          Pager.alert('命令匹配错误')
        }
      })
    } else {
      if (app.globalData.userInfo) {
        if (siteInfo.telphone) {
          let period = this.period()
          let measuring = this.measuring()
          if (period && measuring) {
            wx.makePhoneCall({ phoneNumber: siteInfo.telphone })
          } else {
            // let msg = !measuring ? '您不在商家送货范围内' : '当前时段商家未营业'
            let msg = !period ? '当前时段商家未营业' : '您不在商家送货范围内'
            Pager.alert(msg)
          }
        } else {
          Pager.alert('还没有配置电话号码')
        }
      } else {
        checkUserInfo(this)
      }
    }
  },

  onShow() {
    const that = this
    indexHook.once('cat-change', function(param={}) {
      if (pageStat.catChange) {
        const shelfData = indexHook.getItem('shelfData')
        pageElements.shelfs.reBuild(shelfData)
        reSFSData(that, {from: 'onShow'})
      }
      pageStat.catChange = false
    })
  },
  
  onReady() {
    // // 赋值全局变量pageElements，分别指定页面实例
    pageElements.shelfs = this.getElementsById('shelfs')
    pageElements.modal = this.getElementsById('modal')
    pageElements.pop = this.getElementsById('popData')
    this.doneReady = true
  },

  doneSiteInfo(){
    // setTimeout(() => {
    //   const url = './siteconfig/index'
    //   nav.navigateTo({ url })
    // }, 3000);

    if (this.doneReady) {
      reSFSData(this)
      checkUserInfo(this)
    } else {
      setTimeout(() => {
        reSFSData(this)
        checkUserInfo(this)
      }, 500);
    }
  },

  onLoad() {
    this.editer = false
    indexHook.emit('getLocation')
    indexHook.emit('shelf-site-info', {}, this)
  },

  onUnload() {

  },

  onHide() {
    // Do something when page hide.
  },

  // 当用户点击登录按钮后，触发onGetUserInfo
  onGetUserInfo(e){
    this.hooks.emit('getUserInfo', e.detail.userInfo)
  },

  onCancelGetUserInfo(e) {
    pageElements.modal.hide()
  },

  /**
   * @creator 新猿意码
   * @data 2019/01/17
   * @desc 由经纬度计算两点之间的距离，la为latitude缩写，lo为longitude
   * @param la1 第一个坐标点的纬度
   * @param lo1 第一个坐标点的经度
   * @param la2 第二个坐标点的纬度
   * @param lo2 第二个坐标点的经度
   * @return (int)s   返回距离(单位千米或公里)
   * @tips 注意经度和纬度参数别传反了，一般经度为0~180、纬度为0~90
   * 具体算法不做解释，有兴趣可以了解一下球面两点之间最短距离的计算方式
   */
  measuring: function () {
    const siteInfo     = app.globalData.siteInfo
    const distance     = siteInfo.distance
    const shopLocation = siteInfo && app.globalData.siteInfo.location
    const userLocation = app.globalData.location && app.globalData.location
    if (shopLocation && userLocation) {
      const la1 = shopLocation.latitude
      const lo1 = shopLocation.longitude
      const la2 = userLocation.latitude
      const lo2 = userLocation.longitude
  
      let La1 = la1 * Math.PI / 180.0;
      let La2 = la2 * Math.PI / 180.0;
      let La3 = La1 - La2;
      let Lb3 = lo1 * Math.PI / 180.0 - lo2 * Math.PI / 180.0;
      let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(La3 / 2), 2) + Math.cos(La1) * Math.cos(La2) * Math.pow(Math.sin(Lb3 / 2), 2)));
      s = s * 6378.137;
      s = Math.round(s * 10000) / 10000;
      s = s.toFixed(2);
      // return s;
      return (distance > s)
    }
  },

  period(){
    const siteInfo = app.globalData.siteInfo
    const period = siteInfo.period
    if (period) {
      let startTime = period[0]
      let endTime = period[1]
      let d = new Date()
      let curHour = d.getHours()

      if (startTime === endTime) {
        return false
      }

      if (endTime < startTime) {
        if (curHour > endTime && curHour < startTime) {
          return false
        }
        return true
      } else {
        // startTime < endTime
        if (curHour >= startTime && curHour <= endTime) {
          return true
        }
      }
      
      return false
    }
  }

})
