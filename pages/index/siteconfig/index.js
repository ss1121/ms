//index.js
//获取应用实例
const app = getApp()
const Pager = require('components/aotoo/core')
const lib = Pager.lib
const nav = lib.nav
const indexHook = lib.hooks('INDEX-HOOKS', true)
const dbkit = Pager.kit

function tips(text, icon, dur) {
  wx.showToast({
    title: text || '设置成功',
    icon: icon || 'success',
    duration: dur || 2000
  })
}

const catButton = (poi) => {
  return {
    type: 'button',
    itemClass: 'btn-primary',
    inputClass: 'shelf-item-submit',
    tap: 'onSubmitMedia?poi=' + poi || '',
    id: 'submitbtn',
    value: '提交'
  }
}

const addButton = () => {
  return {
    type: 'button',
    itemClass: 'btn-primary',
    inputClass: 'shelf-item-submit',
    tap: 'onSubmitMedia',
    id: 'submitbtn',
    value: '提交'
  }
}

const delButton = (poi) => {
  return {
    type: 'button',
    itemClass: 'btn-primary',
    inputClass: 'shelf-item-submit',
    tap: 'onSubmitMedia?act=delete&poi=' + poi || '',
    id: 'deleteBtn',
    value: '删除'
  }
}

const hours = () => {
  let _hours = []
  for (let ii=0; ii<24; ii++) {
    _hours.push({
      // title: ii.toString()+'时',
      title: ii.toString()+'时',
      id: 1000+ii
    })
  }
  return _hours
}

const minute = () => {
  let _minute = []
  for (let ii=0; ii<60; ii++) {
    _minute.push({
      title: ii.toString()+'分',
      id: 1000+ii
    })
  }
  return _minute
}

function backIndex(param={}) {
  // console.log(wx.CONFIG);
  setTimeout(() => {
    nav.navigateBack()
  }, 300)
}

function reStructor(param, stru) {
  const data = param.data
  Object.keys(data).forEach(key=>{
    switch (key) {
      default:
        const ipts = stru.body[0]['@form'].data
        for (let ii = 0; ii < ipts.length; ii++) {
          let inp = ipts[ii].input
          if (
            inp && 
            inp.id && 
            (inp.id===key || key.indexOf('property-')===0) &&
            inp.id !== 'location'
          ) {
            if (key === 'period') {
              let vals = data[key]
              let startTime = hours()
              startTime[vals[0]].select = true

              let endTime = hours()
              endTime[vals[1]].select = true
              stru.body[0]['@form'].data[ii].input.values = [startTime, endTime]
            } else {
              stru.body[0]['@form'].data[ii].input.value = data[key]
            }
          }
        }
        break;
    }
  })
  return stru
}

function formStruct(param={}) {
  let data = param.data
  let rtn = {
    title: {
      title: `配置`,
      itemClass: 'shelf-item-edit-title'
    },
    body: [
      {
        "@form": {
          data: [
            { input: {type: 'text', id: 'username', title: '名称：', placeholder: '输入名称' }},
            { input: {type: 'text', id: 'descript', title: '描述：', placeholder: '输入描述' }},
            { input: {type: 'number',id: 'telphone', title: '电话：', placeholder: '电话号码'}},
            {
              input: {
                title: '距离',
                id: 'distance',
                type: 'slider',
                value: 1,
                min: 0,
                max: 10,
                "show-value": true,
                desc: '配送公里数',
                itemStyle: 'width: 80%;',
                bindchange: 'onDistanceChange'
              }
            },
            { input: {type: 'button', id: 'location', title: '位置：', value: '锁定店铺位置', tap: 'shopLocation'}},
            // {
            //   input: {
            //     title: '时间段',
            //     id: 'period',
            //     type: 'slider2',
            //     value: 1,
            //     min: 0,
            //     max: 23,
            //     step: 1,
            //     width: 180,
            //     "block-size": 18,
            //     // 'block-color': 'orange',
            //     activeColor: 'rgb(243,242,247)',
            //     backgroundColor: 'rgb(243,242,247)',
            //     itemStyle: 'margin-top: 6px;',
            //     "show-value": true,
            //     // desc: '运营时间段',
            //     // itemStyle: 'width: 80%;',
            //     // bindchange: 'sliderChange'
            //   }
            // },
            {input: {
                id: 'period',
                type: 'picker',
                mode: 'time',
                title: '开店',
                values: [hours(), hours()],
                itemClass: 'mt-8-r',
                bindchange: 'onPeriodChange'
              },
            },
            { input: {type: 'password', id: 'password', title: '密码：', placeholder: '输入密码' }},
            { input: {type: 'password', id: 'password2', title: '密码2：', placeholder: '输入密码' }},
            { input: [ 
                addButton() 
              ], 
              itemClass: 'shelf-item-btns' 
            }
          ] 
        }
      }
    ],
    itemClass: 'shelfEditor'
  }

  if (data) {
    if (data.location) {
      this.location = data.location
    }
    return reStructor(param, rtn)
  }
  return rtn
}

function itemEditConfig(opts={}) {
  let that = this
  wx.showLoading()
  return new Promise((resolve, reject)=>{
    let uInfo = app.globalData.userInfo || {}
    dbkit.cloud('one/site/get').then(res=>{
      wx.hideLoading()
      if (res.result && res.result.data && res.result.data.length && uInfo.admin) {
        resolve(formStruct.call(that, {data: res.result.data[0]}))
      }
    })
  })
}

async function submitMedia(e, param, inst){
  try {
    let props = this.loadParam
    let val = inst.value()
    let myVal = {}
    for (let ky in val) {
      if (val[ky].value) {
        myVal[ky] = val[ky].value
      }
      // myVal[ky] = val[ky].value
    }

    if (this.location) {
      myVal.location = this.location
    } else {
      delete myVal.location
    }
    if (!this.__periodChange) {
      delete myVal.period
    }
    if (!this.__distanceChange) {
      delete myVal.distance
    }
    const res = await dbkit.cloud('one/site/set', myVal)
    if (res && res.result && res.result.code === '0010') {
      indexHook.emit('admin-user', {admin: true})
      indexHook.emit('shelf-site-info', {newInfo: myVal})
      backIndex()
    } else {
      Pager.alert('密码不正确')
    }
    this.__periodChange = false
    this.__distanceChange = false
  } catch (error) {
    console.warn(error);
  }
}

Pager({
  data: {
    modalEdit: Pager.item(formStruct()),
  },

  shopLocation(e, param, inst){
    const _res = indexHook.emit('getLocation', {})
    const res = _res[0]
    res.then(loc=>{
      this.location = {
        latitude: loc.latitude, // 纬度
        longitude: loc.longitude, // 经度
        speed: loc.speed, // 速度
        accuracy: loc.accuracy, // 位置的精确度
      }
      inst.addDesc('location', `当前店铺位置为：${loc.latitude}, ${loc.longitude}`)
    })
  },

  loadParam: {},

  onSubmitMedia(e, param, inst) {
    submitMedia.call(this, e, param, inst)
  },

  onPeriodChange(e, param, inst){
    this.__periodChange = true
    let value = e.detail.value
    param.inputData.value = value
    return param
  },

  onDistanceChange(e, param, inst){
    this.__distanceChange = true
    let value = e.detail.value
    param.inputData.value = value
    return param
  },

  onShow() {
    
  },

  onReady() {
    const modalEdit = Pager.getElementsById('modalEdit')
    const param = this.loadParam
    itemEditConfig.call(this, param).then(res => {
      modalEdit.update(res)
    })
  },

  sliderChange(e, param, inst) {
    
  },

  onLoad(param) {
    this.loadParam = param
  },

  onUnload() {
  },

  onHide() {
  }
})
