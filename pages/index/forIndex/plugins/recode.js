const Pager = require('components/aotoo/core')
const lib = Pager.lib
const indexHook = lib.hooks('INDEX-HOOKS', true)
const plugin = requirePlugin("WechatSI")

export const manager = plugin.getRecordRecognitionManager()

manager.onRecognize = function (res) {
  console.log("current result", res.result)
  indexHook.emit('si-recognize', res)
}
manager.onStop = function (res) {
  console.log("record file path", res.tempFilePath)
  console.log("result", res.result)
  indexHook.emit('si-stop', res)
}
manager.onStart = function (res) {
  console.log("成功开始录音识别", res)
  indexHook.emit('si-start', res)
}
manager.onError = function (res) {
  console.error("error msg", res.msg)
}