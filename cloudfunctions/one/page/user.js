module.exports = function(CLS, event, opts) {
  class User extends CLS {
    constructor(props, collection) {
      super(props, collection)
      this.field = {
        'uid': '',
        'openid': '', // uniqid | openid
        'unionid': '',
        'parent': '',
        'admin': false,
        'username': '',
        'nickName': '',
        'gender': 1,
        'avatarUrl': '',
        'province': '',
        'city': '',
        'country': '',
        'birthday': '',
        'idcard': '',
        'mobile': '',
        'language': 'zh_CN'
      }
    }

    async selfInfo() {
      const uid = this.uid
      return await this.get({uid})
    }

    async add(){
      const uid = this.uid
      const openid = this.openid
      const unionid = this.unionid
      try {
        const hasIt = await this.collection.where({uid}).get()
        if (hasIt.data.length) {
          return hasIt.data
        } else {
          // // Object.keys(this.field).forEach(key => props[key] ? nparam[key] = props[key] : '')
          // nparam = this.normalFiled(props, nparam)
          // return await this.collection.add({data: nparam})

          return await super.add()
        }
      } catch (error) {
        console.warn('======= router add ========= ', error);
      }
    }
  }

  const coll = opts.collection
  return new User(event, coll)
}