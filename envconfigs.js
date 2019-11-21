
const path = require('path')
const asset = {"name":"ms","ROOT":"/lgh/xcx","version":"1.1.1","TYPE":"mp","startup":true,"isDev":true,"SRC":"/lgh/xcx/src/ms","DIST":"/lgh/xcx/src/ms/dist/1.1.1/dev","HOST":"localhost","PORT":8300,"PROXYPORT":8317,"options":{"cloud":true,"appid":"wx6dfd3ea360d61f4d"},"argv":{"_":["dev","ms"],"name":["ms"]},"isXcx":true} 
const scene = 'default'
module.exports = function (opts) {
  let targetConfig = require('../configs/default')(asset)
  if (scene && scene != 'default') {
    const sceneConfig = require('../configs/default')(asset)
    targetConfig = Object.assign({}, targetConfig, sceneConfig)
  }
  targetConfig.env = asset
  if (typeof wx == 'undefined') {
    global.Configs = global.CONFIG = targetConfig
  } else {
    wx.CONFIG = targetConfig
  }
  let oldRoot = asset.ROOT
  let oldSrc = asset.SRC
  let oldSSrc = path.join(oldSrc, 'server')
  let oldDist = asset.DIST
  let oldContentPath = asset.contentBase
  let nRoot = ''
  let nSrc = ''
  let nDist = ''
  let nContentPath = '';

  const runself = (() => {
    let tmpsrc = oldSrc.replace(oldRoot, '')
    let tmpssrc = oldSSrc.replace(oldRoot, '')
    let tmpdist = oldDist.replace(oldRoot, '')
    tmpsrc = path.join('/', tmpsrc)
    tmpssrc = path.join('/', tmpssrc)
    tmpdist = path.join('/', tmpdist)
    let tmpAry = tmpssrc.split('/')
    tmpAry.forEach((item, ii) => {
      if (ii > 0) {
        if (!nRoot) {
          nRoot = __dirname
        }
        nRoot = path.join(nRoot, '../')
      }
    })
    nSrc = path.join(nRoot, tmpsrc)
    nDist = path.join(nRoot, tmpdist)
    nContentPath = nDist
  })()
  asset.ROOT = nRoot
  asset.SRC = nSrc
  asset.DIST = nDist
  asset.options.scenes = targetConfig
  asset.options.scenes.isXcx = true
  const mapper = {}
  asset.options.scenes.mapper = mapper
  if (typeof wx == 'undefined') {
    global.CONFIG.ROOT = nRoot
    global.Configs.mapper = global.CONFIG.mapper = mapper
  } else {
    wx.CONFIG.ROOT = nRoot
  }
  return asset
}
