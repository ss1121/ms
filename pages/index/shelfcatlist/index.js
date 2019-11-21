//index.js
//获取应用实例
const app = getApp()
const Pager = require('components/aotoo/core')
const lib = Pager.lib
const indexHook = lib.hooks('INDEX-HOOKS', true)

function makeCatList(param=[]) {
  const targetData = []
  param.forEach((item, ii)=>{
    targetData.push(
      { 
        // title: [ item.name, item.title+'>' ],
        title: [`${item.title}(${item.size})`, '>'],
        aim: `editcat?name=${item.name}`,
        li: [{
          title: '删除',
          itemStyle: 'background-color: red; color: #fff',
          aim: `action?name=${item.name}&delete=${ii}`
        }],
      }
    )
  })
  return {
    $$id: 'slipxxx',
    data: targetData,
    option: ['aw', 10, '60:57', '.shelf-cat-list-item'],
    listClass: 'shelf-cat-list',
    itemClass: 'shelf-cat-list-item',
  }
}

function myShelfData() {
  const mydata = indexHook.getItem('shelfData')||[]
  return makeCatList(mydata)
}

function editStruct(){
  let rtn = {
    itemClass: 'shelf-cat-container',
    title: {title: '编辑分类', itemClass: 'shelf-item-edit-title'},
    body: [ 
      { '@slip': myShelfData() } 
    ],
    dot: [
      {
        title: ' ',
        itemClass: 'icono-plusCircle shelf-cat-add',
        aim: 'addcat'
      }
    ]
  }
  return rtn
}

Pager({
  data: {
    // modalEdit: Pager.item(editStruct())
    modalEdit: Pager.item(editStruct())
  },

  action: function (e, param={}) {
    if (param.delete) {
      const index = parseInt(param.delete)
      const name = param.name
      this.deletecat(index, name)
    }
  },

  deletecat(index, name){
    let shelfCatData = indexHook.getItem('shelfData')
    if (shelfCatData.length > 1) {
      let idx = -1
      for(let ii=0; ii<shelfCatData.length; ii++) {
        let item = shelfCatData[ii]
        if (item.name === name) {
          idx = ii
          break;
        }
      }
      if (idx > -1) {
        let oriItem = shelfCatData[idx]
        shelfCatData.splice(idx, 1)
        this.savecat(shelfCatData)
        indexHook.emit('delete-cat', {name: oriItem.name})
      }
    } else {
      Pager.alert('最后一个不能删除')
    }
  },

  editcat(e, param={}) {
    const myurl = lib.formatToUrl('../shelfcatedit/index', param)
    wx.navigateTo({
      url: myurl
    })
  },

  addcat(e, param={}){
    const myurl = lib.formatToUrl('../shelfcatedit/index', param)
    wx.navigateTo({ url: myurl })
  },

  savecat(shelfCatData) {
    indexHook.emit('saveItem', shelfCatData)
    indexHook.emit('refresh-cat-list')
  },

  onLoad(param) {

  },

  onHide() {

  },

  onShow() {
    this.upTimmer = setTimeout(() => {
      indexHook.emit('refresh-cat-list')
    }, 300);
  },

  onReady() {
    const that = this
    const slipxxx = this.getElementsById('slipxxx')
    
    indexHook.once('refresh-cat-list', function () {
      const modalEdit = that.getElementsById('modalEdit')
      modalEdit.update({
        "body[0].@slip": myShelfData()
      })
    })

    slipxxx.hooks.once('touchend', function(e) {
      let sfCatData = indexHook.getItem('shelfData')
      let $shelfCatData = lib.clone(sfCatData)

      let currentTarget = e.currentTarget
      let dataset = currentTarget.dataset
      let slipDone = dataset.slipDone
      if (slipDone) {
        let {index, offset} = slipDone
        index = parseInt(index)
        offset = parseInt(offset)
        let offPos = offset - index
        if (offPos) {
          if (offPos > 0) {
            $shelfCatData.splice((offset+1), 0, sfCatData[index])
            $shelfCatData.splice(index, 1)
          } else {
            if (offPos < 0) {
              $shelfCatData.splice((index + offPos), 0, sfCatData[index])
              $shelfCatData.splice((index+1), 1)
            }
          }
          $shelfCatData.__sequence = true
          $shelfCatData.__catchage = true
          indexHook.emit('saveItem', $shelfCatData)
          // that.onLoad()
        }
      }
    })
  },

  onUnload() {
    clearTimeout(this.upTimmer)
    indexHook.emit('cat-change', {from: 'catedit'})
  }
})
