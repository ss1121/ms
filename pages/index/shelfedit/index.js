//index.js
//获取应用实例
const app = getApp()
const Pager = require('components/aotoo/core')
const lib = Pager.lib
const nav = lib.nav
const indexHook = lib.hooks('INDEX-HOOKS', true)
const dbkit = Pager.kit

const quantifier = [ //量词
  '个', '件', '包', '块', '袋', '瓶', '盒', '支', '箱', '条', '套', '份', '串', '米', '本', '张', '节'
]

function mkQuantifier() {
  return quantifier.map((item, ii)=>{
    return {
      title: item,
      id: 100+ii
    }
  })
}

function tips(text, icon, dur) {
  wx.showToast({
    title: text || '成功',
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

const addButton = (poi) => {
  return {
    type: 'button',
    itemClass: 'btn-primary',
    inputClass: 'shelf-item-submit',
    tap: 'onSubmitMedia?poi=' + poi || '',
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

const backIndex = (param={}) => {
  const {poi, payload} = param
  setTimeout(() => {
    nav.navigateBack()
    app.hooks.emit(poi, payload)
  }, 500);
}

function freshStructor(param, stru) {
  const poi = param.poi
  const data = param.data
  const uploader = Pager.getElementsById('myUpload')
  Object.keys(data).forEach(key=>{
    switch (key) {
      case 'img':
        uploader.setExist([
          { img: data[key] }
        ])
        break;
      case 'caption':
        stru.body[1]['@form'].data[0].input.value = data[key]
        break;
      default:
        if (key.indexOf('property-') > -1) {
          const ipts = stru.body[1]['@form'].data
          for (let ii = 0; ii < ipts.length; ii++) {
            let inp = ipts[ii].input
            if (inp && inp.id && inp.id == key) {
              stru.body[1]['@form'].data[ii].input.value = data[key]
            }
          }
        }
        break;
    }
  })
  let myFormData = stru.body[1]['@form'].data
  let btns = myFormData[myFormData.length-1] 
  let len = btns.input.length
  btns.input[len] = delButton(poi)
  return stru
}

const editStruct = (param={}) => {
  const poi = param.poi||''
  const data = param.data
  const name = param.name
  const cat = param.cat
  let position = poi
  if (name && cat) {
    position = position.replace(name, cat)
  }
  let rtn = {
    title: {
      title: `编辑《${position}》`,
      itemClass: 'shelf-item-edit-title'
    },
    body: [
      {
        "@component": {
          is: 'uploads',
          $$id: 'myUpload',
          server: 'cloud',
          limit: 1,
          count: 1,
          picker: 1,
          thumbnail: true  // 默认打开压缩
        }
      },
      {
        "@form": {
          data: [
            { input: { type: 'text', id: 'caption', maxlength: 60, title: '标题：', placeholder: '请输入标题' } },
            { input: {type: 'text', id: 'property-price', title: '价格：', placeholder: '价格' } },
            // { input: { id: 'property-piece', type: 'picker', title: '单位', values: [ mkQuantifier() ], itemClass: 'mt-8-r' } },
            // {
            //   input: {
            //     id: 'test_switch4',
            //     type: 'switch',
            //     title: '开启压缩',
            //     value: true,
            //     bindchange: 'switchAction'
            //   },
            // },
            { input: [
              addButton(poi)
              /** 修改， 删除 */
            ], itemClass: 'shelf-item-btns'},
          ]
        }
      }
    ],
    itemClass: 'shelfEditor'
  }

  if (data) {
    return freshStructor(param, rtn)
  }
  return rtn
}

const itemEditConfig = (opts={}) => {
  const {poi, name, cat} = opts
  wx.showLoading()
  return new Promise((resolve, reject)=>{
    dbkit.cloud('one/showcase/get?poi='+poi, {poi}).then(res=>{
      wx.hideLoading()
      if (res.result && res.result.data && res.result.data.length) {
        resolve(editStruct({poi, data: res.result.data[0], name, cat}))
      } else {
        resolve(editStruct({poi, name, cat}))
      }
    })
  })
}

async function submitMedia(e, param, inst){
  let uploader = this.getElementsById('myUpload')
  let props = this['shelf-onload-param']
  let poi = param && param.poi
  let act = param && param.act  // delete
  let {name, cat} = props

  let val = inst.value()
  let myVal = {}
  for (let ky in val) {
    let v = val[ky].value
    if (ky === 'property-piece') {
      let titles = val[ky].titles
      let index = v[0]
      v = titles[0][index]
    }
    myVal[ky] = v
  }

  await uploader.upload()
  let _res = uploader.value()
  if (!_res) {
    Pager.alert('请指定上传图片')
    return 
  }
  let res = _res[0]
  if (res.img && res.img.src) {
    res = {img: res.img.src}
  }
  
  try {
    if (poi) {
      if (act && act == 'delete') {
        await dbkit.cloud('one/showcase/delete', {poi})
        tips('删除成功')
        backIndex({poi, payload: null})
      } else {
        let submitData = Object.assign({}, {poi, ...myVal}, res)
        let r = await dbkit.cloud(`one/showcase/get?poi=${poi}`, {poi})
        if (r && r.result) {
          if (r.result.data.length) {
            let theData = r.result.data[0]
            submitData = Object.assign({}, theData, submitData)
            await dbkit.cloud('one/showcase/update', submitData)
            tips('更新成功')
            backIndex({ poi, payload: submitData })
          } else {
            submitData = Object.assign(submitData, {parent: name})
            await dbkit.cloud('one/showcase/add', submitData)
            tips('添加成功')
            backIndex({ poi, payload: submitData })
          }
        }
      }
    }
  } catch (error) {
    console.warn(error);
  }
}

Pager({
  data: {
    modalEdit: Pager.item(editStruct()),
    canvasWidth: 0,
    canvasHeight: 0
  },

  async appendMedia(e, param, inst){
    const res = await pickerImgs(this)
    const resp = await Pager.upload({
      url: 'cloud',
      filePath: res.tempFiles
    })
    if (resp[0].statusCode == 200) {
      indexHook.append('shelf-item-new-pic', {img: resp[0].fileID})
      inst.update({
        img: {
          src: resp[0].fileID,
          itemStyle: 'width: 120px;height:120px'
        }
      })
    }
  },

  onSubmitMedia(e, param, inst) {
    submitMedia.call(this, e, param, inst)
  },

  onShow() {
    
  },

  onReady() {
    const modalEdit = Pager.getElementsById('modalEdit')
    const param = this['shelf-onload-param']
    itemEditConfig(param).then(res => {
      modalEdit.update(res)
    })
  },

  onLoad(param) {
    if (param) {
      this['shelf-onload-param'] = param
    }
  },

  onUnload() {
  },

  onHide() {
  }
})
