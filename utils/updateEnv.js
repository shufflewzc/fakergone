const got = require("got");
const path = require('path')
// 取出应用id,secret。在青龙面板->系统设置->应用设置 新增应用。* 必须给出【环境变量】权限
const {QL_DIR = '/ql'} = process.env;
const authFile = path.join(QL_DIR, 'db/app.db');
const envFile = path.join(QL_DIR, 'db/env.db');
const nedb = require('nedb')
const db = new nedb({filename: authFile, autoload: true})
const envDb = new nedb({filename: envFile, autoload: true})
let jdCookies = [], remarks = []
if (process.env.JD_COOKIE.indexOf('&') > -1) {
    jdCookies = process.env.JD_COOKIE.split('&');
} else if (process.env.JD_COOKIE.indexOf('\n') > -1) {
    jdCookies = process.env.JD_COOKIE.split('\n');
} else {
    jdCookies = [process.env.JD_COOKIE];
}

function findRemarks(cookie) {
    return new Promise(resolve => {
        envDb.find({value: cookie}, (e, doc) => {
            const {remarks} = doc[0]
            resolve(remarks)
        })
    })
}

const appName = 'SetEnv';
let TOKEN = {
    value: '',
    expiration: ''
}
const envs = [];
const headers = {
    "Content-Type": "application/json; charset=utf-8",
    Authorization: "",
};
const shareCodeKeys = {
    zddd: 'PLANT_BEAN_SHARECODES',
    ddnc: 'FRUITSHARECODES',
    jxgc: 'DREAM_FACTORY_SHARE_CODES',
    qdlxj: 'JD_CASH_SHARECODES',
    sgmh: 'JDSGMH_SHARECODES',
    ddmc: 'PETSHARECODES',
    ddgc: 'DDFACTORY_SHARECODES',
    crazyJoy: 'JDJOY_SHARECODES',
    jdzz: 'JDZZ_SHARECODES',
}
// 各活动互助次数
// post 可助力次数
// accept 可被助力次数
// 未知：99
const shareCodeCountMap = {
    // 种豆得豆
    [shareCodeKeys.zddd]: {
        title: '种豆得豆',
        accept: 9,
        post: 3,
        codes: []
    },
    // 东东农场
    [shareCodeKeys.ddnc]: {
        title: '东东农场',
        accept: 8,
        post: 3,
        codes: []
    },
    // 东东萌宠
    [shareCodeKeys.ddmc]: {
        title: '东东萌宠',
        accept: 5,
        post: 5,
        codes: []
    },
    // 京喜工厂
    [shareCodeKeys.jxgc]: {
        title: '京喜工厂',
        accept: 4,
        post: 3,
        codes: []
    },
    // 签到领现金
    [shareCodeKeys.qdlxj]: {
        title: '签到领现金',
        accept: 10,
        post: 10,
        codes: []
    },
    // 闪购盲盒
    [shareCodeKeys.sgmh]: {
        title: '闪购盲盒',
        accept: 10,
        post: 10,
        codes: []
    },
    // 东东工厂
    [shareCodeKeys.ddgc]: {
        title: '东东工厂',
        accept: 5,
        post: 3,
        codes: []
    },
    // 疯狂joy
    [shareCodeKeys.crazyJoy]: {
        title: '疯狂joy',
        accept: 6,
        post: 99,
        codes: []
    },
    // 京东赚赚
    [shareCodeKeys.jdzz]: {
        title: '京东赚赚',
        accept: 5,
        post: 2,
        codes: []
    },
}

// http请求工具
const $http = got.extend({
    prefixUrl: 'http://localhost:5600',
    retry: {limit: 0},
});

// 查询应用信息
function findQlApp() {
    return new Promise(((resolve) => {
        db.find({name: appName}, function (err, docs) {
            if (docs.length < 1) {
                console.log(`没有获取到应用名称为${appName}的信息`)
                console.log(`需要在青龙面板->系统设置->应用设置 新增名为${appName}的应用，且选中【环境变量】权限`)
                resolve(null)
            }
            resolve(docs)
        });
    }))
}


// 获取token
async function getToken() {
    console.log('获取token....')
    // 如果有token，且未过期
    if (TOKEN.value && TOKEN.expiration >= Math.round(Date.now() / 1000)) {
        console.log('内存中有有效token...直接返回')
        headers.Authorization = `Bearer ${TOKEN.value}`
        return Promise.resolve()
    }
    // 内存中无有效token
    console.log('内存中无有效token...，从db中获取token')
    const App = await findQlApp();
    if (!App) return
    const {client_id, client_secret, tokens} = App[0]
    if (tokens && tokens.length > 0) {
        // 取出最后一位token
        const lastToken = tokens[tokens.length - 1];
        console.log('db中有token，获取到最后一位token')
        if (lastToken.expiration >= Math.round(Date.now() / 1000)) {
            console.log('未过期，直接返回')
            TOKEN = lastToken
            headers.Authorization = `Bearer ${TOKEN.value}`
            return Promise.resolve()
        }
        console.log('已过期')
    }
    console.log('缓存中均无法获取有效token，尝试从接口获取')
    const res = await $http({
        url: `open/auth/token?client_id=${client_id}&client_secret=${client_secret}`
    }).json()
    if (res.code === 200) {
        console.log('从接口中获取到新的token')
        const {data: {token: value, expiration}} = res
        TOKEN = {
            value,
            expiration
        }
        headers.Authorization = `Bearer ${TOKEN.value}`
        return Promise.resolve()
    } else {
        console.log(`从接口中获取到新的token失败:${res.message}`)
    }
    return Promise.resolve()
}

async function getEnvs() {
    await getToken();
    const res = await $http({
        url: 'open/envs',
        headers
    }).json()
    const {data, code} = res;
    if (code === 200) {
        envs.push(...data);
        console.log("获取到所有环境变量");
    } else {
        console.log(res.message);
    }
    return Promise.resolve()
}

function getEnvByName(name) {
    return envs.find((item) => item.name === name);
}

async function updateEnvs() {
    const allEnvsKeys = Object.keys(shareCodeKeys);
    for (let i = 0; i < allEnvsKeys.length; i++) {
        const envName = allEnvsKeys[i]
        await updateEnv(envName)
    }
}

async function updateEnv(name) {
    if (!remarks.length) {
        for (let i = 0; i < jdCookies.length; i++) {
            remarks.push(await findRemarks(jdCookies[i]))
        }
    }
    if (!envs.length) {
        await getEnvs();
    }
    const {title, accept, post, codes: shareCodes} = shareCodeCountMap[name];
    if(!shareCodes.length){
        console.log(`${title}无人开通活动，没有助力码。不添加环境变量`)
        return Promise.resolve()
    }
    console.log(`${title}可给${post}人互助，可被互助${accept}次`)
    // 查找对应环境变量
    let env = getEnvByName(name);
    const value = getTransformCode(shareCodes, accept, post)
    if (!env) {
        return createEnv(name, value)
    }
    console.log(`开始更新${title}互助码=========`)
    const {_id} = env
    const data = {
        _id,
        name,
        value,
    };
    console.log(`开始更新${title}环境变量...`)
    const res = await $http({
        method: 'put',
        url: `open/envs?t=${Date.now()}`,
        headers,
        json: data
    }).json()
    if (res.code === 200) {
        console.log(`环境变量:${name}->>>更新成功\n`);
    } else {
        console.log(res.message)
    }
    return Promise.resolve()
}

/**
 * 当互助码环境变量不存在时，主动创建
 */
async function createEnv(name, value) {
    const remarks = shareCodeCountMap[name].title;
    console.log(`检测到${remarks}未设置互助码环境变量，开始创建${remarks}的互助码环境变量：${name}`)
    const res = await $http({
        url: `open/envs?t=${Date.now()}`,
        headers,
        method: 'post',
        json: [{
            name,
            remarks: remarks + '互助码',
            value
        }]
    }).json()
    if (res.code === 200) {
        console.log("新增互助码成功\n");
    } else {
        console.log(res.message);
    }
    return Promise.resolve()

}

/**
 * 获取格式化后的互助码
 * @param arr 互助码数组 { code: 're6sjatvfjvbnkyf73eb6vblku', index: 1 }
 * @param accept 可被互助次数
 * @param post 可互助别人的次数
 */
function getTransformCode(arr, accept, post) {
    const target = []
    arr.forEach((outsideItem, outsideIndex) => {
        const sharCode = []
        for (let i = 0; i < arr.length; i++) {
            if (i === outsideIndex) continue
            if (sharCode.length < post && findCount(arr[i].code) < accept) {
                sharCode.push(arr[i].code)
            }
        }
        target.push(sharCode)
    })

    function transformShareCode(arr) {
        return arr.map(item => {
            return item.join('@')
        }).join('&')
    }

    function findCount(item) {
        let count = 0;
        target.forEach(arr => {
            if (arr.find(t => t === item)) count++
        })
        return count
    }

    arr.forEach((item) => {
        console.log(`账号${item.cookieIndex}【${remarks[item.cookieIndex - 1]}】，将会被助力 ${findCount(item.code)} 次`)
    })
    return transformShareCode(target)

}

/**
 * 将互助码添加到对应的对象数组中
 * @param target 活动名称
 * @param code 互助码集合
 * @param cookieIndex 账号索引
 */
function pushCodes(target, code, cookieIndex) {
    shareCodeCountMap[target].codes.push({
        code,
        cookieIndex
    })
}

module.exports = {
    updateEnvs,
    shareCodeKeys,
    pushCodes
};
