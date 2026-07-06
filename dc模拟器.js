// ==UserScript==
// @name         dc模拟器
// @author       hairuiaa+codex
// @version      1.5.0
// @description  带每日低保、打工、转盘、老虎机、买大小和管理工具的经济插件。
// @timestamp    1783334400
// @license      Apache-2.0
// ==/UserScript==

let ext = seal.ext.find('slot-economy');
if (!ext) {
  ext = seal.ext.new('slot-economy', 'hairuiaa+codex', '1.5.0');
  seal.ext.register(ext);
}

try {
    if (seal.ext.unregisterConfig) {
        seal.ext.unregisterConfig(ext, "无奖权重", "小奖权重", "大奖权重", "21点消息间隔秒", "21点默认下注", "21点最小下注", "21点最大下注");
    }
} catch (e) {}

seal.ext.registerStringConfig(ext, "货币名", "金币", "余额单位。");
seal.ext.registerIntConfig(ext, "每日低保金额", 100, "每次领取低保获得的金额。");
seal.ext.registerIntConfig(ext, "每日低保次数", 3, "每个玩家每天最多领取低保的次数。");
seal.ext.registerIntConfig(ext, "默认下注", 10, "使用 .老虎机 时的默认下注金额。");
seal.ext.registerIntConfig(ext, "最小下注", 1, "老虎机允许的最小下注金额。");
seal.ext.registerIntConfig(ext, "最大下注", 1000, "老虎机允许的最大下注金额。");
seal.ext.registerFloatConfig(ext, "老虎机小奖概率", 9.75, "老虎机小奖概率，单位为百分比，支持两位小数。");
seal.ext.registerFloatConfig(ext, "老虎机大奖基础概率", 0.25, "老虎机大奖基础概率，单位为百分比，支持两位小数。");
seal.ext.registerIntConfig(ext, "小奖倍率", 2, "小奖返还倍率，包含本金。");
seal.ext.registerIntConfig(ext, "大奖倍率", 10, "大奖返还倍率，包含本金。");
seal.ext.registerIntConfig(ext, "大奖加权亏损金额", 10, "本群奖池每累计多少亏损，增加一次大奖额外概率。");
seal.ext.registerFloatConfig(ext, "每份亏损大奖加权", 0.01, "每达到一次亏损金额时，额外增加多少大奖概率，单位为百分比。");
seal.ext.registerFloatConfig(ext, "大奖加权上限", 1.00, "每个群最多累计多少额外大奖概率，单位为百分比。");
seal.ext.registerBoolConfig(ext, "显示群奖池信息", true, "开启后，老虎机结果会显示当前群奖池和大奖概率。");
seal.ext.registerBoolConfig(ext, "隐藏大奖加权", false, "开启后，老虎机结果不显示大奖概率数值。");
seal.ext.registerIntConfig(ext, "打工每分钟收益", 10, "打工每满一分钟获得多少金额。");
seal.ext.registerIntConfig(ext, "抽奖消耗金额", 200, "每次大爷幸运大转盘扣除的金额。");
seal.ext.registerIntConfig(ext, "抽奖完没中概率", 85, "大爷幸运大转盘完没中的随机权重。");
seal.ext.registerIntConfig(ext, "抽奖小奖概率", 14, "大爷幸运大转盘小奖的随机权重。");
seal.ext.registerIntConfig(ext, "抽奖大奖概率", 1, "大爷幸运大转盘大奖的随机权重。");
seal.ext.registerIntConfig(ext, "小奖时髦值", 1, "抽到小奖时增加的时髦值。");
seal.ext.registerIntConfig(ext, "大奖时髦值", 10, "抽到大奖时增加的时髦值。");
seal.ext.registerIntConfig(ext, "买大小下注时间秒", 60, "买大小开局后允许下注的秒数。");
seal.ext.registerIntConfig(ext, "买大小默认下注", 10, "使用 .买大 或 .买小时的默认下注金额。");
seal.ext.registerIntConfig(ext, "买大小最小下注", 1, "买大小允许的最小下注金额。");
seal.ext.registerIntConfig(ext, "买大小最大下注", 1000, "买大小允许的最大下注金额。");
seal.ext.registerFloatConfig(ext, "买大小返还倍率", 2.0, "买大小买中时的返还倍率，包含本金。");
seal.ext.registerIntConfig(ext, "管理指令最低权限", 100, "使用加钱和一键共产等管理指令所需的最低权限等级，实际不会低于海豹管理员权限 100。");

const SLOT_SYMBOLS = ["☂️", "🍎", "🍑", "🍉", "⑦"];
const SMALL_PRIZE_SYMBOLS = ["☂️", "🍎", "🍑", "🍉"];
const BLACKJACK_SUITS = ["♠", "♥", "♦", "♣"];
const BLACKJACK_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const LOTTERY_SLOGAN_LINES = [
    "✨ 中奖概率倍儿高，奖品也嘛倍儿好！",
    "📱 手机钞票 🚗 奔驰金条 ⌚ 还有大金劳！",
];
const LOTTERY_MISS_TEXTS = [
    [
        "🛑 指针停下。",
        "🎯 最终落点：【 ❌ 完 没 中 】",
        "👴 大爷拍了拍桌板：",
        "“哎呀，指针刚才抖了一下。再来一把，下一把给你安排个狠的！”",
    ].join("\n"),
    [
        "🛑 指针卡住。",
        "🎯 最终落点：【 ❌ 空空如也 】",
        "👴 大爷把喇叭一放：",
        "“手气热身完了，下一轮才算正式开始。”",
    ].join("\n"),
    [
        "🛑 轮盘停稳。",
        "🎯 最终落点：【 ❌ 啥也没有 】",
        "👴 大爷咳了一声：",
        "“这把给机器润滑了。你再转一把，场面马上起来。”",
    ].join("\n"),
    [
        "🛑 指针偏开。",
        "🎯 最终落点：【 ❌ 奖品擦肩而过 】",
        "👴 大爷掀开红布：",
        "“大奖刚才在隔壁格。手别停，福气马上拐回来。”",
    ].join("\n"),
];
const LOTTERY_SMALL_TEXTS = [
    [
        "🛑 指针停下。",
        "🎯 最终落点：【 🧻 街头同款劣质纸巾一包 】",
        "👴 大爷把纸巾塞进你手里：",
        "“拿去擦擦手汗，接着转！”",
    ].join("\n"),
    [
        "🛑 轮盘停稳。",
        "🎯 最终落点：【 🧷 生锈别针一枚 】",
        "👴 大爷压低声音：",
        "“这玩意儿别看寒酸，关键时刻能别住场面。”",
    ].join("\n"),
    [
        "🛑 指针落定。",
        "🎯 最终落点：【 🧦 单只花袜子 】",
        "👴 大爷把袜子一甩：",
        "“潮人讲究不成双。你这时髦劲儿上来了！”",
    ].join("\n"),
    [
        "🛑 指针压住小奖格。",
        "🎯 最终落点：【 🪙 镀金塑料硬币 】",
        "👴 大爷把硬币扣在桌上：",
        "“亮就完事了。揣兜里，走路都带响。”",
    ].join("\n"),
];
const LOTTERY_BIG_TEXTS = [
    [
        "🛑 指针重重停下。",
        "🎯 最终落点：【 🎁 终极大奖 · 大爷亲封时髦王 】",
        "👴 大爷一拍桌：",
        "“中啦！全场都给你让道，今天这份排面归你！”",
    ].join("\n"),
    [
        "🛑 轮盘停在金边格。",
        "🎯 最终落点：【 ⌚ 大爷珍藏款金表体验券 】",
        "👴 大爷把票塞进你手里：",
        "“金表先寄存在我这儿，时髦值你先拿走！”",
    ].join("\n"),
    [
        "🛑 指针压住大奖格。",
        "🎯 最终落点：【 🚗 奔驰同款钥匙扣 】",
        "👴 大爷喊了一嗓子：",
        "“车钥匙的气势到了，车以后再说！”",
    ].join("\n"),
    [
        "🛑 轮盘猛地停住。",
        "🎯 最终落点：【 📱 手机模型展示资格 】",
        "👴 大爷把展示牌递过来：",
        "“站上去，摆个姿势。今天你就是全场最亮的主角。”",
    ].join("\n"),
];
const LEGACY_WALLET_CANDIDATES = [
    { userId: "QQ:1083390166", name: "黄秋逸" },
    { userId: "QQ:1127588507", name: "乾澜" },
    { userId: "QQ:11482389", name: "死者苏生" },
    { userId: "QQ:1291474528", name: "ob妄无妄" },
    { userId: "QQ:1356700847", name: "ob瓦什托尔" },
    { userId: "QQ:1367296812", name: "沐易" },
    { userId: "QQ:1429066226", name: "米墨" },
    { userId: "QQ:1453242397", name: "hairuiaa" },
    { userId: "QQ:1604630352", name: "格尔曼 SAN64 HP13/10 DEX70" },
    { userId: "QQ:1619760367", name: "好运" },
    { userId: "QQ:169446551", name: "ob青" },
    { userId: "QQ:1770948376", name: "狗狗狗" },
    { userId: "QQ:1807554225", name: "孙小蛋" },
    { userId: "QQ:1927743756", name: "神棍道长" },
    { userId: "QQ:194008824", name: "ob欲浊" },
    { userId: "QQ:1950292538", name: "雾楦" },
    { userId: "QQ:2021273457", name: "猫のLau神教" },
    { userId: "QQ:2039374899", name: "孩子你真要看我头像吗？" },
    { userId: "QQ:2054736019", name: "群奈亚，时不时当克图格亚梦男" },
    { userId: "QQ:2223526356", name: "pure." },
    { userId: "QQ:2224291569", name: "群蛇之父伊格，时不时让群友变蛇" },
    { userId: "QQ:2257670883", name: "嘉豪" },
    { userId: "QQ:229582216", name: "璃" },
    { userId: "QQ:2429608835", name: "ob古咕固" },
    { userId: "QQ:2652084239", name: "费尔旺.李" },
    { userId: "QQ:2752427970", name: "唐泽·约翰逊" },
    { userId: "QQ:2794409574", name: "风继续吹" },
    { userId: "QQ:3067054178", name: "丰川 祥子" },
    { userId: "QQ:3115065891", name: "杯酒洗尘" },
    { userId: "QQ:3145248648", name: "השכחה משיח" },
    { userId: "QQ:3192296594", name: "ob叁万贰" },
    { userId: "QQ:3208342052", name: "群夏塔克鸟，时不时送人去混沌王庭" },
    { userId: "QQ:3231853461", name: "ob冬日不见星" },
    { userId: "QQ:3247976478", name: "充能不够八层" },
    { userId: "QQ:3526595805", name: "❑" },
    { userId: "QQ:3929214734", name: "瑞恩" },
    { userId: "QQ:3960691163", name: "名叫翠香的西瓜" },
    { userId: "QQ:3962865196", name: "弋游" },
    { userId: "QQ:639767805", name: "等闲" },
    { userId: "QQ:705577236", name: "虚构" },
    { userId: "QQ:798726920", name: "obJerry" },
    { userId: "QQ:825726760", name: "三千大水入海流" },
    { userId: "QQ:981242035", name: "沉睡的长梦" },
    { userId: "UI:1001", name: "User" },
];
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getStringConfig(key, fallback) {
    try {
        const value = seal.ext.getStringConfig(ext, key);
        if (typeof value === "string" && value.length > 0) return value;
    } catch (e) {}
    return fallback;
}

function getIntConfig(key, fallback) {
    try {
        const value = Number(seal.ext.getIntConfig(ext, key));
        if (Number.isSafeInteger(value)) return value;
    } catch (e) {}
    return fallback;
}

function getFloatConfig(key, fallback) {
    try {
        const value = Number(seal.ext.getFloatConfig(ext, key));
        if (Number.isFinite(value)) return value;
    } catch (e) {}
    return fallback;
}

function getBoolConfig(key, fallback) {
    try {
        const value = seal.ext.getBoolConfig(ext, key);
        if (typeof value === "boolean") return value;
    } catch (e) {}
    return fallback;
}

function getUserId(ctx, msg) {
    if (ctx && ctx.player && ctx.player.userId) return ctx.player.userId;
    if (msg && msg.sender && msg.sender.userId) return msg.sender.userId;
    if (msg && msg.sender && msg.sender.user_id) return msg.sender.user_id;
    return "";
}

function getSlotScopeId(ctx, msg, userId) {
    if (msg && msg.messageType === "private") return `private:${userId}`;
    if (msg && msg.groupId) return msg.groupId;
    if (ctx && ctx.group && ctx.group.groupId) return ctx.group.groupId;
    return `private:${userId}`;
}

function getGroupId(ctx, msg) {
    if (msg && msg.messageType === "private") return "";
    if (msg && msg.groupId) return msg.groupId;
    if (ctx && ctx.group && ctx.group.groupId) return ctx.group.groupId;
    return "";
}

function storageGetInt(key, fallback) {
    const raw = ext.storageGet(key);
    if (raw === undefined || raw === null || raw === "") return fallback;
    const value = Number.parseInt(String(raw), 10);
    if (!Number.isSafeInteger(value)) return fallback;
    return value;
}

function storageSetInt(key, value) {
    ext.storageSet(key, String(value));
}

function storageGetNumber(key, fallback) {
    const raw = ext.storageGet(key);
    if (raw === undefined || raw === null || raw === "") return fallback;
    const value = Number.parseFloat(String(raw));
    if (!Number.isFinite(value)) return fallback;
    return value;
}

function storageSetNumber(key, value) {
    const safeValue = Number.isFinite(value) ? value : 0;
    ext.storageSet(key, String(Math.round(safeValue * 1000) / 1000));
}

function round2(value) {
    const safeValue = Number.isFinite(value) ? value : 0;
    return Math.round(safeValue * 100) / 100;
}

function formatNumber(value) {
    if (Math.abs(value - Math.round(value)) < 0.001) return String(Math.round(value));
    return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatPercent(value) {
    return round2(value).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function getWalletUsersKey() {
    return "walletUsers";
}

function getWalletNameKey(userId) {
    return `walletName:${userId}`;
}

function getPublicFundKey() {
    return "publicFund";
}

function getCommunePendingKey(userId) {
    return `communePending:${userId}`;
}

function getCommuneLastSummaryKey(userId) {
    return `communeLastSummary:${userId}`;
}

function normalizeUserId(userId) {
    return String(userId || "").trim();
}

function rememberWalletUserId(userId) {
    const normalized = normalizeUserId(userId);
    if (!normalized) return;
    const users = storageGetJsonArray(getWalletUsersKey()).map(item => String(item));
    if (users.indexOf(normalized) >= 0) return;
    users.push(normalized);
    storageSetJsonArray(getWalletUsersKey(), users);
}

function rememberWalletUser(ctx, msg, userId) {
    const normalized = normalizeUserId(userId);
    if (!normalized) return;
    rememberWalletUserId(normalized);
    const name = getDisplayName(ctx, msg, normalized);
    if (name) ext.storageSet(getWalletNameKey(normalized), name);
}

function getKnownWalletUsers() {
    const seen = storageGetJsonArray(getWalletUsersKey()).map(item => normalizeUserId(item)).filter(Boolean);
    const unique = [];
    for (const userId of seen) {
        if (unique.indexOf(userId) < 0) unique.push(userId);
    }
    if (unique.length !== seen.length) storageSetJsonArray(getWalletUsersKey(), unique);
    return unique;
}

function getKnownWalletName(userId) {
    const stored = ext.storageGet(getWalletNameKey(userId));
    if (stored) {
        const text = String(stored);
        if (text && text !== userId) return text;
    }
    const candidate = getLegacyCandidateName(userId);
    return candidate || userId;
}

function getLegacyCandidateName(userId) {
    const normalized = normalizeUserId(userId);
    if (!normalized) return "";
    for (const item of LEGACY_WALLET_CANDIDATES) {
        if (normalizeUserId(item.userId) === normalized && item.name) return String(item.name);
    }
    return "";
}

function getQQNumberFromUserId(userId) {
    const text = normalizeUserId(userId);
    const qqId = text.match(/^QQ:(\d{5,})$/i);
    if (qqId) return qqId[1];
    if (/^\d{5,}$/.test(text)) return text;
    return "";
}

function formatUserAt(userId) {
    const qq = getQQNumberFromUserId(userId);
    if (qq) return `[CQ:at,qq=${qq}]`;
    return normalizeUserId(userId);
}

function formatKnownUser(userId) {
    const name = getKnownWalletName(userId);
    const at = formatUserAt(userId);
    if (name && name !== userId && at && at !== userId) return `${name} ${at}`;
    return at || name || userId;
}

function migrateLegacyWalletCandidates() {
    let positiveCount = 0;
    let positiveTotal = 0;
    for (const item of LEGACY_WALLET_CANDIDATES) {
        const userId = normalizeUserId(item.userId);
        if (!userId) continue;
        rememberWalletUserId(userId);
        if (item.name) ext.storageSet(getWalletNameKey(userId), item.name);
        const balance = storageGetInt(getWalletKey(userId), 0);
        if (balance > 0) {
            positiveCount += 1;
            positiveTotal += balance;
        }
    }
    return { scanned: LEGACY_WALLET_CANDIDATES.length, positiveCount, positiveTotal };
}

function getPublicFund() {
    return storageGetInt(getPublicFundKey(), 0);
}

function addPublicFund(amount) {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    const next = getPublicFund() + safeAmount;
    storageSetInt(getPublicFundKey(), next);
    return next;
}

function getWalletKey(userId) {
    return `wallet:${userId}`;
}

function getWallet(userId) {
    rememberWalletUserId(userId);
    return storageGetInt(getWalletKey(userId), 0);
}

function setWallet(userId, amount) {
    rememberWalletUserId(userId);
    storageSetInt(getWalletKey(userId), Math.max(0, amount));
}

function getDebtKey(userId) {
    return `debt:${userId}`;
}

function getDebt(userId) {
    return storageGetInt(getDebtKey(userId), 0);
}

function setDebt(userId, amount) {
    storageSetInt(getDebtKey(userId), Math.max(0, Math.floor(amount)));
}

function addDebt(userId, amount) {
    const debt = getDebt(userId) + Math.max(0, Math.floor(amount));
    setDebt(userId, debt);
    return debt;
}

function applyIncome(userId, amount) {
    const income = Math.max(0, Math.floor(amount));
    const debtBefore = getDebt(userId);
    const paidDebt = Math.min(debtBefore, income);
    const walletAdded = income - paidDebt;
    const debtAfter = debtBefore - paidDebt;
    const balanceAfter = getWallet(userId) + walletAdded;
    setDebt(userId, debtAfter);
    setWallet(userId, balanceAfter);
    return { income, debtBefore, paidDebt, debtAfter, walletAdded, balanceAfter };
}

function replyDebtBlocked(ctx, msg, userId, actionText) {
    const debt = getDebt(userId);
    if (debt <= 0) return false;
    const currency = getStringConfig("货币名", "金币");
    seal.replyToSender(ctx, msg, [
        `你还有 ${debt}${currency} 欠债，暂时不能${actionText}。`,
        "低保和打工收益会先用于还债。",
        "使用 .打工开始 开始打工。",
    ].join("\n"));
    return true;
}

function getTodayString() {
    const date = new Date(Date.now() + 8 * 3600 * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDailyKey(userId) {
    return `daily:${getTodayString()}:${userId}`;
}

function getDailyClaimCount(userId) {
    return storageGetInt(getDailyKey(userId), 0);
}

function setDailyClaimCount(userId, count) {
    storageSetInt(getDailyKey(userId), Math.max(0, count));
}

function clearDailyClaimCount(userId) {
    ext.storageSet(getDailyKey(userId), "");
}

function resetDailyClaimsForKnownWallets(extraRows) {
    migrateLegacyWalletCandidates();
    const users = getKnownWalletUsers();
    for (const row of extraRows || []) {
        const userId = normalizeUserId(row && row.userId);
        if (userId && users.indexOf(userId) < 0) users.push(userId);
    }

    let resetCount = 0;
    for (const userId of users) {
        if (!userId) continue;
        clearDailyClaimCount(userId);
        resetCount += 1;
    }
    return resetCount;
}

function getJackpotWeightKey(scopeId) {
    return `jackpotWeight:${scopeId}`;
}

function getJackpotPoolKey(scopeId) {
    return `jackpotPool:${scopeId}`;
}

function getJackpotWeight(scopeId) {
    return Math.max(0, storageGetNumber(getJackpotWeightKey(scopeId), 0));
}

function setJackpotWeight(scopeId, value) {
    storageSetNumber(getJackpotWeightKey(scopeId), Math.max(0, value));
}

function getJackpotPool(scopeId) {
    return Math.max(0, storageGetInt(getJackpotPoolKey(scopeId), 0));
}

function setJackpotPool(scopeId, value) {
    storageSetInt(getJackpotPoolKey(scopeId), Math.max(0, Math.floor(value)));
}

function getSlotSmallChance() {
    return Math.max(0, Math.min(100, round2(getFloatConfig("老虎机小奖概率", 9.75))));
}

function getSlotJackpotBaseChance() {
    return Math.max(0, Math.min(100, round2(getFloatConfig("老虎机大奖基础概率", 0.25))));
}

function getJackpotLossUnit() {
    return Math.max(1, getIntConfig("大奖加权亏损金额", 10));
}

function getJackpotChancePerLossUnit() {
    return Math.max(0, round2(getFloatConfig("每份亏损大奖加权", 0.01)));
}

function getJackpotExtraChanceCap() {
    return Math.max(0, Math.min(100, round2(getFloatConfig("大奖加权上限", 1.00))));
}

function getJackpotExtraChanceForPool(pool) {
    const lossUnit = getJackpotLossUnit();
    const steps = Math.floor(Math.max(0, pool) / lossUnit);
    return round2(Math.min(getJackpotExtraChanceCap(), steps * getJackpotChancePerLossUnit()));
}

function getJackpotExtraChance(scopeId) {
    return getJackpotExtraChanceForPool(getJackpotPool(scopeId));
}

function addJackpotProgress(scopeId, bet) {
    const poolBefore = getJackpotPool(scopeId);
    const before = getJackpotExtraChanceForPool(poolBefore);
    const pool = poolBefore + bet;
    setJackpotPool(scopeId, pool);

    const after = getJackpotExtraChanceForPool(pool);
    setJackpotWeight(scopeId, after);

    return { pool, before, added: after - before, after };
}

function clearJackpotProgress(scopeId) {
    setJackpotPool(scopeId, 0);
    setJackpotWeight(scopeId, 0);
}

function getWorkStartKey(userId) {
    return `workStart:${userId}`;
}

function getWorkStart(userId) {
    return storageGetInt(getWorkStartKey(userId), 0);
}

function setWorkStart(userId, value) {
    storageSetInt(getWorkStartKey(userId), value);
}

function clearWorkStart(userId) {
    ext.storageSet(getWorkStartKey(userId), "");
}

function storageGetJsonArray(key) {
    const raw = ext.storageGet(key);
    if (raw === undefined || raw === null || raw === "") return [];
    try {
        const value = JSON.parse(String(raw));
        if (Array.isArray(value)) return value;
    } catch (e) {}
    return [];
}

function storageSetJsonArray(key, value) {
    ext.storageSet(key, JSON.stringify(value));
}

function storageGetJsonObject(key) {
    const raw = ext.storageGet(key);
    if (raw === undefined || raw === null || raw === "") return null;
    try {
        const value = JSON.parse(String(raw));
        if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch (e) {}
    return null;
}

function storageSetJsonObject(key, value) {
    ext.storageSet(key, JSON.stringify(value));
}

function getFashionKey(userId) {
    return `fashion:${userId}`;
}

function getFashion(userId) {
    return storageGetInt(getFashionKey(userId), 0);
}

function setFashion(userId, value) {
    storageSetInt(getFashionKey(userId), Math.max(0, value));
}

function addFashion(userId, amount) {
    const gain = Math.max(0, Math.floor(amount));
    const next = getFashion(userId) + gain;
    setFashion(userId, next);
    return next;
}

function getFashionSeenKey(groupId) {
    return `fashionSeen:${groupId}`;
}

function getFashionNameKey(groupId, userId) {
    return `fashionName:${groupId}:${userId}`;
}

function getDisplayName(ctx, msg, userId) {
    const sender = msg && msg.sender ? msg.sender : {};
    const player = ctx && ctx.player ? ctx.player : {};
    const candidates = [
        sender.nickname,
        sender.nickName,
        sender.name,
        player.name,
        player.nickname,
        userId,
    ];
    for (const item of candidates) {
        if (item === undefined || item === null) continue;
        const text = String(item).replace(/\s+/g, " ").trim().slice(0, 30);
        if (text.length > 0) return text;
    }
    return userId;
}

function rememberFashionUser(ctx, msg, userId) {
    const scopeId = getSlotScopeId(ctx, msg, userId);
    if (scopeId.startsWith("private:")) return scopeId;

    const seenKey = getFashionSeenKey(scopeId);
    const seen = storageGetJsonArray(seenKey).map(item => String(item));
    if (seen.indexOf(userId) < 0) {
        seen.push(userId);
        storageSetJsonArray(seenKey, seen);
    }

    const displayName = getDisplayName(ctx, msg, userId);
    ext.storageSet(getFashionNameKey(scopeId, userId), displayName);
    return scopeId;
}

function getFashionLeaderboard(scopeId) {
    const seen = storageGetJsonArray(getFashionSeenKey(scopeId)).map(item => String(item));
    const unique = [];
    for (const userId of seen) {
        if (userId && unique.indexOf(userId) < 0) unique.push(userId);
    }

    const rows = [];
    for (const userId of unique) {
        const score = getFashion(userId);
        if (score <= 0) continue;
        const storedName = ext.storageGet(getFashionNameKey(scopeId, userId));
        const name = storedName ? String(storedName) : userId;
        rows.push({ userId, name, score });
    }
    rows.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
    });
    return rows.slice(0, 10);
}

function formatDuration(ms) {
    const secondsTotal = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(secondsTotal / 60);
    const seconds = secondsTotal % 60;
    if (minutes <= 0) return `${seconds}秒`;
    if (seconds === 0) return `${minutes}分钟`;
    return `${minutes}分钟${seconds}秒`;
}

function replyWorkBlocked(ctx, msg, userId, actionText) {
    const workStart = getWorkStart(userId);
    if (workStart <= 0) return false;
    seal.replyToSender(ctx, msg, [
        `你正在打工，不能${actionText}。`,
        `已打工：${formatDuration(Date.now() - workStart)}`,
        "使用 .打工结束 结算后再来玩。",
    ].join("\n"));
    return true;
}

function randomInt(maxExclusive) {
    return Math.floor(Math.random() * maxExclusive);
}

function choice(items) {
    return items[randomInt(items.length)];
}

function weightedPick(items) {
    let total = 0;
    for (const item of items) {
        if (item.weight > 0) total += item.weight;
    }
    if (total <= 0) return items[0].value;

    let cursor = Math.random() * total;
    for (const item of items) {
        if (item.weight <= 0) continue;
        cursor -= item.weight;
        if (cursor < 0) return item.value;
    }
    return items[items.length - 1].value;
}

function createNoPrizeReels() {
    const reels = [
        choice(SLOT_SYMBOLS),
        choice(SLOT_SYMBOLS),
        choice(SLOT_SYMBOLS),
    ];
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
        const index = SLOT_SYMBOLS.indexOf(reels[2]);
        reels[2] = SLOT_SYMBOLS[(index + 1) % SLOT_SYMBOLS.length];
    }
    return reels;
}

function createSmallPrizeReels() {
    const symbol = choice(SMALL_PRIZE_SYMBOLS);
    return [symbol, symbol, symbol];
}

function rollSlot(scopeId) {
    const jackpotExtraChance = getJackpotExtraChance(scopeId);
    const jackpotChance = Math.min(100, getSlotJackpotBaseChance() + jackpotExtraChance);
    const smallChance = Math.min(getSlotSmallChance(), Math.max(0, 100 - jackpotChance));
    const noneChance = Math.max(0, 100 - jackpotChance - smallChance);
    const prize = weightedPick([
        { value: "none", weight: noneChance },
        { value: "small", weight: smallChance },
        { value: "jackpot", weight: jackpotChance },
    ]);

    if (prize === "jackpot") {
        return { prize: "jackpot", reels: ["⑦", "⑦", "⑦"], jackpotExtraChance, jackpotChance };
    }
    if (prize === "small") {
        return { prize: "small", reels: createSmallPrizeReels(), jackpotExtraChance, jackpotChance };
    }
    return { prize: "none", reels: createNoPrizeReels(), jackpotExtraChance, jackpotChance };
}

function rollLotteryPrize() {
    return weightedPick([
        { value: "miss", weight: Math.max(0, getIntConfig("抽奖完没中概率", 85)) },
        { value: "small", weight: Math.max(0, getIntConfig("抽奖小奖概率", 14)) },
        { value: "big", weight: Math.max(0, getIntConfig("抽奖大奖概率", 1)) },
    ]);
}

function getLotteryOpeningText(displayName, cost, currency) {
    return [
        "🎰 【大爷的特制幸运大转盘】 🎰",
        "──────────────────",
        "📢 大爷举着喇叭喊：",
        "“往里走，往里瞧！",
        LOTTERY_SLOGAN_LINES[0],
        LOTTERY_SLOGAN_LINES[1],
        `${cost}${currency}你买不了吃亏，${cost}${currency}你买不了上当！”`,
        "──────────────────",
        "🌀 轮盘正在疯狂旋转：[ 📱 | 💵 | 🚗 | 🪙 | ⌚ | ❌ ]",
        `⏳ ${displayName} 正在等指针停下……`,
    ].join("\n");
}

function getLotteryResultText(prize) {
    if (prize === "small") return choice(LOTTERY_SMALL_TEXTS);
    if (prize === "big") return choice(LOTTERY_BIG_TEXTS);
    return choice(LOTTERY_MISS_TEXTS);
}

function getLotteryFashionGain(prize) {
    if (prize === "small") return Math.max(0, getIntConfig("小奖时髦值", 1));
    if (prize === "big") return Math.max(0, getIntConfig("大奖时髦值", 10));
    return 0;
}

function isLotteryTenText(text) {
    const value = String(text || "").replace(/\s+/g, "").toLowerCase();
    return value === "十连" || value === "十连抽奖" || value === "10" || value === "10连" || value === "x10";
}

function getLotteryPrizeName(prize) {
    if (prize === "small") return "小奖";
    if (prize === "big") return "大奖";
    return "完没中";
}

function getLotteryTenOpeningText(displayName, totalCost, currency) {
    return [
        "🎰 【大爷的特制幸运十连转盘】 🎰",
        "──────────────────",
        "📢 大爷举着喇叭喊：",
        "“往里走，往里瞧！",
        LOTTERY_SLOGAN_LINES[0],
        LOTTERY_SLOGAN_LINES[1],
        `${totalCost}${currency}十连下去，场面马上热起来！”`,
        "──────────────────",
        "🌀 轮盘正在连续旋转：[ 📱 | 💵 | 🚗 | 🪙 | ⌚ | ❌ ] x10",
        `⏳ ${displayName} 正在等十次指针停下……`,
    ].join("\n");
}

function getBigSmallRoundKey(groupId) {
    return `bigsmallRound:${groupId}`;
}

function getBigSmallRound(groupId) {
    const round = storageGetJsonObject(getBigSmallRoundKey(groupId));
    if (!round || round.groupId !== groupId || !round.bankerId) return null;
    if (!Array.isArray(round.bets)) round.bets = [];
    if (!Array.isArray(round.dice)) round.dice = [];
    return round;
}

function setBigSmallRound(groupId, round) {
    storageSetJsonObject(getBigSmallRoundKey(groupId), round);
}

function clearBigSmallRound(groupId) {
    ext.storageSet(getBigSmallRoundKey(groupId), "");
}

function getBigSmallBetSeconds() {
    return Math.max(1, getIntConfig("买大小下注时间秒", 60));
}

function getBigSmallPayoutMultiplier() {
    return Math.max(0, getFloatConfig("买大小返还倍率", 2.0));
}

function formatBigSmallSide(side) {
    if (side === "big") return "大";
    if (side === "small") return "小";
    return "庄家通杀";
}

function getBigSmallOutcome(total) {
    if (total === 7) return "seven";
    if (total >= 2 && total <= 6) return "small";
    return "big";
}

function rollBigSmallDice() {
    const d1 = randomInt(6) + 1;
    const d2 = randomInt(6) + 1;
    const total = d1 + d2;
    return { dice: [d1, d2], total, outcome: getBigSmallOutcome(total) };
}

function getBigSmallBetStats(round) {
    const stats = {
        bigCount: 0,
        bigAmount: 0,
        smallCount: 0,
        smallAmount: 0,
        totalAmount: 0,
    };
    const bets = Array.isArray(round.bets) ? round.bets : [];
    for (const bet of bets) {
        const amount = Math.max(0, Math.floor(Number(bet.amount) || 0));
        if (bet.side === "big") {
            stats.bigCount += 1;
            stats.bigAmount += amount;
        } else if (bet.side === "small") {
            stats.smallCount += 1;
            stats.smallAmount += amount;
        }
        stats.totalAmount += amount;
    }
    return stats;
}

function getBigSmallRoundStatusText(round) {
    const currency = getStringConfig("货币名", "金币");
    const stats = getBigSmallBetStats(round);
    const remaining = Math.max(0, Math.ceil((Number(round.endAt || 0) - Date.now()) / 1000));
    return [
        "当前已有一局买大小正在下注。",
        `庄家：${round.bankerName || round.bankerId}`,
        `剩余时间：${remaining}秒`,
        `买大：${stats.bigCount} 人，共 ${stats.bigAmount}${currency}`,
        `买小：${stats.smallCount} 人，共 ${stats.smallAmount}${currency}`,
        "下注：.买大 50 / .买小 50",
    ].join("\n");
}

function parseBigSmallBetAmount(cmdArgs) {
    const text = parseInputText(cmdArgs);
    const defaultBet = Math.max(1, getIntConfig("买大小默认下注", 10));
    const minBet = Math.max(1, getIntConfig("买大小最小下注", 1));
    const maxBet = Math.max(minBet, getIntConfig("买大小最大下注", 1000));

    if (!text) {
        return { ok: true, amount: defaultBet };
    }
    if (!/^\d+$/.test(text)) {
        return { ok: false, reason: "下注金额必须是数字。\n示例：.买大 50" };
    }

    const amount = Number.parseInt(text, 10);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        return { ok: false, reason: "下注金额必须大于 0。" };
    }
    if (amount < minBet) {
        return { ok: false, reason: `下注金额不能低于 ${minBet}。` };
    }
    if (amount > maxBet) {
        return { ok: false, reason: `下注金额不能高于 ${maxBet}。` };
    }
    return { ok: true, amount };
}

function getBigSmallHelpText() {
    const currency = getStringConfig("货币名", "金币");
    const defaultBet = Math.max(1, getIntConfig("买大小默认下注", 10));
    const minBet = Math.max(1, getIntConfig("买大小最小下注", 1));
    const maxBet = Math.max(minBet, getIntConfig("买大小最大下注", 1000));
    const seconds = getBigSmallBetSeconds();
    const multiplier = getBigSmallPayoutMultiplier();
    return [
        "骰子买大小",
        ".买大小：开一局，开局者成为庄家",
        `.买大：投入默认金额 ${defaultBet}${currency}`,
        `.买大 50 / .买大50：买大 50${currency}`,
        `.买小 50 / .买小50：买小 50${currency}`,
        `下注时间：${seconds}秒`,
        "结果：2-6 为小，8-12 为大，7 为庄家通杀",
        `买中返还：下注 * ${formatNumber(multiplier)}，包含本金`,
        `下注范围：${minBet}-${maxBet}${currency}`,
    ].join("\n");
}

function getBlackjackRoundKey(groupId) {
    return `blackjackRound:${groupId}`;
}

function getBlackjackRound(groupId) {
    const round = storageGetJsonObject(getBlackjackRoundKey(groupId));
    if (!round || round.groupId !== groupId || !Array.isArray(round.players)) return null;
    if (!Array.isArray(round.deck)) round.deck = createBlackjackDeck();
    round.players.forEach((player, index) => {
        if (!Array.isArray(player.hand)) player.hand = [];
        player.bet = Math.max(0, Math.floor(Number(player.bet) || 0));
        player.isDealer = index === 0 || player.userId === round.dealerId;
        player.busted = Boolean(player.busted);
        player.stood = Boolean(player.stood);
    });
    round.pot = getBlackjackPot(round);
    return round;
}

function setBlackjackRound(groupId, round) {
    round.updatedAt = Date.now();
    round.pot = getBlackjackPot(round);
    storageSetJsonObject(getBlackjackRoundKey(groupId), round);
}

function clearBlackjackRound(groupId) {
    ext.storageSet(getBlackjackRoundKey(groupId), "");
}

function createBlackjackDeck() {
    const deck = [];
    for (const suit of BLACKJACK_SUITS) {
        for (const rank of BLACKJACK_RANKS) {
            deck.push({ suit, rank, marked: false });
        }
    }
    return deck;
}

function resetBlackjackDeck(round) {
    round.deck = createBlackjackDeck();
}

function dealBlackjackCard(round, player) {
    if (!Array.isArray(round.deck) || round.deck.length <= 0) resetBlackjackDeck(round);
    const available = round.deck.filter(card => !card.marked);
    if (available.length <= 0) {
        resetBlackjackDeck(round);
        return dealBlackjackCard(round, player);
    }
    const card = available[randomInt(available.length)];
    card.marked = true;
    const dealt = { suit: card.suit, rank: card.rank };
    player.hand.push(dealt);
    return dealt;
}

function formatBlackjackCard(card) {
    if (!card) return "未知";
    return `${card.suit}${card.rank}`;
}

function formatBlackjackHand(hand) {
    if (!Array.isArray(hand) || hand.length <= 0) return "无牌";
    return hand.map(formatBlackjackCard).join(" ");
}

function getBlackjackHandValue(hand) {
    let value = 0;
    let aces = 0;
    for (const card of hand || []) {
        if (card.rank === "A") {
            aces += 1;
            value += 11;
        } else if (card.rank === "K" || card.rank === "Q" || card.rank === "J") {
            value += 10;
        } else {
            value += Number.parseInt(card.rank, 10) || 0;
        }
    }
    while (value > 21 && aces > 0) {
        value -= 10;
        aces -= 1;
    }
    return value;
}

function getBlackjackPot(round) {
    if (!round || !Array.isArray(round.players)) return 0;
    return round.players.reduce((sum, player) => sum + Math.max(0, Math.floor(Number(player.bet) || 0)), 0);
}

function findBlackjackPlayer(round, userId) {
    if (!round || !Array.isArray(round.players)) return null;
    return round.players.find(player => player.userId === userId) || null;
}

function getBlackjackDealer(round) {
    return round && Array.isArray(round.players) ? round.players[0] : null;
}

function getBlackjackIdlePlayers(round) {
    if (!round || !Array.isArray(round.players)) return [];
    return round.players.filter(player => !player.isDealer);
}

function getBlackjackWaitSeconds() {
    return Math.max(0, getIntConfig("21点消息间隔秒", 1));
}

function parseBlackjackBetAmount(text) {
    const currency = getStringConfig("货币名", "金币");
    const raw = String(text || "").trim();
    const defaultBet = Math.max(1, getIntConfig("21点默认下注", 10));
    const minBet = Math.max(1, getIntConfig("21点最小下注", 1));
    const maxBet = Math.max(minBet, getIntConfig("21点最大下注", 1000));
    const amountText = raw || String(defaultBet);

    if (!/^\d+$/.test(amountText)) {
        return { ok: false, reason: "下注金额必须是数字。\n示例：.bj bet 50" };
    }
    const amount = Number.parseInt(amountText, 10);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        return { ok: false, reason: "下注金额必须大于 0。" };
    }
    if (amount < minBet) {
        return { ok: false, reason: `下注金额不能低于 ${minBet}${currency}。` };
    }
    if (amount > maxBet) {
        return { ok: false, reason: `下注金额不能高于 ${maxBet}${currency}。` };
    }
    return { ok: true, amount };
}

function getBlackjackHelpText() {
    const currency = getStringConfig("货币名", "金币");
    const defaultBet = Math.max(1, getIntConfig("21点默认下注", 10));
    const minBet = Math.max(1, getIntConfig("21点最小下注", 1));
    const maxBet = Math.max(minBet, getIntConfig("21点最大下注", 1000));
    return [
        "21点",
        ".bj start / .21点 开始：开启牌桌，开局者成为庄家",
        ".bj join / .21点 加入：加入本群牌桌",
        ".bj bet 50 / .21点 下注50：下注",
        ".bj open / .21点 发牌：庄家发牌并锁定加入",
        ".bj hit / .21点 要牌：摸一张牌",
        ".bj stand / .21点 停牌：结束自己的操作",
        ".bj status / .21点 状态：查看本局状态",
        ".bj end / .21点 结束：庄家结束未发牌的牌桌",
        `默认下注：${defaultBet}${currency}`,
        `下注范围：${minBet}-${maxBet}${currency}`,
        "胜者获得本局奖池。所有人爆牌时，奖池归庄家。",
    ].join("\n");
}

function parseBlackjackAction(cmdArgs) {
    const text = parseInputText(cmdArgs).trim();
    if (!text || isHelpText(text)) return { action: "help", rest: "" };

    const parts = text.split(/\s+/);
    const first = parts[0];
    const firstLower = first.toLowerCase();
    const rest = parts.slice(1).join(" ").trim();
    const exact = {
        start: "start",
        "开始": "start",
        "创建": "start",
        "开桌": "start",
        "开局": "start",
        join: "join",
        "加入": "join",
        "进桌": "join",
        bet: "bet",
        "下注": "bet",
        "押注": "bet",
        open: "open",
        "发牌": "open",
        "开牌": "open",
        "开本局": "open",
        "开始本局": "open",
        hit: "hit",
        "要牌": "hit",
        "摸牌": "hit",
        stand: "stand",
        "停牌": "stand",
        "不要": "stand",
        "过": "stand",
        status: "status",
        "状态": "status",
        chips: "chips",
        "筹码": "chips",
        "余额": "chips",
        exit: "exit",
        "退出": "exit",
        "离开": "exit",
        end: "end",
        "结束": "end",
        "解散": "end",
    };
    if (exact[firstLower]) return { action: exact[firstLower], rest };
    if (exact[first]) return { action: exact[first], rest };

    const betPrefixes = ["bet", "下注", "押注"];
    for (const prefix of betPrefixes) {
        if (firstLower.startsWith(prefix) || first.startsWith(prefix)) {
            const amount = first.slice(prefix.length).trim();
            const suffix = [amount, rest].filter(Boolean).join(" ").trim();
            return { action: "bet", rest: suffix };
        }
    }
    return { action: "unknown", rest: text };
}

function replyBlackjackUseBlocked(ctx, msg, userId, actionText) {
    if (replyWorkBlocked(ctx, msg, userId, actionText)) return true;
    return replyDebtBlocked(ctx, msg, userId, actionText);
}

function sendBlackjackPrivate(ctx, msg, userId, text) {
    try {
        if (typeof seal.createTempCtx === "function") {
            const privateCtx = seal.createTempCtx(ctx, userId);
            if (privateCtx) {
                seal.replyToSender(privateCtx, { rawId: userId, sender: { userId } }, text);
                return true;
            }
        }
    } catch (e) {}

    try {
        if (typeof seal.replyPerson === "function" && getUserId(ctx, msg) === userId) {
            seal.replyPerson(ctx, msg, text);
            return true;
        }
    } catch (e) {}
    return false;
}

async function blackjackWait() {
    const seconds = getBlackjackWaitSeconds();
    if (seconds > 0) await sleep(seconds * 1000);
}

function promptBlackjackPlayer(ctx, msg, round) {
    const player = round.players[round.currentPlayerIndex];
    if (!player) return;
    seal.replyToSender(ctx, msg, [
        `轮到 ${player.name} 操作。`,
        "请选择：.bj hit 要牌 / .bj stand 停牌",
    ].join("\n"));
}

function prepareBlackjackNextRound(round) {
    for (const player of round.players) {
        player.hand = [];
        player.bet = 0;
        player.busted = false;
        player.stood = false;
    }
    round.phase = "betting";
    round.joinLocked = false;
    round.currentPlayerIndex = -1;
    round.pot = 0;
    resetBlackjackDeck(round);
}

function settleBlackjackRound(ctx, msg, groupId, round) {
    const currency = getStringConfig("货币名", "金币");
    const pot = getBlackjackPot(round);
    const validPlayers = round.players.filter(player => !player.busted);
    let winner = null;
    let winnerValue = -1;
    let allBusted = false;

    if (validPlayers.length <= 0) {
        winner = getBlackjackDealer(round);
        allBusted = true;
    } else {
        for (const player of validPlayers) {
            const value = getBlackjackHandValue(player.hand);
            if (value > winnerValue) {
                winnerValue = value;
                winner = player;
            }
        }
    }

    if (winner && pot > 0) {
        applyIncome(winner.userId, pot);
    }

    const details = round.players.map((player, index) => {
        const value = getBlackjackHandValue(player.hand);
        const marks = [];
        if (player.busted) marks.push("爆牌");
        if (player.stood) marks.push("停牌");
        const suffix = marks.length > 0 ? ` [${marks.join("，")}]` : "";
        return `[${index + 1}] ${player.name}${player.isDealer ? "(庄)" : ""}：${formatBlackjackHand(player.hand)} = ${value}点${suffix}`;
    });

    const lines = [
        "🃏 【21点结算】",
        `奖池：${pot}${currency}`,
        ...details,
    ];
    if (allBusted) {
        lines.push(`所有人爆牌，奖池归庄家 ${winner ? winner.name : "庄家"}。`);
    } else {
        lines.push(`胜者：${winner ? winner.name : "无"}，获得 ${pot}${currency}。`);
    }
    lines.push("净变化：");
    for (const player of round.players) {
        const net = winner && winner.userId === player.userId ? pot - player.bet : -player.bet;
        const prefix = net >= 0 ? "+" : "";
        lines.push(`${player.name}${player.isDealer ? "(庄)" : ""}：${prefix}${net}${currency}，余额 ${getWallet(player.userId)}${currency}`);
    }

    prepareBlackjackNextRound(round);
    setBlackjackRound(groupId, round);
    lines.push("本桌保留。从庄家重新下注开始，新玩家仍可加入。");
    seal.replyToSender(ctx, msg, lines.join("\n"));
}

async function openBlackjackRound(ctx, msg, groupId, round) {
    const currency = getStringConfig("货币名", "金币");
    round.joinLocked = true;
    round.phase = "dealing";
    round.currentPlayerIndex = -1;
    round.pot = getBlackjackPot(round);
    resetBlackjackDeck(round);
    for (const player of round.players) {
        player.hand = [];
        player.busted = false;
        player.stood = false;
        dealBlackjackCard(round, player);
        dealBlackjackCard(round, player);
    }
    setBlackjackRound(groupId, round);

    const order = round.players.map((player, index) => `${index + 1}.${player.name}${player.isDealer ? "(庄)" : ""}`).join(" > ");
    seal.replyToSender(ctx, msg, [
        "🃏 【21点开牌】",
        `奖池：${round.pot}${currency}`,
        `操作顺序：${order}`,
    ].join("\n"));

    for (const player of round.players) {
        const value = getBlackjackHandValue(player.hand);
        const privateText = [
            "【21点手牌】",
            `你的手牌：${formatBlackjackHand(player.hand)}`,
            `当前点数：${value}`,
        ].join("\n");
        const sent = sendBlackjackPrivate(ctx, msg, player.userId, privateText);
        if (sent) {
            seal.replyToSender(ctx, msg, `${player.name} 已收到手牌。`);
        } else {
            seal.replyToSender(ctx, msg, `${player.name} 私聊发送失败，手牌改在群内发送：${formatBlackjackHand(player.hand)}（${value}点）`);
        }
        await blackjackWait();
    }

    round.phase = "playing";
    round.currentPlayerIndex = 0;
    setBlackjackRound(groupId, round);
    promptBlackjackPlayer(ctx, msg, round);
}

function getBlackjackStatusText(round) {
    const currency = getStringConfig("货币名", "金币");
    const phaseName = {
        waiting: "等待加入",
        betting: "下注中",
        dealing: "发牌中",
        playing: "操作中",
    }[round.phase] || round.phase || "未知";
    const lines = [
        "21点牌桌状态",
        `庄家：${round.dealerName || round.dealerId}`,
        `阶段：${phaseName}`,
        `奖池：${getBlackjackPot(round)}${currency}`,
    ];
    round.players.forEach((player, index) => {
        const tags = [];
        if (player.isDealer) tags.push("庄");
        if (round.phase === "playing" && round.currentPlayerIndex === index) tags.push("当前");
        if (player.busted) tags.push("爆牌");
        if (player.stood) tags.push("停牌");
        const tagText = tags.length > 0 ? ` (${tags.join("，")})` : "";
        const handText = round.phase === "playing" ? `${player.hand.length}张牌` : "未发牌";
        lines.push(`${index + 1}. ${player.name}${tagText}：下注 ${player.bet}${currency}，${handText}`);
    });
    return lines.join("\n");
}

function scheduleBigSmallSettlement(ctx, msg, groupId, endAt) {
    if (typeof setTimeout !== "function") return;
    const delay = Math.max(0, Number(endAt || 0) - Date.now());
    setTimeout(() => {
        settleBigSmallRound(ctx, msg, groupId, "auto");
    }, delay);
}

function settleExpiredBigSmallRound(ctx, msg, groupId) {
    const round = getBigSmallRound(groupId);
    if (!round) return false;
    if (Date.now() < Number(round.endAt || 0)) return false;
    return settleBigSmallRound(ctx, msg, groupId, "expired");
}

function settleBigSmallRound(ctx, msg, groupId, reason) {
    const round = getBigSmallRound(groupId);
    if (!round) return false;

    clearBigSmallRound(groupId);

    const currency = getStringConfig("货币名", "金币");
    const dice = Array.isArray(round.dice) && round.dice.length >= 2 ? round.dice : [0, 0];
    const total = Number(round.total) || (Number(dice[0]) || 0) + (Number(dice[1]) || 0);
    const outcome = round.outcome || getBigSmallOutcome(total);
    const bets = Array.isArray(round.bets) ? round.bets : [];
    const totalBets = bets.reduce((sum, bet) => sum + Math.max(0, Math.floor(Number(bet.amount) || 0)), 0);
    const multiplier = getBigSmallPayoutMultiplier();
    let payoutTotal = 0;
    let bankerNet = 0;
    let debtAdded = 0;
    let bankerBalanceBefore = getWallet(round.bankerId);
    let bankerBalanceAfter = bankerBalanceBefore;
    let bankerPaidFromWallet = 0;
    const winners = [];

    if (outcome === "seven") {
        bankerNet = totalBets;
        const incomeResult = applyIncome(round.bankerId, bankerNet);
        bankerBalanceAfter = incomeResult.balanceAfter;
    } else {
        for (const bet of bets) {
            const amount = Math.max(0, Math.floor(Number(bet.amount) || 0));
            if (bet.side !== outcome) continue;
            const payout = Math.floor(amount * multiplier);
            payoutTotal += payout;
            setWallet(bet.userId, getWallet(bet.userId) + payout);
            winners.push({
                name: bet.name || bet.userId,
                amount,
                payout,
            });
        }

        bankerNet = totalBets - payoutTotal;
        if (bankerNet >= 0) {
            const incomeResult = applyIncome(round.bankerId, bankerNet);
            bankerBalanceAfter = incomeResult.balanceAfter;
        } else {
            const needPay = Math.abs(bankerNet);
            const paid = Math.min(bankerBalanceBefore, needPay);
            bankerPaidFromWallet = paid;
            setWallet(round.bankerId, bankerBalanceBefore - paid);
            bankerBalanceAfter = getWallet(round.bankerId);
            debtAdded = needPay - paid;
            if (debtAdded > 0) addDebt(round.bankerId, debtAdded);
        }
    }

    const resultText = outcome === "seven" ? "7 点，庄家通杀" : `${total} 点，${formatBigSmallSide(outcome)}`;
    const lines = [
        "🎲 【买大小开奖】",
        `庄家：${round.bankerName || round.bankerId}`,
        `暗骰：${dice[0]} + ${dice[1]} = ${total}`,
        `结果：${resultText}`,
        `本局赌资：${totalBets}${currency}`,
    ];

    if (outcome === "seven") {
        lines.push(`庄家获得本局全部赌资：${totalBets}${currency}`);
    } else {
        lines.push(`买中人数：${winners.length}`);
        lines.push(`返还合计：${payoutTotal}${currency}`);
        lines.push(`庄家收取下注池：${totalBets}${currency}`);
        lines.push(`庄家赔给中奖闲家：${payoutTotal}${currency}`);
        if (bankerNet >= 0) {
            lines.push(`庄家净收入：${bankerNet}${currency}`);
        } else {
            lines.push(`庄家净赔付：${Math.abs(bankerNet)}${currency}`);
            lines.push(`庄家钱包扣款：${bankerPaidFromWallet}${currency}`);
        }
        if (winners.length > 0) {
            const names = winners.slice(0, 10).map(item => `${item.name} ${item.amount}->${item.payout}`);
            lines.push(`买中：${names.join("，")}`);
            if (winners.length > 10) lines.push(`还有 ${winners.length - 10} 人买中。`);
        }
    }
    lines.push(`庄家余额：${bankerBalanceBefore}->${bankerBalanceAfter}${currency}`);
    if (debtAdded > 0) {
        lines.push(`庄家余额不足，新增欠债：${debtAdded}${currency}`);
    }
    if (reason === "expired") {
        lines.push("本局由下一次指令触发补开奖。");
    }

    seal.replyToSender(ctx, msg, lines.join("\n"));
    return true;
}

function parseInputText(cmdArgs) {
    if (!cmdArgs) return "";
    if (typeof cmdArgs.rawArgs === "string" && /\[CQ:at,/i.test(cmdArgs.rawArgs) && cmdArgs.rawArgs.trim()) return cmdArgs.rawArgs.trim();
    if (typeof cmdArgs.cleanArgs === "string" && cmdArgs.cleanArgs.trim()) return cmdArgs.cleanArgs.trim();
    if (typeof cmdArgs.rawArgs === "string" && cmdArgs.rawArgs.trim()) return cmdArgs.rawArgs.trim();
    if (Array.isArray(cmdArgs.args) && cmdArgs.args.length > 0) return cmdArgs.args.join(" ").trim();
    return "";
}

function isHelpText(text) {
    const value = String(text || "").trim().toLowerCase();
    return value === "help" || value === "帮助" || value === "说明" || value === "?";
}

function isEconomyAdmin(ctx) {
    const required = Math.max(100, getIntConfig("管理指令最低权限", 100));
    return Number(ctx && ctx.privilegeLevel || 0) >= required;
}

function replyAdminRequired(ctx, msg) {
    seal.replyToSender(ctx, msg, `权限不足，需要海豹管理员权限，权限等级 >= ${Math.max(100, getIntConfig("管理指令最低权限", 100))}。`);
}

function tokenizeArgsText(text) {
    return String(text || "").match(/\[CQ:[^\]]+\]|\S+/g) || [];
}

function userIdFromQQNumber(qq, senderId) {
    const normalizedQQ = String(qq || "").trim();
    const sender = String(senderId || "");
    if (!normalizedQQ) return "";
    if (/^\d+$/.test(sender)) return normalizedQQ;
    return `QQ:${normalizedQQ}`;
}

function parseTargetUserId(token, senderId) {
    const raw = String(token || "").trim();
    if (!raw) return "";
    if (raw === "我" || raw === "自己" || raw.toLowerCase() === "self") return senderId;

    const cqAt = raw.match(/\[CQ:at,[^\]]*qq=([^,\]]+)/i);
    if (cqAt) {
        const qq = cqAt[1];
        if (qq === "all") return "";
        return userIdFromQQNumber(qq, senderId);
    }

    const angleAt = raw.match(/^<@!?(.+)>$/);
    if (angleAt) return angleAt[1].trim();

    const qqId = raw.match(/^QQ:(\d{5,})$/i);
    if (qqId) return `QQ:${qqId[1]}`;

    const qqIdInside = raw.match(/(?:^|\s)QQ:(\d{5,})(?:\s|$)/i);
    if (qqIdInside) return `QQ:${qqIdInside[1]}`;

    const plainAt = raw.match(/^@?(\d{5,})$/);
    if (plainAt) return userIdFromQQNumber(plainAt[1], senderId);

    if (/^[A-Za-z][A-Za-z0-9_-]*:[^\s]+$/.test(raw)) return raw;

    return "";
}

function parsePositiveInteger(text, label) {
    const valueText = String(text || "").trim();
    if (!/^\d+$/.test(valueText)) return { ok: false, reason: `${label}必须是正整数。` };
    const value = Number.parseInt(valueText, 10);
    if (!Number.isSafeInteger(value) || value <= 0) return { ok: false, reason: `${label}必须大于 0。` };
    return { ok: true, amount: value };
}

function parseTargetAndAmount(text, senderId) {
    const tokens = tokenizeArgsText(text);
    if (tokens.length < 2) {
        return { ok: false, reason: "格式不对。\n示例：.转账 QQ:123456 50" };
    }

    const amountToken = tokens[tokens.length - 1];
    const amount = parsePositiveInteger(amountToken, "金额");
    if (!amount.ok) return amount;

    const targetToken = tokens.slice(0, tokens.length - 1).join(" ").trim();
    const targetId = parseTargetUserId(targetToken, senderId);
    if (!targetId) return { ok: false, reason: "没有识别到目标玩家。\n推荐格式：.转账 QQ:123456 50" };

    return { ok: true, targetId, amount: amount.amount };
}

function getCommunePending(userId) {
    return storageGetJsonObject(getCommunePendingKey(userId));
}

function setCommunePending(userId, pending) {
    storageSetJsonObject(getCommunePendingKey(userId), pending);
}

function clearCommunePending(userId) {
    ext.storageSet(getCommunePendingKey(userId), "");
}

function setCommuneLastSummary(userId, summary) {
    storageSetJsonObject(getCommuneLastSummaryKey(userId), {
        createdAt: Date.now(),
        summary: String(summary || ""),
    });
}

function getRecentCommuneLastSummary(userId) {
    const saved = storageGetJsonObject(getCommuneLastSummaryKey(userId));
    if (!saved || !saved.summary) return "";
    if (Date.now() - Number(saved.createdAt || 0) > 10 * 60 * 1000) return "";
    return String(saved.summary);
}

function getCommuneSnapshot() {
    migrateLegacyWalletCandidates();
    const users = getKnownWalletUsers();
    const rows = [];
    let total = 0;
    for (const userId of users) {
        const balance = getWallet(userId);
        if (balance <= 0) continue;
        total += balance;
        rows.push({ userId, name: getKnownWalletName(userId), balance });
    }
    rows.sort((a, b) => {
        if (b.balance !== a.balance) return b.balance - a.balance;
        return a.name.localeCompare(b.name);
    });
    return { rows, total };
}

function getCommuneSnapshotFromRows(rows) {
    migrateLegacyWalletCandidates();
    const unique = [];
    const nameMap = {};
    for (const row of rows || []) {
        const userId = normalizeUserId(row && row.userId);
        if (!userId || unique.indexOf(userId) >= 0) continue;
        unique.push(userId);
        if (row.name) nameMap[userId] = String(row.name);
    }

    const snapshotRows = [];
    let total = 0;
    for (const userId of unique) {
        const balance = getWallet(userId);
        if (balance <= 0) continue;
        total += balance;
        snapshotRows.push({ userId, name: nameMap[userId] || getKnownWalletName(userId), balance });
    }
    snapshotRows.sort((a, b) => {
        if (b.balance !== a.balance) return b.balance - a.balance;
        return a.name.localeCompare(b.name);
    });
    return { rows: snapshotRows, total };
}

function getWealthLeaderboard(limit) {
    migrateLegacyWalletCandidates();
    const users = getKnownWalletUsers();
    const rows = [];
    for (const userId of users) {
        const balance = getWallet(userId);
        const debt = getDebt(userId);
        if (balance <= 0 && debt <= 0) continue;
        rows.push({
            userId,
            name: getKnownWalletName(userId),
            balance,
            debt,
            net: balance - debt,
        });
    }
    rows.sort((a, b) => {
        if (b.net !== a.net) return b.net - a.net;
        if (b.balance !== a.balance) return b.balance - a.balance;
        return a.name.localeCompare(b.name);
    });
    return rows.slice(0, Math.max(1, Number(limit) || 10));
}

function makeConfirmCode() {
    return String(randomInt(9000) + 1000);
}

function parseWalletRegisterTargets(text, senderId) {
    const tokens = tokenizeArgsText(text);
    const targets = [];
    for (const token of tokens) {
        const targetId = parseTargetUserId(token, senderId);
        if (targetId && targets.indexOf(targetId) < 0) targets.push(targetId);
    }
    return targets;
}

function buildCommuneSeasonSummary(snapshot, clearedCount, clearedTotal, publicFundAfter, currency, dailyResetCount) {
    const rows = snapshot.rows || [];
    const balances = rows.map(row => row.balance).sort((a, b) => a - b);
    const average = rows.length > 0 ? Math.floor(clearedTotal / rows.length) : 0;
    const median = balances.length <= 0 ? 0 : balances[Math.floor((balances.length - 1) / 2)];
    const richest = rows[0] || null;
    const poorest = rows[rows.length - 1] || null;
    const topRows = rows.slice(0, 5);
    const detailRows = rows.length <= 12 ? rows : rows.slice(0, 10);
    const hiddenCount = Math.max(0, rows.length - detailRows.length);
    const topTotal = topRows.reduce((sum, row) => sum + row.balance, 0);
    const topShare = clearedTotal > 0 ? Math.round(topTotal * 100 / clearedTotal) : 0;

    let comment = "本赛季资产流动平稳，金币完成了一次整齐归队。";
    if (rows.length >= 3 && richest && richest.balance >= Math.max(1, average * 3)) {
        comment = `${richest.name} 扛起了本赛季的资产大旗，单人余额拉高了全服平均线。`;
    } else if (rows.length >= 3 && topShare >= 70) {
        comment = `财富集中在前 ${topRows.length} 名玩家手里，榜首梯队拿走了 ${topShare}% 的余额。`;
    } else if (rows.length >= 5 && richest && poorest && richest.balance - poorest.balance <= Math.max(100, average)) {
        comment = "本赛季贫富差距不大，大家的钱包都保持在相近区间。";
    }

    const lines = [
        "🤖【dc模拟器 AI 赛季总结】",
        "本赛季资产清算完成。",
        `参与清算钱包：${clearedCount} 个`,
        `赛季总资产：${clearedTotal}${currency}`,
        `人均余额：${average}${currency}`,
        `中位余额：${median}${currency}`,
    ];
    if (richest) lines.push(`赛季首富：${richest.name}，${richest.balance}${currency}`);
    lines.push(`赛季评语：${comment}`);
    lines.push("资产明细：");
    detailRows.forEach((row, index) => {
        lines.push(`${index + 1}. ${row.name}：${row.balance}${currency}`);
    });
    if (hiddenCount > 0) lines.push(`还有 ${hiddenCount} 个钱包已纳入清算。`);
    lines.push(`本次充公：${clearedTotal}${currency}`);
    lines.push(`当前公款：${publicFundAfter}${currency}`);
    lines.push(`今日低保计数已重置：${Math.max(0, Number(dailyResetCount) || 0)} 个钱包`);
    lines.push("新赛季已开启，所有已记录钱包余额归零。");
    return lines.join("\n");
}

function replyLongMessage(ctx, msg, text, limit) {
    const maxLen = Math.max(200, Number(limit) || 900);
    const lines = String(text || "").split("\n");
    let buffer = "";
    for (const line of lines) {
        const next = buffer ? `${buffer}\n${line}` : line;
        if (next.length > maxLen && buffer) {
            seal.replyToSender(ctx, msg, buffer);
            buffer = line;
        } else {
            buffer = next;
        }
    }
    if (buffer) seal.replyToSender(ctx, msg, buffer);
}

function parseBetAmount(cmdArgs) {
    const text = parseInputText(cmdArgs);
    const defaultBet = Math.max(1, getIntConfig("默认下注", 10));
    const minBet = Math.max(1, getIntConfig("最小下注", 1));
    const maxBet = Math.max(minBet, getIntConfig("最大下注", 1000));

    if (!text) {
        return { ok: true, amount: defaultBet };
    }
    if (!/^\d+$/.test(text)) {
        return { ok: false, reason: `下注金额必须是数字。\n示例：.老虎机 50` };
    }

    const amount = Number.parseInt(text, 10);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        return { ok: false, reason: "下注金额必须大于 0。" };
    }
    if (amount < minBet) {
        return { ok: false, reason: `下注金额不能低于 ${minBet}。` };
    }
    if (amount > maxBet) {
        return { ok: false, reason: `下注金额不能高于 ${maxBet}。` };
    }
    return { ok: true, amount };
}

function getHelpText() {
    const currency = getStringConfig("货币名", "金币");
    const dailyAmount = Math.max(0, getIntConfig("每日低保金额", 100));
    const dailyLimit = Math.max(0, getIntConfig("每日低保次数", 3));
    const defaultBet = Math.max(1, getIntConfig("默认下注", 10));
    const minBet = Math.max(1, getIntConfig("最小下注", 1));
    const maxBet = Math.max(minBet, getIntConfig("最大下注", 1000));
    const workIncome = Math.max(0, getIntConfig("打工每分钟收益", 10));
    const lotteryCost = Math.max(0, getIntConfig("抽奖消耗金额", 200));
    return [
        "dc模拟器",
        `.低保：领取每日低保，每天 ${dailyLimit} 次，每次 ${dailyAmount}${currency}`,
        `.余额：查看当前余额`,
        `.财富榜：查看全服钱包财富前 10`,
        `.转账 QQ:123456 50：给其他玩家转账 50${currency}`,
        `.钱包登记：把自己登记进一键共产清算名单`,
        `.钱包迁移：自动扫描旧群友钱包候选`,
        `.打工：查看打工状态`,
        `.打工开始：开始打工`,
        `.打工结束：按完整分钟结算，每分钟 ${workIncome}${currency}`,
        `打工期间不能玩老虎机、抽奖和买大小`,
        `.老虎机：投入默认金额 ${defaultBet}${currency}`,
        `.老虎机 50：投入 50${currency}`,
        `.老虎机50：投入 50${currency}`,
        `下注范围：${minBet}-${maxBet}${currency}`,
        `.抽奖：花费 ${lotteryCost}${currency} 转一次大爷幸运大转盘`,
        `.十连抽奖：连续抽 10 次，花费 ${lotteryCost * 10}${currency}`,
        `.买大小：开一局骰子买大小`,
        `.买大 50 / .买小50：下注买大或买小`,
        `.加钱 / .一键共产：管理工具`,
        `.时髦值：查看当前时髦值`,
        `.时髦榜：查看本群时髦值前 10`,
    ].join("\n");
}

function replyMissingUser(ctx, msg) {
    seal.replyToSender(ctx, msg, "无法识别玩家 ID，暂时不能使用经济系统。");
}

const cmdDaily = seal.ext.newCmdItemInfo();
cmdDaily.name = "低保";
cmdDaily.help = getHelpText();
cmdDaily.solve = (ctx, msg) => {
    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const dailyAmount = Math.max(0, getIntConfig("每日低保金额", 100));
    const dailyLimit = Math.max(0, getIntConfig("每日低保次数", 3));
    const claimed = getDailyClaimCount(userId);

    if (dailyLimit <= 0 || dailyAmount <= 0) {
        seal.replyToSender(ctx, msg, "今日低保暂未开放。");
        return seal.ext.newCmdExecuteResult(true);
    }
    if (claimed >= dailyLimit) {
        seal.replyToSender(ctx, msg, [
            "今天的低保已经领完了。",
            `当前余额：${getWallet(userId)}${currency}`,
            `当前欠债：${getDebt(userId)}${currency}`,
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    const incomeResult = applyIncome(userId, dailyAmount);
    const newClaimed = claimed + 1;
    setDailyClaimCount(userId, newClaimed);

    const replyLines = [
        `领取了 ${dailyAmount}${currency} 低保。`,
    ];
    if (incomeResult.paidDebt > 0) {
        replyLines.push(`偿还欠债：${incomeResult.paidDebt}${currency}`);
        if (incomeResult.walletAdded > 0) replyLines.push(`剩余入账：${incomeResult.walletAdded}${currency}`);
    }
    replyLines.push(
        `当前余额：${incomeResult.balanceAfter}${currency}`,
        `当前欠债：${incomeResult.debtAfter}${currency}`,
        `今日低保剩余：${Math.max(0, dailyLimit - newClaimed)} 次`,
    );
    seal.replyToSender(ctx, msg, replyLines.join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

const cmdBalance = seal.ext.newCmdItemInfo();
cmdBalance.name = "余额";
cmdBalance.help = "查看 dc模拟器余额。\n用法：.余额";
cmdBalance.solve = (ctx, msg) => {
    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    rememberWalletUser(ctx, msg, userId);
    const currency = getStringConfig("货币名", "金币");
    seal.replyToSender(ctx, msg, [
        `当前余额：${getWallet(userId)}${currency}`,
        `当前欠债：${getDebt(userId)}${currency}`,
    ].join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

const cmdWealthRank = seal.ext.newCmdItemInfo();
cmdWealthRank.name = "财富榜";
cmdWealthRank.help = "查看全服钱包财富排行榜。\n用法：.财富榜 / .余额榜";
cmdWealthRank.solve = (ctx, msg) => {
    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    rememberWalletUser(ctx, msg, userId);
    const currency = getStringConfig("货币名", "金币");
    const rows = getWealthLeaderboard(10);
    if (rows.length <= 0) {
        seal.replyToSender(ctx, msg, "当前还没有可展示的钱包余额。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const lines = ["全服财富榜"];
    rows.forEach((row, index) => {
        const parts = [`${index + 1}. ${formatKnownUser(row.userId)}`];
        parts.push(`余额 ${row.balance}${currency}`);
        if (row.debt > 0) parts.push(`欠债 ${row.debt}${currency}`);
        if (row.debt > 0) parts.push(`净资产 ${row.net}${currency}`);
        lines.push(parts.join("，"));
    });
    seal.replyToSender(ctx, msg, lines.join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

const cmdWalletRegister = seal.ext.newCmdItemInfo();
cmdWalletRegister.name = "钱包登记";
cmdWalletRegister.help = [
    "登记钱包索引，让一键共产能识别旧钱包。",
    "用法：.钱包登记",
    "管理员批量登记：.钱包登记 QQ:123456 QQ:654321",
].join("\n");
cmdWalletRegister.solve = (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    if (isHelpText(inputText)) {
        seal.replyToSender(ctx, msg, cmdWalletRegister.help);
        return seal.ext.newCmdExecuteResult(true);
    }

    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    if (!inputText) {
        rememberWalletUser(ctx, msg, userId);
        seal.replyToSender(ctx, msg, [
            "已登记你的钱包。",
            `当前余额：${getWallet(userId)}${currency}`,
            `当前一键共产可识别钱包数：${getKnownWalletUsers().length}`,
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    if (!isEconomyAdmin(ctx)) {
        seal.replyToSender(ctx, msg, "只有管理员可以批量登记其他人的钱包。\n普通玩家发送 .钱包登记 登记自己。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const targets = parseWalletRegisterTargets(inputText, userId);
    if (targets.length <= 0) {
        seal.replyToSender(ctx, msg, "没有识别到要登记的钱包。\n示例：.钱包登记 QQ:123456 QQ:654321");
        return seal.ext.newCmdExecuteResult(true);
    }

    for (const targetId of targets) {
        rememberWalletUserId(targetId);
    }
    seal.replyToSender(ctx, msg, [
        `已登记 ${targets.length} 个钱包。`,
        `当前一键共产可识别钱包数：${getKnownWalletUsers().length}`,
        `示例：${targets.slice(0, 5).join("，")}`,
    ].join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

const cmdWalletMigrate = seal.ext.newCmdItemInfo();
cmdWalletMigrate.name = "钱包迁移";
cmdWalletMigrate.help = "管理员工具：扫描旧版群友钱包候选并写入钱包索引。\n用法：.钱包迁移";
cmdWalletMigrate.solve = (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    if (isHelpText(inputText)) {
        seal.replyToSender(ctx, msg, cmdWalletMigrate.help);
        return seal.ext.newCmdExecuteResult(true);
    }
    if (!isEconomyAdmin(ctx)) {
        replyAdminRequired(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const result = migrateLegacyWalletCandidates();
    const snapshot = getCommuneSnapshot();
    const topRows = snapshot.rows.slice(0, 8).map(row => `${row.name}：${row.balance}${currency}`);
    const lines = [
        "旧钱包候选扫描完成。",
        `扫描候选：${result.scanned} 个`,
        `发现有余额钱包：${result.positiveCount} 个`,
        `旧钱包余额合计：${result.positiveTotal}${currency}`,
        `当前一键共产可清算钱包：${snapshot.rows.length} 个`,
        `当前可清算总额：${snapshot.total}${currency}`,
    ];
    if (topRows.length > 0) lines.push(`余额名单：${topRows.join("，")}`);
    if (snapshot.rows.length > 8) lines.push(`还有 ${snapshot.rows.length - 8} 个钱包。`);
    seal.replyToSender(ctx, msg, lines.join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

const cmdTransfer = seal.ext.newCmdItemInfo();
cmdTransfer.name = "转账";
cmdTransfer.help = "给其他玩家转账。\n用法：.转账 QQ:123456 50";
cmdTransfer.solve = (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    if (isHelpText(inputText)) {
        seal.replyToSender(ctx, msg, cmdTransfer.help);
        return seal.ext.newCmdExecuteResult(true);
    }

    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }
    rememberWalletUser(ctx, msg, userId);
    if (replyDebtBlocked(ctx, msg, userId, "转账")) {
        return seal.ext.newCmdExecuteResult(true);
    }

    const parsed = parseTargetAndAmount(inputText, userId);
    if (!parsed.ok) {
        seal.replyToSender(ctx, msg, parsed.reason);
        return seal.ext.newCmdExecuteResult(true);
    }
    if (parsed.targetId === userId) {
        seal.replyToSender(ctx, msg, "不能给自己转账。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const balance = getWallet(userId);
    if (balance < parsed.amount) {
        seal.replyToSender(ctx, msg, [
            `余额不足，当前余额：${balance}${currency}`,
            `本次转账需要：${parsed.amount}${currency}`,
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    setWallet(userId, balance - parsed.amount);
    const incomeResult = applyIncome(parsed.targetId, parsed.amount);
    const lines = [
        `转账成功：${parsed.amount}${currency}`,
        `收款人：${formatKnownUser(parsed.targetId)}`,
        `你的余额：${getWallet(userId)}${currency}`,
    ];
    if (incomeResult.paidDebt > 0) {
        lines.push(`对方自动还债：${incomeResult.paidDebt}${currency}`);
        if (incomeResult.walletAdded > 0) lines.push(`对方剩余入账：${incomeResult.walletAdded}${currency}`);
    }
    lines.push(`对方余额：${incomeResult.balanceAfter}${currency}`);
    if (incomeResult.debtAfter > 0) lines.push(`对方欠债：${incomeResult.debtAfter}${currency}`);
    seal.replyToSender(ctx, msg, lines.join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

const cmdAdminAddMoney = seal.ext.newCmdItemInfo();
cmdAdminAddMoney.name = "加钱";
cmdAdminAddMoney.help = "海豹管理员工具：给玩家增加余额。\n用法：.加钱 QQ:123456 100 / .发钱 QQ:123456 100";
cmdAdminAddMoney.solve = (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    if (isHelpText(inputText)) {
        seal.replyToSender(ctx, msg, cmdAdminAddMoney.help);
        return seal.ext.newCmdExecuteResult(true);
    }
    if (!isEconomyAdmin(ctx)) {
        replyAdminRequired(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const senderId = getUserId(ctx, msg);
    const parsed = parseTargetAndAmount(inputText, senderId);
    if (!parsed.ok) {
        seal.replyToSender(ctx, msg, parsed.reason.replace("转账", "加钱"));
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const before = getWallet(parsed.targetId);
    setWallet(parsed.targetId, before + parsed.amount);
    seal.replyToSender(ctx, msg, [
        `已给 ${formatKnownUser(parsed.targetId)} 增加 ${parsed.amount}${currency}。`,
        `原余额：${before}${currency}`,
        `当前余额：${getWallet(parsed.targetId)}${currency}`,
    ].join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

const cmdPublicFund = seal.ext.newCmdItemInfo();
cmdPublicFund.name = "公款";
cmdPublicFund.help = "查看一键共产充公累计金额。\n用法：.公款";
cmdPublicFund.solve = (ctx, msg) => {
    const currency = getStringConfig("货币名", "金币");
    seal.replyToSender(ctx, msg, `当前公款：${getPublicFund()}${currency}`);
    return seal.ext.newCmdExecuteResult(true);
};

const cmdCommune = seal.ext.newCmdItemInfo();
cmdCommune.name = "一键共产";
cmdCommune.help = [
    "管理工具：清空所有已记录钱包余额并充公。",
    "用法：.一键共产",
    "确认：.一键共产 确认 <确认码>",
].join("\n");
cmdCommune.solve = (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }
    if (!isEconomyAdmin(ctx)) {
        replyAdminRequired(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }
    if (isHelpText(inputText)) {
        seal.replyToSender(ctx, msg, cmdCommune.help);
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const tokens = tokenizeArgsText(inputText);
    if (tokens[0] === "确认") {
        const pending = getCommunePending(userId);
        if (!pending || Date.now() > Number(pending.expireAt || 0)) {
            clearCommunePending(userId);
            const recentSummary = getRecentCommuneLastSummary(userId);
            if (recentSummary) {
                replyLongMessage(ctx, msg, `上一轮一键共产已经执行，下面重发总结：\n${recentSummary}`);
                return seal.ext.newCmdExecuteResult(true);
            }
            seal.replyToSender(ctx, msg, "没有待确认的一键共产操作，或确认已过期。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (String(tokens[1] || "") !== String(pending.code || "")) {
            seal.replyToSender(ctx, msg, "确认码不对，本次操作没有执行。");
            return seal.ext.newCmdExecuteResult(true);
        }

        const pendingRows = Array.isArray(pending.rows) ? pending.rows : [];
        const snapshot = pendingRows.length > 0 ? getCommuneSnapshotFromRows(pendingRows) : getCommuneSnapshot();
        let clearedTotal = 0;
        let clearedCount = 0;
        for (const row of snapshot.rows) {
            const balance = getWallet(row.userId);
            if (balance <= 0) continue;
            clearedTotal += balance;
            clearedCount += 1;
            setWallet(row.userId, 0);
        }
        const dailyResetCount = resetDailyClaimsForKnownWallets(snapshot.rows);
        const publicFund = addPublicFund(clearedTotal);
        const summary = buildCommuneSeasonSummary(snapshot, clearedCount, clearedTotal, publicFund, currency, dailyResetCount);
        setCommuneLastSummary(userId, summary);
        clearCommunePending(userId);
        replyLongMessage(ctx, msg, summary);
        return seal.ext.newCmdExecuteResult(true);
    }

    const snapshot = getCommuneSnapshot();
    if (snapshot.rows.length <= 0 || snapshot.total <= 0) {
        seal.replyToSender(ctx, msg, "当前没有可清空的已记录余额。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const code = makeConfirmCode();
    setCommunePending(userId, {
        code,
        createdAt: Date.now(),
        expireAt: Date.now() + 60000,
        total: snapshot.total,
        count: snapshot.rows.length,
        rows: snapshot.rows.map(row => ({
            userId: row.userId,
            name: row.name,
            balance: row.balance,
        })),
    });

    const topRows = snapshot.rows.slice(0, 5).map(row => `${row.name}：${row.balance}${currency}`);
    const lines = [
        "即将清空所有已记录钱包余额，并把余额充公。",
        `涉及钱包：${snapshot.rows.length} 个`,
        `预计充公：${snapshot.total}${currency}`,
        `当前公款：${getPublicFund()}${currency}`,
        `前几名：${topRows.join("，")}`,
        "确认后会输出 AI 赛季总结，然后清空余额。",
        `60 秒内发送：.一键共产 确认 ${code}`,
    ];
    if (snapshot.rows.length > 5) lines.splice(5, 0, `还有 ${snapshot.rows.length - 5} 个钱包。`);
    seal.replyToSender(ctx, msg, lines.join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

function solveWorkStart(ctx, msg) {
    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const start = getWorkStart(userId);
    if (start > 0) {
        seal.replyToSender(ctx, msg, [
            "你已经在打工了。",
            `已打工：${formatDuration(Date.now() - start)}`,
            "使用 .打工结束 结算工资。",
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    setWorkStart(userId, Date.now());
    seal.replyToSender(ctx, msg, "开始打工了。\n满 1 分钟后可以使用 .打工结束 结算工资。");
    return seal.ext.newCmdExecuteResult(true);
}

function solveWorkEnd(ctx, msg) {
    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const start = getWorkStart(userId);
    if (start <= 0) {
        seal.replyToSender(ctx, msg, "你现在没有在打工。\n使用 .打工开始 开始打工。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const now = Date.now();
    const elapsed = Math.max(0, now - start);
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) {
        const remainingSeconds = Math.max(1, 60 - Math.floor(elapsed / 1000));
        seal.replyToSender(ctx, msg, `还没满 1 分钟，还差 ${remainingSeconds} 秒才能结算。`);
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const incomePerMinute = Math.max(0, getIntConfig("打工每分钟收益", 10));
    const earning = minutes * incomePerMinute;
    const incomeResult = applyIncome(userId, earning);
    clearWorkStart(userId);

    const replyLines = [
        `打工 ${minutes} 分钟，获得 ${earning}${currency}。`,
    ];
    if (incomeResult.paidDebt > 0) {
        replyLines.push(`偿还欠债：${incomeResult.paidDebt}${currency}`);
        if (incomeResult.walletAdded > 0) replyLines.push(`剩余入账：${incomeResult.walletAdded}${currency}`);
    }
    replyLines.push(
        `当前余额：${incomeResult.balanceAfter}${currency}`,
        `当前欠债：${incomeResult.debtAfter}${currency}`,
    );
    seal.replyToSender(ctx, msg, replyLines.join("\n"));
    return seal.ext.newCmdExecuteResult(true);
}

const cmdWork = seal.ext.newCmdItemInfo();
cmdWork.name = "打工";
cmdWork.help = "打工赚钱。\n用法：.打工开始 / .打工结束 / .打工";
cmdWork.solve = (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    if (inputText === "开始" || inputText.toLowerCase() === "start") {
        return solveWorkStart(ctx, msg);
    }
    if (inputText === "结束" || inputText.toLowerCase() === "end" || inputText.toLowerCase() === "stop") {
        return solveWorkEnd(ctx, msg);
    }

    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const incomePerMinute = Math.max(0, getIntConfig("打工每分钟收益", 10));
    const start = getWorkStart(userId);
    if (start > 0) {
        const elapsed = Math.max(0, Date.now() - start);
        const minutes = Math.floor(elapsed / 60000);
        seal.replyToSender(ctx, msg, [
            "你正在打工。",
            `已打工：${formatDuration(elapsed)}`,
            `当前可结算：${minutes * incomePerMinute}${currency}`,
            "使用 .打工结束 结算工资。",
        ].join("\n"));
    } else {
        seal.replyToSender(ctx, msg, [
            `打工每满 1 分钟获得 ${incomePerMinute}${currency}。`,
            "使用 .打工开始 开始打工。",
            "使用 .打工结束 结算工资。",
        ].join("\n"));
    }
    return seal.ext.newCmdExecuteResult(true);
};

const cmdWorkStart = seal.ext.newCmdItemInfo();
cmdWorkStart.name = "打工开始";
cmdWorkStart.help = "开始打工。\n用法：.打工开始";
cmdWorkStart.solve = solveWorkStart;

const cmdWorkEnd = seal.ext.newCmdItemInfo();
cmdWorkEnd.name = "打工结束";
cmdWorkEnd.help = "结束打工并结算工资。\n用法：.打工结束";
cmdWorkEnd.solve = solveWorkEnd;

const cmdSlot = seal.ext.newCmdItemInfo();
cmdSlot.name = "老虎机";
cmdSlot.help = getHelpText();
cmdSlot.solve = (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    if (isHelpText(inputText)) {
        seal.replyToSender(ctx, msg, getHelpText());
        return seal.ext.newCmdExecuteResult(true);
    }

    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }
    const workStart = getWorkStart(userId);
    if (workStart > 0) {
        seal.replyToSender(ctx, msg, [
            "你正在打工，不能玩老虎机。",
            `已打工：${formatDuration(Date.now() - workStart)}`,
            "使用 .打工结束 结算后再来玩。",
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }
    if (replyDebtBlocked(ctx, msg, userId, "玩老虎机")) {
        return seal.ext.newCmdExecuteResult(true);
    }

    const parsed = parseBetAmount(cmdArgs);
    if (!parsed.ok) {
        seal.replyToSender(ctx, msg, parsed.reason);
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const bet = parsed.amount;
    const balance = getWallet(userId);
    const scopeId = getSlotScopeId(ctx, msg, userId);
    if (balance < bet) {
        seal.replyToSender(ctx, msg, [
            `余额不足，当前余额：${balance}${currency}`,
            `本次需要：${bet}${currency}`,
            "可以使用 .低保 领取每日低保。",
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    const result = rollSlot(scopeId);
    const poolBefore = getJackpotPool(scopeId);
    let payout = 0;
    let prizeText = "抱歉，没有中奖。";
    let poolAfter = poolBefore;
    let extraChanceAfter = getJackpotExtraChance(scopeId);
    if (result.prize === "small") {
        const multiplier = Math.max(0, getIntConfig("小奖倍率", 2));
        payout = bet * multiplier;
        prizeText = `中了小奖，返还 ${payout}${currency}。`;
    } else if (result.prize === "jackpot") {
        const multiplier = Math.max(0, getIntConfig("大奖倍率", 10));
        payout = bet * multiplier + poolBefore;
        prizeText = `中大奖了，返还 ${payout}${currency}。`;
        if (poolBefore > 0) prizeText += ` 其中包含奖池 ${poolBefore}${currency}。`;
        clearJackpotProgress(scopeId);
        poolAfter = 0;
        extraChanceAfter = 0;
    } else {
        const progress = addJackpotProgress(scopeId, bet);
        poolAfter = progress.pool;
        extraChanceAfter = progress.after;
    }

    const newBalance = balance - bet + payout;
    setWallet(userId, newBalance);

    const replyLines = [
        `你投入了 ${bet}${currency}。`,
        `结果：${result.reels.join(" | ")}`,
        prizeText,
        `当前余额：${newBalance}${currency}`,
    ];
    if (getBoolConfig("显示群奖池信息", true)) {
        const scopeLabel = scopeId.startsWith("private:") ? "私聊奖池" : "本群奖池";
        replyLines.push(`${scopeLabel}：${poolAfter}${currency}`);
        if (!getBoolConfig("隐藏大奖加权", false)) {
            const jackpotChanceAfter = Math.min(100, getSlotJackpotBaseChance() + extraChanceAfter);
            replyLines.push(`大奖概率：${formatPercent(jackpotChanceAfter)}%（保底 +${formatPercent(extraChanceAfter)}%）`);
        }
    }
    seal.replyToSender(ctx, msg, replyLines.join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

async function solveLotteryDraw(ctx, msg, count) {
    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const workStart = getWorkStart(userId);
    if (workStart > 0) {
        seal.replyToSender(ctx, msg, [
            "你正在打工，不能抽奖。",
            `已打工：${formatDuration(Date.now() - workStart)}`,
            "使用 .打工结束 结算后再来玩。",
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }
    if (replyDebtBlocked(ctx, msg, userId, "抽奖")) {
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const cost = Math.max(0, getIntConfig("抽奖消耗金额", 200));
    const drawCount = Math.max(1, Math.floor(Number(count) || 1));
    const totalCost = cost * drawCount;
    const balance = getWallet(userId);
    if (balance < totalCost) {
        seal.replyToSender(ctx, msg, [
            `余额不足，当前余额：${balance}${currency}`,
            `本次抽奖需要：${totalCost}${currency}`,
            "可以使用 .低保 领取每日低保。",
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    const newBalance = balance - totalCost;
    setWallet(userId, newBalance);
    rememberFashionUser(ctx, msg, userId);

    const displayName = getDisplayName(ctx, msg, userId);
    seal.replyToSender(ctx, msg, drawCount >= 10 ? getLotteryTenOpeningText(displayName, totalCost, currency) : getLotteryOpeningText(displayName, cost, currency));
    await sleep(2000);

    const prizes = [];
    const counts = { miss: 0, small: 0, big: 0 };
    let fashionGain = 0;
    for (let i = 0; i < drawCount; i++) {
        const prize = rollLotteryPrize();
        prizes.push(prize);
        counts[prize] = (counts[prize] || 0) + 1;
        fashionGain += getLotteryFashionGain(prize);
    }
    const fashionAfter = fashionGain > 0 ? addFashion(userId, fashionGain) : getFashion(userId);
    if (fashionGain > 0) rememberFashionUser(ctx, msg, userId);

    if (drawCount <= 1) {
        const prize = prizes[0] || "miss";
        const replyLines = [
            getLotteryResultText(prize),
            `本次花费：${totalCost}${currency}`,
            `当前余额：${newBalance}${currency}`,
        ];
        if (fashionGain > 0) {
            replyLines.push(`时髦值 +${fashionGain}，当前时髦值：${fashionAfter}`);
        } else {
            replyLines.push(`当前时髦值：${fashionAfter}`);
        }

        seal.replyToSender(ctx, msg, replyLines.join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    const bestPrize = counts.big > 0 ? "big" : (counts.small > 0 ? "small" : "miss");
    const prizeList = prizes.map((prize, index) => `${index + 1}.${getLotteryPrizeName(prize)}`).join(" / ");
    const replyLines = [
        "🛑 十连指针停下。",
        `结果统计：完没中 x${counts.miss || 0}，小奖 x${counts.small || 0}，大奖 x${counts.big || 0}`,
        `抽中明细：${prizeList}`,
        "本轮代表文案：",
        getLotteryResultText(bestPrize),
        `本次花费：${totalCost}${currency}`,
        `当前余额：${newBalance}${currency}`,
    ];
    if (fashionGain > 0) {
        replyLines.push(`时髦值合计 +${fashionGain}，当前时髦值：${fashionAfter}`);
    } else {
        replyLines.push(`当前时髦值：${fashionAfter}`);
    }

    seal.replyToSender(ctx, msg, replyLines.join("\n"));
    return seal.ext.newCmdExecuteResult(true);
}

const cmdLottery = seal.ext.newCmdItemInfo();
cmdLottery.name = "抽奖";
cmdLottery.help = [
    "大爷幸运大转盘。",
    "用法：.抽奖 / .抽奖 十连",
    "扣除配置金额后开奖，扣掉的货币直接销毁。",
].join("\n");
cmdLottery.solve = async (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    if (isHelpText(inputText)) {
        seal.replyToSender(ctx, msg, cmdLottery.help);
        return seal.ext.newCmdExecuteResult(true);
    }
    if (inputText && !isLotteryTenText(inputText)) {
        seal.replyToSender(ctx, msg, cmdLottery.help);
        return seal.ext.newCmdExecuteResult(true);
    }
    return solveLotteryDraw(ctx, msg, isLotteryTenText(inputText) ? 10 : 1);
};

const cmdLotteryTen = seal.ext.newCmdItemInfo();
cmdLotteryTen.name = "十连抽奖";
cmdLotteryTen.help = "大爷幸运大转盘十连抽。\n用法：.十连抽奖";
cmdLotteryTen.solve = async (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    if (isHelpText(inputText)) {
        seal.replyToSender(ctx, msg, cmdLotteryTen.help);
        return seal.ext.newCmdExecuteResult(true);
    }
    return solveLotteryDraw(ctx, msg, 10);
};

const cmdFashion = seal.ext.newCmdItemInfo();
cmdFashion.name = "时髦值";
cmdFashion.help = "查看自己的时髦值。\n用法：.时髦值";
cmdFashion.solve = (ctx, msg) => {
    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    rememberFashionUser(ctx, msg, userId);
    seal.replyToSender(ctx, msg, `当前时髦值：${getFashion(userId)}`);
    return seal.ext.newCmdExecuteResult(true);
};

const cmdFashionRank = seal.ext.newCmdItemInfo();
cmdFashionRank.name = "时髦榜";
cmdFashionRank.help = "查看本群时髦值排行榜。\n用法：.时髦榜 / .时髦排行榜";
cmdFashionRank.solve = (ctx, msg) => {
    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const scopeId = rememberFashionUser(ctx, msg, userId);
    if (scopeId.startsWith("private:")) {
        seal.replyToSender(ctx, msg, "私聊里没有群时髦榜。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const rows = getFashionLeaderboard(scopeId);
    if (rows.length <= 0) {
        seal.replyToSender(ctx, msg, "本群还没有时髦值记录。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const lines = ["本群时髦值排行榜"];
    rows.forEach((row, index) => {
        lines.push(`${index + 1}. ${row.name}：${row.score}`);
    });
    seal.replyToSender(ctx, msg, lines.join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

const cmdBigSmall = seal.ext.newCmdItemInfo();
cmdBigSmall.name = "买大小";
cmdBigSmall.help = getBigSmallHelpText();
cmdBigSmall.solve = (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    if (isHelpText(inputText)) {
        seal.replyToSender(ctx, msg, getBigSmallHelpText());
        return seal.ext.newCmdExecuteResult(true);
    }

    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const groupId = getGroupId(ctx, msg);
    if (!groupId) {
        seal.replyToSender(ctx, msg, "买大小只能在群聊中使用。");
        return seal.ext.newCmdExecuteResult(true);
    }

    if (settleExpiredBigSmallRound(ctx, msg, groupId)) {
        return seal.ext.newCmdExecuteResult(true);
    }

    const existingRound = getBigSmallRound(groupId);
    if (existingRound) {
        seal.replyToSender(ctx, msg, getBigSmallRoundStatusText(existingRound));
        return seal.ext.newCmdExecuteResult(true);
    }

    const workStart = getWorkStart(userId);
    if (workStart > 0) {
        seal.replyToSender(ctx, msg, [
            "你正在打工，不能开买大小。",
            `已打工：${formatDuration(Date.now() - workStart)}`,
            "使用 .打工结束 结算后再来玩。",
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }
    if (replyDebtBlocked(ctx, msg, userId, "开买大小")) {
        return seal.ext.newCmdExecuteResult(true);
    }
    if (typeof seal.replyPerson !== "function") {
        seal.replyToSender(ctx, msg, "当前环境无法私发暗骰，暂时不能开买大小。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const seconds = getBigSmallBetSeconds();
    const now = Date.now();
    const roll = rollBigSmallDice();
    const bankerName = getDisplayName(ctx, msg, userId);
    const round = {
        groupId,
        bankerId: userId,
        bankerName,
        dice: roll.dice,
        total: roll.total,
        outcome: roll.outcome,
        startedAt: now,
        endAt: now + seconds * 1000,
        bets: [],
    };
    setBigSmallRound(groupId, round);
    scheduleBigSmallSettlement(ctx, msg, groupId, round.endAt);

    seal.replyPerson(ctx, msg, [
        "【买大小暗骰】",
        "你是本局庄家。",
        `暗骰：${roll.dice[0]} + ${roll.dice[1]} = ${roll.total}`,
        `结果：${formatBigSmallSide(roll.outcome)}`,
        "到点后机器人会自动开奖。",
    ].join("\n"));

    seal.replyToSender(ctx, msg, [
        "🎲 【买大小开局】",
        `庄家：${bankerName}`,
        `下注时间：${seconds}秒`,
        "结果：2-6 为小，8-12 为大，7 为庄家通杀。",
        `买中返还：下注 * ${formatNumber(getBigSmallPayoutMultiplier())}，包含本金。`,
        `下注：.买大 50 / .买小 50`,
        `默认下注：${Math.max(1, getIntConfig("买大小默认下注", 10))}${currency}`,
    ].join("\n"));
    return seal.ext.newCmdExecuteResult(true);
};

function solveBigSmallBet(ctx, msg, cmdArgs, side) {
    const inputText = parseInputText(cmdArgs);
    if (isHelpText(inputText)) {
        seal.replyToSender(ctx, msg, getBigSmallHelpText());
        return seal.ext.newCmdExecuteResult(true);
    }

    const userId = getUserId(ctx, msg);
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }

    const groupId = getGroupId(ctx, msg);
    if (!groupId) {
        seal.replyToSender(ctx, msg, "买大小下注只能在群聊中使用。");
        return seal.ext.newCmdExecuteResult(true);
    }

    if (settleExpiredBigSmallRound(ctx, msg, groupId)) {
        return seal.ext.newCmdExecuteResult(true);
    }

    const round = getBigSmallRound(groupId);
    if (!round) {
        seal.replyToSender(ctx, msg, "当前没有正在进行的买大小。\n使用 .买大小 开一局。");
        return seal.ext.newCmdExecuteResult(true);
    }

    if (round.bankerId === userId) {
        seal.replyToSender(ctx, msg, "庄家不能参与自己开的买大小。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const workStart = getWorkStart(userId);
    if (workStart > 0) {
        seal.replyToSender(ctx, msg, [
            "你正在打工，不能下注买大小。",
            `已打工：${formatDuration(Date.now() - workStart)}`,
            "使用 .打工结束 结算后再来玩。",
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }
    if (replyDebtBlocked(ctx, msg, userId, "下注买大小")) {
        return seal.ext.newCmdExecuteResult(true);
    }

    const bets = Array.isArray(round.bets) ? round.bets : [];
    if (bets.some(bet => bet.userId === userId)) {
        seal.replyToSender(ctx, msg, "你本局已经下注了，不能重复下注。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const parsed = parseBigSmallBetAmount(cmdArgs);
    if (!parsed.ok) {
        seal.replyToSender(ctx, msg, parsed.reason);
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const amount = parsed.amount;
    const balance = getWallet(userId);
    if (balance < amount) {
        seal.replyToSender(ctx, msg, [
            `余额不足，当前余额：${balance}${currency}`,
            `本次下注需要：${amount}${currency}`,
            "可以使用 .低保 领取每日低保。",
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    setWallet(userId, balance - amount);
    bets.push({
        userId,
        name: getDisplayName(ctx, msg, userId),
        side,
        amount,
        time: Date.now(),
    });
    round.bets = bets;
    setBigSmallRound(groupId, round);

    const remaining = Math.max(0, Math.ceil((Number(round.endAt || 0) - Date.now()) / 1000));
    seal.replyToSender(ctx, msg, [
        `下注成功：买${formatBigSmallSide(side)} ${amount}${currency}`,
        `当前余额：${getWallet(userId)}${currency}`,
        `本局剩余：${remaining}秒`,
    ].join("\n"));
    return seal.ext.newCmdExecuteResult(true);
}

const cmdBuyBig = seal.ext.newCmdItemInfo();
cmdBuyBig.name = "买大";
cmdBuyBig.help = "买大小下注买大。\n用法：.买大 50 / .买大50";
cmdBuyBig.solve = (ctx, msg, cmdArgs) => {
    const inputText = parseInputText(cmdArgs);
    if (inputText === "小" || inputText.startsWith("小 ")) {
        const rest = inputText.slice(1).trim();
        const redirectedArgs = { cleanArgs: rest, rawArgs: rest, args: rest ? rest.split(/\s+/) : [] };
        return cmdBigSmall.solve(ctx, msg, redirectedArgs);
    }
    return solveBigSmallBet(ctx, msg, cmdArgs, "big");
};

const cmdBuySmall = seal.ext.newCmdItemInfo();
cmdBuySmall.name = "买小";
cmdBuySmall.help = "买大小下注买小。\n用法：.买小 50 / .买小50";
cmdBuySmall.solve = (ctx, msg, cmdArgs) => solveBigSmallBet(ctx, msg, cmdArgs, "small");

function solveBlackjack(ctx, msg, cmdArgs) {
    const parsedAction = parseBlackjackAction(cmdArgs);
    const action = parsedAction.action;
    const userId = getUserId(ctx, msg);

    if (action === "help") {
        seal.replyToSender(ctx, msg, getBlackjackHelpText());
        return seal.ext.newCmdExecuteResult(true);
    }
    if (!userId) {
        replyMissingUser(ctx, msg);
        return seal.ext.newCmdExecuteResult(true);
    }
    if (action === "chips") {
        return cmdBalance.solve(ctx, msg);
    }

    const groupId = getGroupId(ctx, msg);
    if (!groupId) {
        seal.replyToSender(ctx, msg, "21点只能在群聊中使用。");
        return seal.ext.newCmdExecuteResult(true);
    }

    const currency = getStringConfig("货币名", "金币");
    const playerName = getDisplayName(ctx, msg, userId);
    let round = getBlackjackRound(groupId);

    if (action === "start") {
        if (round) {
            seal.replyToSender(ctx, msg, "本群已有一桌21点。\n使用 .bj status 查看状态。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (replyBlackjackUseBlocked(ctx, msg, userId, "开21点")) {
            return seal.ext.newCmdExecuteResult(true);
        }

        round = {
            groupId,
            dealerId: userId,
            dealerName: playerName,
            phase: "waiting",
            joinLocked: false,
            currentPlayerIndex: -1,
            pot: 0,
            deck: createBlackjackDeck(),
            players: [{
                userId,
                name: playerName,
                isDealer: true,
                hand: [],
                bet: 0,
                busted: false,
                stood: false,
            }],
            startedAt: Date.now(),
            updatedAt: Date.now(),
        };
        setBlackjackRound(groupId, round);
        seal.replyToSender(ctx, msg, [
            `${playerName} 开启了21点牌桌。`,
            "输入 .bj join 加入牌桌。",
            "庄家先用 .bj bet 50 下注。",
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    if (!round) {
        seal.replyToSender(ctx, msg, "当前没有进行中的21点。\n使用 .bj start 开一桌。");
        return seal.ext.newCmdExecuteResult(true);
    }

    if (action === "join") {
        if (round.joinLocked || (round.phase !== "waiting" && round.phase !== "betting")) {
            seal.replyToSender(ctx, msg, "本局已经发牌，暂时不能加入。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (findBlackjackPlayer(round, userId)) {
            seal.replyToSender(ctx, msg, "你已经在这桌21点里了。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (replyBlackjackUseBlocked(ctx, msg, userId, "加入21点")) {
            return seal.ext.newCmdExecuteResult(true);
        }

        round.players.push({
            userId,
            name: playerName,
            isDealer: false,
            hand: [],
            bet: 0,
            busted: false,
            stood: false,
        });
        setBlackjackRound(groupId, round);
        seal.replyToSender(ctx, msg, [
            `${playerName} 加入了21点牌桌。`,
            `当前人数：${getBlackjackIdlePlayers(round).length}名闲家 + 庄家 ${round.dealerName}`,
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    if (action === "exit") {
        const player = findBlackjackPlayer(round, userId);
        if (!player) {
            seal.replyToSender(ctx, msg, "你当前没有加入这桌21点。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (player.isDealer) {
            seal.replyToSender(ctx, msg, "庄家不能退出牌桌。\n使用 .bj end 结束未发牌的牌桌。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (round.phase !== "waiting" && round.phase !== "betting") {
            seal.replyToSender(ctx, msg, "本局已经发牌，暂时不能退出。");
            return seal.ext.newCmdExecuteResult(true);
        }

        if (player.bet > 0) setWallet(userId, getWallet(userId) + player.bet);
        round.players = round.players.filter(item => item.userId !== userId);
        setBlackjackRound(groupId, round);
        seal.replyToSender(ctx, msg, `${playerName} 退出了21点牌桌。`);
        return seal.ext.newCmdExecuteResult(true);
    }

    if (action === "bet") {
        const player = findBlackjackPlayer(round, userId);
        if (!player) {
            seal.replyToSender(ctx, msg, "你还没有加入这桌21点。\n使用 .bj join 加入。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (round.phase !== "waiting" && round.phase !== "betting") {
            seal.replyToSender(ctx, msg, "当前不在下注阶段。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (player.bet > 0) {
            seal.replyToSender(ctx, msg, "你本局已经下注了。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (replyBlackjackUseBlocked(ctx, msg, userId, "下注21点")) {
            return seal.ext.newCmdExecuteResult(true);
        }

        const bet = parseBlackjackBetAmount(parsedAction.rest);
        if (!bet.ok) {
            seal.replyToSender(ctx, msg, bet.reason);
            return seal.ext.newCmdExecuteResult(true);
        }

        const dealer = getBlackjackDealer(round);
        if (!player.isDealer) {
            if (!dealer || dealer.bet <= 0) {
                seal.replyToSender(ctx, msg, "请等庄家先下注。");
                return seal.ext.newCmdExecuteResult(true);
            }
            if (bet.amount < dealer.bet) {
                seal.replyToSender(ctx, msg, `闲家下注不能低于庄家下注 ${dealer.bet}${currency}。`);
                return seal.ext.newCmdExecuteResult(true);
            }
        }

        const balance = getWallet(userId);
        if (balance < bet.amount) {
            seal.replyToSender(ctx, msg, [
                `余额不足，当前余额：${balance}${currency}`,
                `本次下注需要：${bet.amount}${currency}`,
                "可以使用 .低保 领取每日低保。",
            ].join("\n"));
            return seal.ext.newCmdExecuteResult(true);
        }

        setWallet(userId, balance - bet.amount);
        player.bet = bet.amount;
        round.phase = "betting";
        setBlackjackRound(groupId, round);

        const idlePlayers = getBlackjackIdlePlayers(round);
        const waitingPlayers = idlePlayers.filter(item => item.bet <= 0).map(item => item.name);
        const lines = [
            `${player.name}${player.isDealer ? "(庄)" : ""} 下注 ${bet.amount}${currency}。`,
            `当前奖池：${getBlackjackPot(round)}${currency}`,
            `当前余额：${getWallet(userId)}${currency}`,
        ];
        if (dealer && dealer.bet > 0 && idlePlayers.length > 0 && waitingPlayers.length <= 0) {
            lines.push("所有闲家已下注，庄家可以使用 .bj open 发牌。");
        } else if (waitingPlayers.length > 0) {
            lines.push(`等待下注：${waitingPlayers.join("，")}`);
        } else {
            lines.push("等待闲家加入或下注。");
        }
        seal.replyToSender(ctx, msg, lines.join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    if (action === "open") {
        const dealer = getBlackjackDealer(round);
        if (!dealer || dealer.userId !== userId) {
            seal.replyToSender(ctx, msg, "只有庄家可以发牌。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (replyBlackjackUseBlocked(ctx, msg, userId, "发牌21点")) {
            return seal.ext.newCmdExecuteResult(true);
        }
        if (round.phase !== "betting") {
            seal.replyToSender(ctx, msg, "当前还不能发牌。\n庄家和闲家都下注后才能发牌。");
            return seal.ext.newCmdExecuteResult(true);
        }
        const idlePlayers = getBlackjackIdlePlayers(round);
        if (idlePlayers.length <= 0) {
            seal.replyToSender(ctx, msg, "至少需要 1 名闲家才能开始。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (dealer.bet <= 0) {
            seal.replyToSender(ctx, msg, "庄家需要先下注。");
            return seal.ext.newCmdExecuteResult(true);
        }
        const unbettors = idlePlayers.filter(player => player.bet <= 0).map(player => player.name);
        if (unbettors.length > 0) {
            seal.replyToSender(ctx, msg, `还有闲家未下注：${unbettors.join("，")}`);
            return seal.ext.newCmdExecuteResult(true);
        }

        openBlackjackRound(ctx, msg, groupId, round).catch(() => {
            seal.replyToSender(ctx, msg, "21点发牌流程出错，本局状态已保留。");
        });
        return seal.ext.newCmdExecuteResult(true);
    }

    if (action === "hit") {
        if (round.phase !== "playing") {
            seal.replyToSender(ctx, msg, "当前没有正在操作的21点本局。");
            return seal.ext.newCmdExecuteResult(true);
        }
        const player = findBlackjackPlayer(round, userId);
        const current = round.players[round.currentPlayerIndex];
        if (!player) {
            seal.replyToSender(ctx, msg, "你当前没有加入这桌21点。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (!current || current.userId !== userId) {
            seal.replyToSender(ctx, msg, "还没轮到你操作。");
            return seal.ext.newCmdExecuteResult(true);
        }

        const card = dealBlackjackCard(round, player);
        const value = getBlackjackHandValue(player.hand);
        player.busted = value > 21;
        const privateText = [
            "【21点要牌】",
            `得到：${formatBlackjackCard(card)}`,
            `当前手牌：${formatBlackjackHand(player.hand)}`,
            `当前点数：${value}`,
        ].join("\n");
        const sent = sendBlackjackPrivate(ctx, msg, userId, privateText);
        const lines = [];
        if (sent) {
            lines.push(`${player.name} 已要牌。`);
        } else {
            lines.push(`${player.name} 已要牌：${formatBlackjackCard(card)}，当前 ${value}点。`);
        }

        if (player.busted) {
            lines.push(`${player.name} 爆牌，操作结束。`);
            round.currentPlayerIndex += 1;
        } else {
            lines.push("请选择：.bj hit 要牌 / .bj stand 停牌");
        }

        if (round.currentPlayerIndex >= round.players.length) {
            setBlackjackRound(groupId, round);
            seal.replyToSender(ctx, msg, lines.join("\n"));
            settleBlackjackRound(ctx, msg, groupId, round);
            return seal.ext.newCmdExecuteResult(true);
        }

        setBlackjackRound(groupId, round);
        seal.replyToSender(ctx, msg, lines.join("\n"));
        if (player.busted) promptBlackjackPlayer(ctx, msg, round);
        return seal.ext.newCmdExecuteResult(true);
    }

    if (action === "stand") {
        if (round.phase !== "playing") {
            seal.replyToSender(ctx, msg, "当前没有正在操作的21点本局。");
            return seal.ext.newCmdExecuteResult(true);
        }
        const player = findBlackjackPlayer(round, userId);
        const current = round.players[round.currentPlayerIndex];
        if (!player) {
            seal.replyToSender(ctx, msg, "你当前没有加入这桌21点。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (!current || current.userId !== userId) {
            seal.replyToSender(ctx, msg, "还没轮到你操作。");
            return seal.ext.newCmdExecuteResult(true);
        }

        player.stood = true;
        round.currentPlayerIndex += 1;
        if (round.currentPlayerIndex >= round.players.length) {
            setBlackjackRound(groupId, round);
            seal.replyToSender(ctx, msg, `${player.name} 停牌。`);
            settleBlackjackRound(ctx, msg, groupId, round);
            return seal.ext.newCmdExecuteResult(true);
        }

        setBlackjackRound(groupId, round);
        seal.replyToSender(ctx, msg, `${player.name} 停牌。`);
        promptBlackjackPlayer(ctx, msg, round);
        return seal.ext.newCmdExecuteResult(true);
    }

    if (action === "status") {
        seal.replyToSender(ctx, msg, getBlackjackStatusText(round));
        return seal.ext.newCmdExecuteResult(true);
    }

    if (action === "end") {
        const dealer = getBlackjackDealer(round);
        if (!dealer || dealer.userId !== userId) {
            seal.replyToSender(ctx, msg, "只有庄家可以结束牌桌。");
            return seal.ext.newCmdExecuteResult(true);
        }
        if (round.phase === "playing") {
            seal.replyToSender(ctx, msg, "本局已经发牌，先打完本局。");
            return seal.ext.newCmdExecuteResult(true);
        }

        let refundTotal = 0;
        for (const player of round.players) {
            if (player.bet > 0) {
                setWallet(player.userId, getWallet(player.userId) + player.bet);
                refundTotal += player.bet;
            }
        }
        clearBlackjackRound(groupId);
        seal.replyToSender(ctx, msg, [
            `${playerName} 结束了21点牌桌。`,
            `已退还下注：${refundTotal}${currency}`,
        ].join("\n"));
        return seal.ext.newCmdExecuteResult(true);
    }

    seal.replyToSender(ctx, msg, getBlackjackHelpText());
    return seal.ext.newCmdExecuteResult(true);
}

ext.cmdMap["低保"] = cmdDaily;
ext.cmdMap["余额"] = cmdBalance;
ext.cmdMap["财富榜"] = cmdWealthRank;
ext.cmdMap["余额榜"] = cmdWealthRank;
ext.cmdMap["钱包榜"] = cmdWealthRank;
ext.cmdMap["钱包登记"] = cmdWalletRegister;
ext.cmdMap["钱包索引"] = cmdWalletRegister;
ext.cmdMap["钱包迁移"] = cmdWalletMigrate;
ext.cmdMap["钱包扫描"] = cmdWalletMigrate;
ext.cmdMap["转账"] = cmdTransfer;
ext.cmdMap["加钱"] = cmdAdminAddMoney;
ext.cmdMap["发钱"] = cmdAdminAddMoney;
ext.cmdMap["公款"] = cmdPublicFund;
ext.cmdMap["一键共产"] = cmdCommune;
ext.cmdMap["一件共产"] = cmdCommune;
ext.cmdMap["打工"] = cmdWork;
ext.cmdMap["打工开始"] = cmdWorkStart;
ext.cmdMap["打工结束"] = cmdWorkEnd;
ext.cmdMap["老虎机"] = cmdSlot;
ext.cmdMap["抽奖"] = cmdLottery;
ext.cmdMap["十连抽奖"] = cmdLotteryTen;
ext.cmdMap["抽奖十连"] = cmdLotteryTen;
ext.cmdMap["抽奖10"] = cmdLotteryTen;
ext.cmdMap["时髦值"] = cmdFashion;
ext.cmdMap["时髦榜"] = cmdFashionRank;
ext.cmdMap["时髦排行榜"] = cmdFashionRank;
ext.cmdMap["买大小"] = cmdBigSmall;
ext.cmdMap["买大"] = cmdBuyBig;
ext.cmdMap["买小"] = cmdBuySmall;
delete ext.cmdMap["bj"];
delete ext.cmdMap["21点"];

function rememberMessageSender(ctx, msg) {
    const userId = getUserId(ctx, msg);
    if (!userId) return;
    rememberWalletUser(ctx, msg, userId);
}

ext.onLoad = () => {
    migrateLegacyWalletCandidates();
};

ext.onMessageReceived = (ctx, msg) => {
    rememberMessageSender(ctx, msg);
};

ext.onNotCommandReceived = (ctx, msg) => {
    rememberMessageSender(ctx, msg);
};
