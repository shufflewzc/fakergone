/*
签到领现金互助码
此文件为Node.js专用。其他用户请忽略
支持京东N个账号
 */
//云服务器腾讯云函数等NOde.js用户在此处填写京签到领现金的好友码。
// 同一个京东账号的好友互助码用@符号隔开,不同京东账号之间用&符号或者换行隔开,下面给一个示例
// 如: 京东账号1的shareCode1@京东账号1的shareCode2&京东账号2的shareCode1@京东账号2的shareCode2
let CashShareCodes = [
]

// 从日志获取互助码
const logShareCodes = require('./utils/jdShareCodes');
if (logShareCodes.JD_CASH_SHARECODES.length > 0 && !process.env.JD_CASH_SHARECODES) {
  process.env.JD_CASH_SHARECODES = logShareCodes.JD_CASH_SHARECODES.join('&');
}

// 判断github action里面是否有签到领现金互助码
if (process.env.JD_CASH_SHARECODES) {
  if (process.env.JD_CASH_SHARECODES.indexOf('&') > -1) {
    console.log(`您的签到领现金互助码选择的是用&隔开\n`)
    CashShareCodes = process.env.JD_CASH_SHARECODES.split('&');
  } else if (process.env.JD_CASH_SHARECODES.indexOf('\n') > -1) {
    console.log(`您的签到领现金互助码选择的是用换行隔开\n`)
    CashShareCodes = process.env.JD_CASH_SHARECODES.split('\n');
  } else {
    CashShareCodes = process.env.JD_CASH_SHARECODES.split();
  }
} else {
  console.log(`由于您环境变量(JD_CASH_SHARECODES)里面未提供助力码，故此处运行将会给脚本内置的码进行助力，请知晓！`)
}
for (let i = 0; i < CashShareCodes.length; i++) {
  const index = (i + 1 === 1) ? '' : (i + 1);
  exports['CashShareCode' + index] = CashShareCodes[i];
}
