/**
 * 作者： 天天修改
 * github: webkixi
 * 小程序的模板真是又长又臭
 */
const app = getApp()
const Core = require('../aotoo/core')
const lib = Core.lib

function cls(param) {
  return (param && (param.itemClass || param.class)) || ''
}

function sty(param) {
  return (param && (param.itemStyle || param.style)) || ''
}

function content(param={}, myclass, op) {
  let $item = this.data.$item
  let dot = (param.dot ? [].concat(param.dot).concat($item.dot) : $item.dot) || []
  let yesCloseBtn = false

  if (myclass == 'full' || op&&op.indexOf('actionSide-pop') > -1) {
    yesCloseBtn = true
  }

  if (param && param.hasOwnProperty('closeBtn')) {
    yesCloseBtn = param.closeBtn
  }

  let hasDot = false
  let closeBtnIndex = []
  dot.forEach((item, ii) => {
    let cls = item.itemClass || item.class
    if (cls.indexOf('crossCircle') > -1) {
      hasDot = true
      closeBtnIndex.push(ii)
    }
  })

  if (hasDot) {
    if (closeBtnIndex.length) {
      closeBtnIndex.forEach(index=>{
        dot.splice(index, 1)
      })
    }
  } 

  if (yesCloseBtn) {
    dot.push({ class: 'icono-crossCircle closeIt', aim: 'hide' })
  }

  param.dot = dot
  param.__yesCloseBtn = yesCloseBtn

  return param
}

function paramCb(param, cb) {
  if (lib.isFunction(param)) {
    cb = param
    param = null
  }
  return {param, cb}
}

// 基于item的组件
Component({
  options: {
    multipleSlots: true, // 在组件定义时的选项中启用多slot支持
    addGlobalClass: true
  },
  behaviors: [Core.itemComponentBehavior(app, '_actionSide')],
  pageLifetimes: {
    show: function () {
      this.toast.countdown = (p) => this.toast_countdown = lib.isNumber(p) ? p :3000
      this.toast.mid = (p={}, c) => {
        p.itemClass = 'toast-mid'
        this.__opration(p, c, 'actionSide-toast')
      }
      this.toast_mid = (p={}, c) => {
        p.itemClass = 'toast-mid'
        this.__opration(p, c, 'actionSide-toast')
      }
      this.pop.bot = (p={}, c) => this.__opration(p, c, 'actionSide-pop-bottom')
      this.pop_bot = (p={}, c) => this.__opration(p, c, 'actionSide-pop-bottom')
      this.pop.top = (p={}, c) => this.__opration(p, c, 'actionSide-pop-top')
      this.pop_top = (p={}, c) => this.__opration(p, c, 'actionSide-pop-top')

      this.right.full = (p={}, c) => {
        p.itemClass = 'full'
        this.__opration(p, c, 'actionSide-right')
      }
      this.right_full = (p={}, c) => {
        p.itemClass = 'full'
        this.__opration(p, c, 'actionSide-right')
      }
      this.right.bar = (p={}, c) => {
        p.itemClass = 'bar'
        this.__opration(p, c, 'actionSide-right')
      }
      this.right_bar = (p={}, c) => {
        p.itemClass = 'bar'
        this.__opration(p, c, 'actionSide-right')
      }

      this.left.full = (p={}, c) => {
        p.itemClass = 'full'
        this.__opration(p, c, 'actionSide-left')
      }
      this.left_full = (p={}, c) => {
        p.itemClass = 'full'
        this.__opration(p, c, 'actionSide-left')
      }
      this.left.bar = (p={}, c) => {
        p.itemClass = 'bar'
        this.__opration(p, c, 'actionSide-left')
      }
      this.left_bar = (p={}, c) => {
        p.itemClass = 'bar'
        this.__opration(p, c, 'actionSide-left')
      }

      this.top.full = (p={}, c) => {
        p.itemClass = 'full'
        this.__opration(p, c, 'actionSide-top')
      }
      this.top_full = (p={}, c) => {
        p.itemClass = 'full'
        this.__opration(p, c, 'actionSide-top')
      }
      this.top.bar = (p={}, c) => {
        p.itemClass = 'bar'
        this.__opration(p, c, 'actionSide-top')
      }
      this.top_bar = (p={}, c) => {
        p.itemClass = 'bar'
        this.__opration(p, c, 'actionSide-top')
      }
      
      this.bot.full = (p={}, c) => {
        p.itemClass = 'full'
        this.__opration(p, c, 'actionSide-bot')
      }

      this.bot_full = (p={}, c) => {
        p.itemClass = 'full'
        this.__opration(p, c, 'actionSide-bot')
      }

      this.bot.bar = (p={}, c) => {
        p.itemClass = 'bar'
        this.__opration(p, c, 'actionSide-bot')
      }

      this.bot_bar = (p={}, c) => {
        p.itemClass = 'bar'
        this.__opration(p, c, 'actionSide-bot')
      }
    },
    hide: function () {
      // 页面被隐藏
    },
    resize: function (size) {
      // 页面尺寸变化
    }
  },
  lifetimes: {
    created: function (params) {
      this.toast_countdown = 3000
    },
    
    attached: function() { //节点树完成，可以用setData渲染节点，但无法操作节点
      let properties = this.properties
      let item       = properties.item
      item.show = false
      if (lib.isObject(item)) {
        item.itemClass = 'actionSide'
        item.__actionMask = 'actionMask'
        if (item.dot) {
          item.dot = [].concat(item.dot).concat({itemClass: 'icono-crossCircle closeIt', aim: 'hide'})
        } else {
          item.dot = [{itemClass: 'icono-crossCircle closeIt', aim: 'hide'}]
        }
        this.setData({ $item: lib.resetItem(item) })
      }
    },
  },
  methods: {
    show: function (p, c) {
      const {param, cb} = paramCb(p, c)
      const myContent = content.call(this, param) || {}
      this.update({
        ...myContent,
        show: true,
        'itemClass': 'actionSide-right moveit',
      }, cb)
    },
    hide: function (cb) {
      // const itemClass = this.data.$item.itemClass
      // const fromLeft = itemClass.indexOf('actionSide-left') > -1
      // const itCls = fromRight ? 'actionSide-right' : fromLeft ? 'actionSide-left' : fromBot ? 'actionSide-bot' : fromTop ? 'actionSide-top' : 'actionSide'
      const itCls = 'actionSide'
      this.hooks.emit('hide')
      this.update({
        show: false,
        class: itCls,
        itemClass: itCls,
        __actionMask: 'actionMask'
      }, cb)
    },
    __opration: function(p, c, op) {
      const that = this
      let {param, cb} = paramCb(p, c)
      try {
        if (lib.isString(param)) param = {itemClass: param}
        let myclass = cls(param)
        let myStyle = sty(param)
        let myContent = content.call(this, param, myclass, op) || {}
        
        let target = {
          itemClass: `${op} ${myclass} moveit`,
          // itemStyle: myStyle || this.__cssStyle,
          itemStyle: myStyle,
          mask: param.enableMask ? 'actionMask show' : op.indexOf('toast') > -1 ? 'actionMask' : myContent.__yesCloseBtn ? 'actionMask' : 'actionMask show'
        }
        
        const upContent = Object.assign({}, myContent, {
          show: true,
          class: target.itemClass,
          itemClass: target.itemClass,
          itemStyle: target.itemStyle,
          __actionMask: target.mask
        })
        
        this.update(upContent, function () {
          if (lib.isFunction(cb)) cb()
          if (op.indexOf('toast') > -1) {
            setTimeout(() => that.hide(), that.toast_countdown);
          }
        })
      } catch (error) {
        console.error(error);
      }
    },
    pop: function(p, c) {
      this.__opration(p, c, 'actionSide-pop')
    },
    toast: function(p, c) {
      this.__opration(p, c, 'actionSide-toast')
    },
    right: function (p, c) {
      this.__opration(p, c, 'actionSide-right')
      // const {param, cb} = paramCb(p, c)
      // let myclass = lib.isString(param) ? param : cls(param)
      // let myStyle = sty(param)
      // let myContent = content.call(this, param, myclass) || {}
      // this.update({
      //   ...myContent,
      //   itemClass: `actionSide-right ${myclass} moveit`,
      //   itemStyle: myStyle,
      //   __actionMask: myclass ? 'actionMask show' : 'actionMask',
      // }, cb)
    },
    left: function (p, c) {
      this.__opration(p, c, 'actionSide-left')
    },
    bot: function (p, c) {
      this.__opration(p, c, 'actionSide-bot')
    },
    top: function (p, c) {
      this.__opration(p, c, 'actionSide-top')
    },
  }
})