/*
活动名称：京东跨年狂欢助力20红包
环境变量：JD_PARTY_INVITE_CODE // 指定助力码

自行控制助力上限

cron: 7 7 7 7 * jd_party_invite.js

*/

const $ = new Env('京东跨年狂欢助力20红包')
const jdCookie = require('./jdCookie')
const notify = require('./function/sendJDNotify');
const common = require('./function/jdCommon');
const H5st = require('./function/krgetH5st');

const isNotify = false
$.inviteCode = process.env.JD_PARTY_INVITE_CODE || ''

let cookie = ''
const cookiesArr = Object.keys(jdCookie)
    .map((key) => jdCookie[key])
    .filter((value) => value)
if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取Cookie')
    process.exit(1)
}

!(async () => {
    $.assistedNum = 0
    authorCodeList = await getAuthorCodeList('https://updateteam.oss-cn-hangzhou.aliyuncs.com/newyear.json');
    if (authorCodeList) {
        console.log('❖ 测试连通性中...\n❖ 服务状态正常...\n');
        $.authorCode = authorCodeList[random(0, authorCodeList.length)];
    } else {
        console.log('❖ 准备就绪...\n');
    }
    // 运行内容
    notify.config({ title: $.name })
    for (let i = 0; i < cookiesArr.length; i++) {
        $.index = i + 1
        cookie = cookiesArr[i]
        common.setCookie(cookie)
        $.UserName = decodeURIComponent(common.getCookieValue(cookie, 'pt_pin'))
        $.UA = common.genUA($.UserName)
        $.message = notify.create($.index, $.UserName)
        $.nickName = ''
        console.log(`\n******开始【京东账号${$.index}】${$.nickName || $.UserName}******\n`)
        await Main()
        common.unsetCookie()
        if ($.runEnd) break
        await $.wait(1000)
    }
    if (isNotify && notify.getMessage()) {
        notify.updateContent(notify.content + `\n【店铺地址】https://shop.m.jd.com/?shopId=${$.shopId}&venderId=${$.venderId}`)
        await notify.push()
    }

})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())


async function Main() {
    // 检查登录状态
    const loginStatus = await common.getLoginStatus(cookie)
    if (!loginStatus && typeof loginStatus === 'boolean') {
        console.log(`账号无效`)
        return
    }

    try {
        if (!$.inviteCode) {
            if ($.index == 1) {
                await sendRequest('party_invite')
                await $.wait(2000)
                console.log('⏺ 账号[1]默认去助力作者')
                await inviteFissionhelp($.authorCode)
            } else {
                await inviteFissionhelp($.inviteCode)
            }
        } else {
            if ($.index == 1) {
                console.log('⏺ 账号[1]默认去助力作者')
                await inviteFissionhelp($.authorCode)
            } else {
                await inviteFissionhelp($.inviteCode)
            }
        }
    } catch (e) {
        console.log(e.message)
    }
}
	
// 助力
async function inviteFissionhelp(InviterId) {
	
    $.inviter = InviterId
	console.log(`当前助力码：${$.inviter}`);
    await sendRequest('party_assist')
    await $.wait(2000)
}
async function handleResponse(type, res) {
    try {
        switch (type) {
            case 'party_invite':
                if (res.code === 0 && res.data) {
                    const data = res?.data
                    if (data.bizCode === 0 && data.result) {
                        $.inviteCode = data.result.inviteCode
                        console.log(`获取助力码：${$.inviteCode}`)
                    } else if (data.bizMsg) {
                        console.log(data.bizMsg)
                        $.message.fix(data.bizMsg)
                    } else {
                        console.log(`❓${type} ${JSON.stringify(res)}`)
                    }
                } else if (res.message) {
                    console.log(res.message)
                    $.message.fix(res.message)
                } else {
                    console.log(`❓${type} ${JSON.stringify(res)}`)
                }
                break
            case 'party_assist':
                if (res.code === 0 && res.data) {
                    const data = res?.data
                    if (data.bizCode === 0 && data.result) {
                        $.assistedNum += 1
                        console.log(`✅ 助力成功 [${$.assistedNum}]`)
                    } else if (data.bizMsg) {
                        console.log(`❌ ${data.bizMsg}`)
                        $.message.fix(data.bizMsg)
                    } else {
                        console.log(`❓${type} ${JSON.stringify(res)}`)
                    }
                } else if (res.message) {
                    console.log(`❌ ${res.message}`)
                    $.message.fix(res.message)
                } else {
                    console.log(`❓${type} ${JSON.stringify(res)}`)
                }
                break
        }
            
    } catch (e) {
        console.log(`❌ 未能正确处理 ${type} 请求响应 ${e.message || e}`)
    }
}

function getAuthorCodeList(url) {
    return new Promise((resolve) => {
        const options = {
            url: `${url}`,
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/87.0.4280.88',
            },
        };
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    // console.log("" + JSON.stringify(err));
                } else {
                    if (data) {
                        data = JSON.parse(data);
                    } else {
                        console.log('未获取到数据,请重新运行');
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
                data = null;
            } finally {
                resolve(data);
            }
        });
    });
}
function random(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

async function sendRequest(type) {
    if ($.runEnd || $.outFlag) return
    let url = '',
        body = {},
        method = 'POST',
        h5st = null,
        req = {}
    switch (type) {
        case 'party_invite':
            url = 'https://api-x.m.jd.com/'
            body = 'functionId=party_invite&appid=spring_h5&body={}'
            break
        case 'party_assist':
            req = {
                appId: 'b1660',
                functionId: 'party_assist',
                appid: 'spring_h5',
                clientVersion: '12.2.0',
                client: 'ios',
                body: { inviteCode: $.inviteCode || '', areaInfo: '', unpl: '' },
                version: '4.3',
                ua: $.UA,
                t: true,
            }
            h5st = await H5st.getH5st(req)
            url = 'https://api-x.m.jd.com/'
            body = `${h5st.params}`
            break
        default:
            console.log(`❌ 未知请求 ${type}`)
            return
    }

    const requestOptions = {
        url,
        headers: {
            Accept: 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,en-GB;q=0.6',
            Connection: 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: cookie,
            Origin: 'https://pro.m.jd.com',
            Referer: 'https://pro.m.jd.com/mall/active/2wVcxotdeVGtYzshpn4gBQkx2cnN/index.html',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': $.UA,
        },
        body,
        timeout: 30000,
    }
    if (method === 'GET') {
        delete requestOptions.body
        delete requestOptions.headers['Content-Type']
    }
    // console.log(requestOptions);
    const maxRequestTimes = 1 // 请求尝试次数
    let requestFailedTimes = 0 // 连续请求失败次数
    let lastErrorMsg = null // 请求失败的信息
    let ipBlack = false // IP是否被限制
    while (requestFailedTimes < maxRequestTimes) {
        // 增加请求间隔，防止频繁请求被服务器拒绝
        if (requestFailedTimes > 0) {
            await $.wait(1000)
        }
        const { err, res, data } = await handleRequest(requestOptions, method)
        if (err) {
            // 判断是否是超时错误
            if (typeof err === 'string' && err.includes("Timeout awaiting 'request'")) {
                lastErrorMsg = `${type} 请求超时，请检查网络重试`
            } else {
                const statusCode = res?.statusCode
                if (statusCode) {
                    if ([403, 493].includes(statusCode)) {
                        lastErrorMsg = `${type} 请求失败，IP被限制（Response code ${statusCode}）`
                        ipBlack = true
                    } else if ([400, 404].includes(statusCode)) {
                        lastErrorMsg = `${type} 请求配置参数错误，请联系开发者进行反馈（Response code ${statusCode}）`
                    } else {
                        lastErrorMsg = `${type} 请求失败（Response code ${statusCode}）`
                    }
                } else {
                    lastErrorMsg = `${type} 请求失败 => ${err.message || err}`
                }
            }
            requestFailedTimes++
        } else {
            const resCookie = common.getResponseCookie(res) // 接口响应Cookie
            // 调试
            const debugMode = false
            if (debugMode) {
                console.log('\n---------------------------------------------------\n')
                console.log(`🔧 ${type} 响应Body => ${data || '无'}\n`)
                console.log(`🔧 ${type} 响应Cookie => ${resCookie || '无'}\n`)
                console.log(`🔧 ${type} 请求参数`)
                console.log(requestOptions)
                console.log('\n---------------------------------------------------\n')
            }

            // 处理接口响应body
            try {
                const formatData = JSON.parse(data)
                // 请求成功，调用业务代码
                handleResponse(type, formatData)
                break
            } catch (error) {
                lastErrorMsg = `❌ ${type} 接口响应数据解析失败: ${error.message}`
                console.log(`🚫 ${type} => ${String(data || '无响应数据')}`)
                requestFailedTimes++
            }
            ipBlack = false
        }
    }
    // 达到最大重试次数仍失败后的处理
    if (requestFailedTimes >= maxRequestTimes) {
        console.log(lastErrorMsg)
        if (ipBlack) {
            $.outFlag = true
            if ($.message) {
                $.message.fix(lastErrorMsg)
            }
        }
    }
}

/**
 * 发送HTTP请求函数，支持POST和GET方法。
 *
 * @param {Object} options - 适用于 got 库的请求参数对象，无具体要求。
 * @param {string} method - 请求方法，可选值为 'POST' 或 'GET'。
 * @returns {Promise<Object>} - 返回一个Promise对象，包含以下字段：
 *   - err {Error} - 请求发生的错误，如果请求成功则为null。
 *   - res {Object} - 请求响应对象，包含响应状态码等信息。
 *   - data {string} - 响应数据，如果请求失败则为null。
 */
async function handleRequest(options, method = 'POST') {
    // 判断请求方法是 POST 还是 GET
    if (method === 'POST') {
        return new Promise(async (resolve) => {
            $.post(options, (err, res, data) => {
                // 处理请求结果并返回
                resolve({ err, res, data })
            })
        })
    } else if (method === 'GET') {
        return new Promise(async (resolve) => {
            $.get(options, (err, res, data) => {
                // 处理请求结果并返回
                resolve({ err, res, data })
            })
        })
    } else {
        const errorMsg = '不支持的请求方法'
        return { err: errorMsg, res: null, data: null }
    }
}

// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
