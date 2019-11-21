const lib = require('../util')
module.exports = function(CLS, event, opts) {
  const {cloud, errorCode} = opts

  async function deleteImgs(item) {
    const data = item.data
    let delImgs = []
    data.forEach(element => {
      delImgs = delImgs.concat((element.img || [])).concat((element.imgs || []))
    });
    try {
      return await cloud.deleteFile({
        fileList: delImgs
      })
    } catch (error) {
      console.log('==== showcase delete file ==== ', error);
    }
  }

  class Cat extends CLS {
    constructor(props, collection) {
      super(props, collection)
      this.field = {
        'name': '',
        'title': '', // uniqid | openid
        'size': '',
        'content': '',
        'sequence': ''
      }
      this.union = [
        {
          select: 'showcase',
          key: 'delete-sons',
          cb: async function (coll, where) {
            const res = await coll.showcase.get(where)
            if (res && res.data.length) {
              await deleteImgs(res)
              await coll.showcase.remove(where)
            }
          }
        }
      ]
    }

    async remove(){
      const props = this.body
      const {name} = props
      await this.dispatch('delete-sons', { parent: name })
      await super.remove({name})
    }

    async update(){
      const bodys = this.body || {}
      const payload = bodys.payload
      if (lib.isArray(payload)) {
        payload.forEach(async item=>{
          item.where = {name: item.name}
          const res = await super.get(item.where)
          const resData = res.data
          if (resData.length) {
            await super.update(item)
          } else {
            delete item.where
            await super.add(item)
          }
        })
      } else {
        await super.update()
      }
    }

    async add(){
      let props = this.body || this.props
      try {
        if (props.data && lib.isArray(props.data)) {
          for(let ii=0; ii<props.data.length; ii++) {
            let item = props.data[ii] 
            if (lib.isObject(item)) {
              const res = await super.get({name: item.name})
              if (res && res.data && res.data.length) {
                /** 啥都不做 */
              } else {
                await super.add(item)
              }
            }
          }
          return errorCode['0000']
        } else {
          await super.add(props)
        }
        return errorCode['0001']
      } catch (error) {
        let errCode = errorCode['0002']
        errCode.err = error
        return errCode
      }
    }
  }

  const coll = opts.collection
  return new Cat(event, coll)
}