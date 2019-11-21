//index.js
//获取应用实例
const app = getApp()
const Pager = require('components/aotoo/core')
const lib = Pager.lib
const nav = lib.nav
const indexHook = lib.hooks('INDEX-HOOKS', true)

function tips(text, icon, dur) {
  wx.showToast({
    title: text || '成功',
    icon: icon || 'success',
    duration: dur || 2000
  })
}

const addButton = (name) => {
  const myname = name || lib.uuid('sf_cat_', 12)
  return {
    type: 'button',
    itemClass: 'btn-primary',
    inputClass: 'shelf-item-submit',
    tap: 'onSubmitMedia?name=' + myname,
    id: 'submitbtn',
    value: '保存'
  }
}

function editStruct(param, forlist){
  let name
  let formList = [
    { type: 'text', value: '',   id: 'title', title: '标题：', placeholder: '请输入标题' },
    // { type: 'text', value: '',   id: 'name', title: '名称：', placeholder: '请输入名称(英文)' },
    { type: 'number', value: '', id: 'size', title: '子集', placeholder: '允许多少个子元素'},
    // { type: 'text', value: '',   id: 'content', title: '抬头：', placeholder: '请输入抬头' },
  ]
  if (lib.isObject(param)) {
    name = param.name
    formList = formList.map(item=>{
      if (item.id == 'content') {
        // if (lib.isString(param.content) || lib.isObject(param.content) || lib.isNumber(param.content)) {
        //   param.content = [param.content]
        // }
        // if (lib.isArray(param.content)) {
        //   const cnts = []
        //   param.content.forEach(itm=>{
        //     if (typeof itm == 'number' || typeof itm == 'string') cnts.push(itm)
        //     if (lib.isObject(itm) && itm.title) cnts.push(itm.title)
        //   })
        //   item.value = cnts.join(',')
        // }
      } 
      else {
        if (param[item.id]) {
          item.value = param[item.id]
        }
      }
      return item
    })
    return formList
  } 

  // else {
  //   formList.unshift({
  //     type: 'text',
  //     value: '',
  //     id: 'name',
  //     title: '名称：',
  //     placeholder: '请输入名称(英文)'
  //   })
  // }

  if (forlist) {
    return formList
  }

  let rtn = {
    itemClass: 'shelf-cat-container',
    title: {title: '编辑分类', itemClass: 'shelf-item-edit-title'},
    body: [
      {
        "@form": {
          '$$id': 'cat-form',
          data: [
            { input: formList },
            { input: addButton(name) },
          ],
          listClass: 'shelf-cat-form'
        }
      }
    ]
  }
  return rtn
}


async function toCloudDb(index, target) {
  if (index > -1) {
    indexHook.emit('update-cat', target)
  } else {
    indexHook.emit('add-cat', target)
  }
  nav.navigateBack()
}

Pager({
  data: {
    modalEdit: Pager.item(editStruct())
  },

  onShow() {
    
  },

  onLoad(param){
    this._param = param
  },

  onReady() {
    let param = this._param
    const modalEdit = Pager.getElementsById('modalEdit')
    const shelfData = indexHook.getItem('shelfData')||[]
    const names = shelfData.map(item=>item.name)
    const sequences = shelfData.map(item => parseInt(item.sequence))
    const name = param.name
    const index = names.indexOf(name)
    const result = [shelfData[index]]

    const res = result[0]
    const listData = editStruct(res, true)
    modalEdit.update({
      'body[0].@form.data[0].input': listData,
      'body[0].@form.data[1].input': addButton(name)
    })

    // 注册钩子方法
    // 响应表单提交数据，并存储之
    // const needUpdate = ['title', 'name', 'size', 'content']
    indexHook.once('catedit', function(opts={}) {
      const {name} = opts
      const formInst = Pager.getElementsById('cat-form')
      if (formInst) {
        let vals = {}
        const _vals = formInst.value()
        for (let attr in _vals) {
          vals[attr] = _vals[attr].value
          if (attr == 'content') {
            vals[attr] = _vals.content.value && _vals.content.value.split(',')
          }
        }
        vals['name'] = name || lib.uuid('sf_cat_', 12)
        vals['content'] = ['nonedata']
        let target = Object.assign({}, result[0], vals)
        let idx = index > -1 ? index : shelfData.length

        // 保存数据
        let max = Math.max.apply(null, sequences);
        max = (max||max===0) ? max+1 : 0

        target.sequence = max
        shelfData[idx] = target
        indexHook.emit('saveItem', shelfData)
        toCloudDb(index, target, idx)
      }
    })
  },

  onSubmitMedia(e, param){
    const name = param.name
    if (name) {
      indexHook.emit('catedit', param)
    }
  },

  onUnload() {
    
  },

  onHide() {}
})
