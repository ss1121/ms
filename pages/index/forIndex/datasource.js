/**
 * [
 *  {name: String, title: String, size: Number, content: String},
 * ]
 */
export const shelfData = [
  {name: 'recycle', title: '分类名', size: 3, sequence: 0, content: {title: '分类项'}}, 
  // {name: 'damage', cat: 'damage', title: '有害', size: 3, content: ['有害的东西', '有害的东西aaa']}, 
  // {name: 'kitchenWaste', cat: 'kitchenWaste', title: '厨余', size: 3, content: '厨房剩余的东西'}, 
  // {name: 'others', cat: 'others', title: '其他', size: 3, content: '其他东西'}, 
  // {name: 'unrecycle', cat: 'unrecycle', title: '不可回收', size: 3, content: '哪些是不可回收'}, 

  // {cat: 'floor5', title: '不可回收', size: 3, content: '哪些是不可回收'}, 
  // {cat: 'floor6', title: '不可回收', size: 3, content: '哪些是不可回收'}, 
]

// const newDataFromStorage = wx.getStorageSync('shelfData')
// if (!newDataFromStorage) {
//   wx.setStorageSync('shelfData', shelfData)
// }
// wx.setStorageSync('shelfData', shelfData)

export let myStickyBottomBar = {
  title: [{
    title: '',
    img: {src: '/images/huatong.png'},
    touchstart: 'onRecode',
    touchend: 'onStopRecode',
    itemClass: 'recodeButton'
  }],
  itemClass: 'stickyBottomBar'
}