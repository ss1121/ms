const util = require('../util')
module.exports = function(CLS, event, opts) {
  const cloud = opts.cloud
  const db = opts.db
  const _ = db.command

  async function deleteImgs(item) {
    const data = item.data
    let deleteImgs = []
    data.forEach(element => {
      deleteImgs = deleteImgs.concat((element.img || [])).concat((element.imgs || []))
    });
    try {
      return await cloud.deleteFile({
        fileList: deleteImgs
      })
    } catch (error) {
      console.log('==== showcase delete file ==== ', error);
    }
  }

  class Showcase extends CLS {
    constructor(props, collection) {
      super(props, collection)
      this.field = {
        img: '',
        imgs: '',  // 图组
        poi: '',
        address: '',
        "property-*": '',
        title: '',   // 标题栏
        caption: '',  // 图下标题栏
        descript: '',  // 描述
        body: undefined,
        footer: undefined,
        dot: undefined,
        cat: undefined,
        idf: undefined,
        parent: undefined,
        date: undefined
      }
    }

    async remove(param){
      try {
        const props = param || this.body || this.props
        const {poi} = props
        const {title, id} = this.param
        if (poi) {
          const item = await this.get({poi})
          if (item) {
            const _id = item.data[0]._id
            await deleteImgs(item)
            return await super.remove({_id})
          }
        } else {
          return await super.remove(props)
        }
      } catch (error) {
        console.log(error);
      }
    }

    async add(){
      return super.add.apply(this, arguments)
    }

    async delete(){
      return this.remove.apply(this, arguments)
    }

    async find(param = {}) {
      let coll = this.collection
      return coll.where(param)
    }

    async catch() {
      let result = []
      let param = this.body.zone
      if (param) {
        result = await this.get({poi: _.in(param)})
      }
      return result
    }
  }

  const coll = opts.collection
  return new Showcase(event, coll)
}