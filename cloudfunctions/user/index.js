// 云函数模板
// 部署：在 cloud-functions/login 文件夹右击选择 “上传并部署”
const util = require('../util')
const {cloud, oneDb} = require('../db/index')
const $user = require('../db/kits/user.js')()

/**
 * 这个示例将经自动鉴权过的小程序用户 openid 返回给小程序端
 * 
 * event 参数包含小程序端调用传入的 data
 * 
 */
exports.main = async (event, context) => {
  // console.log(event)
  // console.log(context)

  // 获取 WX Context (微信调用上下文)，包括 OPENID、APPID、及 UNIONID（需满足 UNIONID 获取条件）
  const wxContext = cloud.getWXContext()

  const openid = context.openid || wxContext.OPENID
  const unionid = context.unionid || wxContext.UNIONID
  const uid =  unionid||openid
  event = Object.assign({}, event, {openid, unionid, uid})

  const $type = event['__type']
  if ($type == 'add') {
    return await $user.add(event)
  }
}
