const util = require('./util')
const cloud = require('wx-server-sdk');
const fs = require('fs')
const path = require('path')
cloud.init();
const db = cloud.database({ env: 'one-6qefl' })
const md5 = util.md5

function routerProfile(event, context) {
  // 获取 WX Context (微信调用上下文)，包括 OPENID、APPID、及 UNIONID（需满足 UNIONID 获取条件）
  const wxContext = cloud.getWXContext()
  const openid = context.openid || wxContext.OPENID
  const unionid = context.unionid || wxContext.UNIONID
  const uid = unionid || openid
  const props = { openid, unionid, uid }
  let   routerParam = {}

  if (event && event.$url) {
      let {url, query} = util.formatQuery(event.$url)
      let param = url.split('/')
      event.__body = util.clone(event)||{}
      delete event.__body.$url
      delete event.__body.userInfo
      event.url = param[0]
      routerParam.param = param.slice(1)
      routerParam.query = query
  }

  delete event['$url']
  return Object.assign({}, event, {
    param: routerParam.param,
    query: routerParam.query,
    eventIds: props
  })
}

const errorCode = {
  "0000": {code: '0000', msg: 'ok'},
  "0001": {code: '0001', msg: '没有匹配到数据'},
  "0002": {code: '0002', msg: '云函数错误'},

  // site表
  "0010": {code: '0010', msg: '成功更新信息'},
  "0011": {code: '0011', msg: '请输入密码'},
  "0012": {code: '0012', msg: '密码不正确'},
  "0013": {code: '0013', msg: '初始化配置数据'},
  "0015": {code: '0015', msg: '配置信息'},
  "0016": {code: '0016', msg: '没有配置信息'},
}

function errCode(id, param) {
  if (id) {
    let justIt = errorCode[id]
    if (justIt) {
      if (typeof param == 'object') {
        justIt.data = param
      }
      return justIt
    }
  }
}

class Router {
  constructor(props={}, collection){
    this.field = props.field || {}
    this._id = util.suid('BASE_')
    this.hooks = util.hooks(this._id)
    const {param} = props
    const [cat, title, id] = param
    this.pagination = {
      total: 500,
      pageSize: 100,
      current: 0
    }

    this.props = props
    // this.param = props.param
    this.param = { cat, title, id }
    this.props.param = this.param
    this.body = props.__body
    this.query = props.query
    this.url = props.url
    if (props.pagination && util.isObject(props.pagination)) {
      this.pagination = Object.assign({}, this.pagination, props.pagination)
    }

    const {openid, unionid, uid} = props.eventIds
    this.openid = openid
    this.unionid = unionid
    this.uid = uid

    this.collection = collection
    this.union = []
    this.init()
  }

  async init(){
    this.pagination.total = await this.count()
    this.siteCollection = await db.collection('site')
    if (util.isArray(this.union)) {
      this.union = this.union.filter(u => u.select && util.isString(u.key) && util.isFunction(u.cb))
    }
  }

  async dispatch(key, param) {
    const uItems = this.union.filter( o=> o.key===key )
    try {
      if (uItems.length) {
        const uItem = uItems[0]
        const {select, cb} = uItem
        const evt = {
          eventIds: {
            openid: this.openid,
            unionid: this.unionid,
            uid: this.uid,
          },
          url: select,
          param: [],
          query: {},
        }

        let $colle={}
        if (util.isString(select)) {
          const _colle = await collectionInst(select, evt)
          $colle = {[select]: _colle}
        }

        if (util.isArray(select)) {
          select.forEach(async c=>{
            if (util.isString(c)) {
              $colle[c] = await collectionInst(c, evt)
            }
          })
        }
        // if (util.isString(select)) {
        //   const _colle = await db.collection(select)
        //   $colle = {[select]: _colle}
        // }

        // if (util.isArray(select)) {
        //   select.forEach(async c=>{
        //     if (util.isString(c)) {
        //       $colle[c] = await db.collection(c)
        //     }
        //   })
        // }

        return await cb($colle, param)
      }
    } catch (error) {
      console.warn('请检查是否有新建相关数据表');
      console.error(error);
    }
  }

  normalFiled(props, nparam={}){
    const defaultField = ['_id', 'openid', 'uid', 'unionid', 'where']
    props = props || this.body || this.props || {}
    let field = this.field
    let myfield = []
    if (util.isObject(field)) {
      myfield = Object.keys(field)
    }

    if (util.isArray(field)) {
      myfield = field
    }

    defaultField.forEach(fld=>{
      if (myfield.indexOf(fld) === -1) {
        myfield.push(fld)
      }
    })

    myfield.forEach(key => {
      if (key.indexOf('-*')>-1) {
        let prefix = key.split('-')[0]
        let propsKeys = Object.keys(props)
        propsKeys.forEach(ky=>{
          if (ky.indexOf(prefix)>-1) {
            props[ky] ? nparam[ky] = props[ky] : ''
          }
        })
      } else {
        props[key] ? nparam[key] = props[key] : ''
      }
    })
    return nparam
  }

  async setVersion(){
    return {}
    // 数据库的写操作，一次只能写一个表，多次或者高频操作需要另外的云函数或者在客户端完成
    // let _siteInfo = await this.siteCollection.get()
    // if (_siteInfo.data && _siteInfo.data.length) {
    //   let siteInfo = _siteInfo.data[0]
    //   let hashCode = md5(Date.parse(new Date()))
    //   await this.siteCollection.doc(siteInfo._id).update({data: {
    //     version: hashCode
    //   }})
    // }
  }

  async add(param){
    try {
      const uid = this.uid
      const openid = this.openid
      const unionid = this.unionid
      let nparam = {openid, unionid, uid}
      param = param || this.body

      nparam = this.normalFiled(param, nparam)
      nparam.createtime = new Date().getTime()  //创建时间
      const res = await this.collection.add({data: nparam})
      await this.setVersion()
      return res
    } catch (error) {
      console.warn('======= router add ========= ', error);
    }
  }

  async get(param) {
    let pagination = this.pagination

    param = param || this.body 
    const query = this.query
    if (!util.isEmpty(query)) {
      param = query
    }
    try {
      if (!param || util.isEmpty(param)) {
        return await this.collection.get()
      }
      if (param['_id']) {
        return await this.collection.doc(param['_id']).get()
      }

      let np = {
        total: pagination.total,
        pageSize: pagination.pageSize,
        current: pagination.current
      }
      if (param.pagination) {
        pagination = Object.assign({}, pagination, param.pagination)
        this.pagination = np = pagination
        delete param.pagination
        // Object.keys(pagination).forEach(kn => delete param[kn])
      }

      let skip = 0
      if (np.current === 0) {
        return await this.collection.where(param).get()
      } else {
        skip = np.current * np.pageSize
        return await this.collection.where(param)
        .skip(skip)
        .limit(np.pageSize)
        .get()
      }
    } catch (error) {
      console.warn('==== router get ==== ', error);
    }
  }

  async count() {
    try {
      return await this.collection.count()
    } catch (error) {
      console.warn('======= router count ========= ', error);
    }
  }

  async remove(param) {
    param = param || this.body
    try {
      let res
      if (param._id) {
        res = await this.collection.doc(param._id).remove()
      }
      res = await this.collection.where(param).remove()
      await this.setVersion()
      return res
    } catch (error) {
      console.warn('======= router remove ========= ', error);
    }
  }

  async delete(){
    return await this.remove.apply(this, arguments)
  }
  
  async update(param){
    param = param || this.body
    let query = this.query
    let nparam = {}
    if (!util.isEmpty(query)) {
      param.where = query
    }
    nparam = this.normalFiled(param, nparam)
    nparam.updatetime = new Date().getTime()  // 更新时间
    try {
      let res
      if (param._id) {
        delete nparam['_id']
        delete nparam['where']
        res = await this.collection.doc(param._id).update({data: nparam})
      } else {
        if (param.where && util.isObject(param.where)) {
          const find = param.where
          delete param.where
          delete nparam.where
          res = this.collection.where(find).update({data: nparam})
        } else {
          throw new Error('更新需要指定where字段')
        }
      }

      if (res) {
        await this.setVersion()
      }
      return res
    } catch (error) {
      console.warn('======= router update ========= ', error);
    }
  }

  getOpenid(){
    const {openid, uid} = this
    return errCode('0000', {openid, unionid})
  }

  async server(){
    try {
      // const {url, param, query} = this.props
      // const [cat, title, id] = param
      // this.param = { cat, title, id }
      const {cat, title, id} = this.param
      if (cat && this[cat]) {
        return await this[cat]()
      } else {
        throw new Error('操作方法不存在')
      }
    } catch (error) {
      console.warn('======= router server ========= ', error);
    }
  }
}

async function collectionInst(url, event) {
  const collection = await db.collection(url)
  const MYPATH = `./page/${url}`
  const pageItem = require(MYPATH)
  if (util.isFunction(pageItem)) {
    const inst = require(MYPATH)(Router, event, {
      db,
      cloud,
      collection,
      errorCode,
      errCode
    })
    return inst
  }
}

async function router(params={}, context={}) {
  const event = routerProfile(params, context)
  const {url, param, query} = event
  try {
    const route = await collectionInst(url, event)
    return await route.server()
  } catch (error) {
    console.warn(`请在云数据库中建立${url}的集合`);
    console.log(error);
  }
}

module.exports = router