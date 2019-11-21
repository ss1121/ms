const lib = require('../util')
let md5 = lib.md5

module.exports = function(CLS, event, opts) {
  const {cloud, errorCode, errCode} = opts
  class Site extends CLS {
    constructor(props, collection) {
      super(props, collection)
      this.field = {
        'shopid': '',
        'openid': '', // uniqid | openid
        'unionid': '',
        'username': '',
        'descript': '', 
        'vcode': '',
        'password': '',
        'telphone': '',
        'version': '',
        'distance': '',  // 送货距离
        'period': '', // 开店时间段
        'location': '',  // 店铺坐标位置
        'property-*': ''
      }
      this.union = [{
        select: 'user',
        key: 'update-user-admin',
        cb: async function (coll, where) {
          const res = await coll.user.get(where)
          if (res && res.data.length) {
            let result = res.data[0]
            if (!result.admin) {
              result.admin = true
              return await coll.user.update(result)
            }
          }
        }
      }]
    }
    
    async upVersion(){
      let _siteInfo = await this.get()
      if (_siteInfo.data && _siteInfo.data.length) {
        let siteInfo = _siteInfo.data[0]
        let hashCode = md5(Date.parse(new Date()))
        let target = Object.assign({}, siteInfo, {version: hashCode})
        return await this.update(target)
      }
    }

    async set(){
      let body = this.body
      if (body) {
        body.password = md5(body.password)
        body.password2 = md5(body.password2)
        let dbData = await this.get({}, true)
        let hasIt = dbData.data[0] 
        let uid = (hasIt && (hasIt.uid || hasIt.openid) ) || this.uid
        if (hasIt) {
          let passwd = hasIt.password
          let vcode = hasIt.vcode
          if (passwd && body.password) {
            if (passwd === body.password) {

              // 更新密码
              if (body.password2 && passwd !== body.password2) {
                hasIt = Object.assign({}, hasIt, body)
                hasIt.password = body.password2
              } else {
                hasIt = Object.assign({}, hasIt, body)
              }

              await this.update(hasIt)

              // 更新该用户为编辑用户
              await this.dispatch('update-user-admin', { uid })

              // 登录成功
              return errCode('0010')
            } else {
              return errCode('0012')
            }
          } else {
            if (!body.password) {
              return errCode('0011')
            } else {
              // 已有数据不包含password
              await this.delete(hasIt)
              await this.add()
              return errCode('0010')
            }
          }
        } else {
          // 初始化
          if (!body.password) {
            return errCode('0011')
          } else {
            await this.add(body)
            await this.dispatch('update-user-admin', { uid })
            return errCode('0013')
          }
        }
      }
    }

    async get(param, inner){
      let res = await super.get(param)
      let data = res.data
      if (data.length === 1) {
        let info = data[0]
        if (!inner )delete info.password
        return errCode('0015', [info])
      } else {
        return errCode('0016', [])
      }
    }
  }

  const coll = opts.collection
  return new Site(event, coll)
}