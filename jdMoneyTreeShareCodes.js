/*
摇钱树互助码
此文件为Node.js专用。其他用户请忽略
支持京东N个账号
 */
//云服务器腾讯云函数等NOde.js用户在此处填写摇钱树的好友码。
// 同一个京东账号的好友互助码用@符号隔开,不同京东账号之间用&符号或者换行隔开,下面给一个示例
// 如: 京东账号1的shareCode1@京东账号1的shareCode2&京东账号2的shareCode1@京东账号2的shareCode2
let MoneyTreeShareCodes = [
]

const logShareCodes = require('/ql/scripts/utils/jdShareCodes');
if (logShareCodes.MONEYTREE_SHARECODES.length > 0 && !process.env.MONEYTREE_SHARECODES) {
  process.env.MONEYTREE_SHARECODES = logShareCodes.MONEYTREE_SHARECODES.join('&');
}

// 判断github action里面是否有摇钱树助力码
if (process.env.MONEYTREE_SHARECODES) {
  if (process.env.MONEYTREE_SHARECODES.indexOf('&') > -1) {
    console.log(`您的摇钱树助力码选择的是用&隔开\n`)
    MoneyTreeShareCodes = process.env.MONEYTREE_SHARECODES.split('&');
  } else if (process.env.MONEYTREE_SHARECODES.indexOf('\n') > -1) {
    console.log(`您的摇钱树助力码选择的是用换行隔开\n`)
    MoneyTreeShareCodes = process.env.MONEYTREE_SHARECODES.split('\n');
  } else {
    MoneyTreeShareCodes = process.env.MONEYTREE_SHARECODES.split();
  }
} else {
  console.log(`由于您环境变量里面(MONEYTREE_SHARECODES)未提供助力码，故此处运行将会给脚本内置的码进行助力，请知晓！`)
}
MoneyTreeShareCodes = MoneyTreeShareCodes.filter(item => !!item);
for (let i = 0; i < MoneyTreeShareCodes.length; i++) {
  const index = (i + 1 === 1) ? '' : (i + 1);
  exports['MoneyTreeShareCode' + index] = MoneyTreeShareCodes[i];
}
