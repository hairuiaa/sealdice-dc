const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "..", "dc模拟器.js");
const script = fs.readFileSync(scriptPath, "utf8");

function createHarness() {
    const store = new Map();
    const replies = [];
    const configs = new Map();
    const randomValues = [];
    const math = Object.create(Math);
    math.random = () => (randomValues.length > 0 ? randomValues.shift() : 0);

    const ext = {
        cmdMap: {},
        storageGet(key) {
            return store.has(key) ? store.get(key) : "";
        },
        storageSet(key, value) {
            if (value === "") {
                store.delete(key);
            } else {
                store.set(key, String(value));
            }
        },
    };
    const seal = {
        ext: {
            find() {
                return null;
            },
            new() {
                return ext;
            },
            register() {},
            unregisterConfig() {},
            registerStringConfig(_ext, key, value) {
                if (!configs.has(key)) configs.set(key, value);
            },
            registerIntConfig(_ext, key, value) {
                if (!configs.has(key)) configs.set(key, value);
            },
            registerFloatConfig(_ext, key, value) {
                if (!configs.has(key)) configs.set(key, value);
            },
            registerBoolConfig(_ext, key, value) {
                if (!configs.has(key)) configs.set(key, value);
            },
            getStringConfig(_ext, key) {
                return configs.get(key);
            },
            getIntConfig(_ext, key) {
                return configs.get(key);
            },
            getFloatConfig(_ext, key) {
                return configs.get(key);
            },
            getBoolConfig(_ext, key) {
                return configs.get(key);
            },
            newCmdItemInfo() {
                return {};
            },
            newCmdExecuteResult(solved) {
                return { solved };
            },
        },
        replyToSender(_ctx, _msg, text) {
            replies.push(String(text));
        },
    };

    vm.runInNewContext(script, {
        seal,
        console,
        Date,
        Math: math,
        setTimeout() {},
        Promise,
    });

    function walletKey(userId) {
        return `wallet:${userId}`;
    }

    function setWallet(userId, amount) {
        store.set(walletKey(userId), String(amount));
    }

    function getWallet(userId) {
        return Number(store.get(walletKey(userId)) || 0);
    }

    function setDebt(userId, amount) {
        store.set(`debt:${userId}`, String(amount));
    }

    function setWorkStart(userId, value) {
        store.set(`workStart:${userId}`, String(value));
    }

    function soloKey(groupId, userId) {
        return `rouletteSolo:${groupId}:${userId}`;
    }

    function getSolo(groupId, userId) {
        const raw = store.get(soloKey(groupId, userId));
        return raw ? JSON.parse(raw) : null;
    }

    function getMulti(groupId) {
        const raw = store.get(`rouletteMulti:${groupId}`);
        return raw ? JSON.parse(raw) : null;
    }

    function send(userId, groupId, args, name = userId, privilegeLevel = 100) {
        replies.length = 0;
        const ctx = {
            player: { userId, name },
            group: groupId ? { groupId } : null,
            privilegeLevel,
        };
        const msg = {
            messageType: groupId ? "group" : "private",
            groupId,
            sender: { userId, nickname: name },
        };
        const text = String(args || "");
        ext.cmdMap["轮盘"].solve(ctx, msg, {
            cleanArgs: text,
            rawArgs: text,
            args: text ? text.split(/\s+/) : [],
        });
        return replies.join("\n---\n");
    }

    return {
        store,
        replies,
        randomValues,
        setWallet,
        getWallet,
        setDebt,
        setWorkStart,
        getSolo,
        getMulti,
        send,
    };
}

function testSoloPlayerSafeThenDealerFails() {
    const h = createHarness();
    h.setWallet("U1", 1000);

    h.randomValues.push(0.2);
    const startReply = h.send("U1", "G1", "单人 100", "玩家一");
    assert.match(startReply, /单人道具轮盘开局/);
    assert.equal(h.getWallet("U1"), 900);

    const fireReply = h.send("U1", "G1", "继续", "玩家一");
    assert.match(fireReply, /安全格/);
    assert.equal(h.getWallet("U1"), 900);

    const passReply = h.send("U1", "G1", "换人", "玩家一");
    assert.match(passReply, /最后幸存者：玩家一|胜者：玩家一/);
    assert.equal(h.getWallet("U1"), 1100);
    assert.equal(h.getSolo("G1", "U1"), null);
}

function testSoloPlayerFailsClearsRound() {
    const h = createHarness();
    h.setWallet("U1", 1000);
    h.randomValues.push(0);
    h.send("U1", "G1", "单人 100", "玩家一");

    const reply = h.send("U1", "G1", "继续", "玩家一");

    assert.match(reply, /失败格/);
    assert.equal(h.getWallet("U1"), 900);
    assert.equal(h.getSolo("G1", "U1"), null);
}

function testSoloDealerSafeReturnsTurn() {
    const h = createHarness();
    h.setWallet("U1", 1000);
    h.randomValues.push(0.9);
    h.send("U1", "G1", "单人 100", "玩家一");

    h.send("U1", "G1", "继续", "玩家一");
    const passReply = h.send("U1", "G1", "换人", "玩家一");
    const round = h.getSolo("G1", "U1");

    assert.match(passReply, /轮到玩家/);
    assert.equal(h.getWallet("U1"), 900);
    assert.equal(round.safeCount, 1);
    assert.equal(round.dealerSafeCount, 1);
    assert.equal(round.playerCanPass, false);
}

function testSoloPassBeforeFireBlocked() {
    const h = createHarness();
    h.setWallet("U1", 1000);
    h.randomValues.push(0.9);
    h.send("U1", "G1", "单人 100", "玩家一");

    const reply = h.send("U1", "G1", "换人", "玩家一");

    assert.match(reply, /先扣动一次/);
    assert.equal(h.getWallet("U1"), 900);
    assert.ok(h.getSolo("G1", "U1"));
}

function testMultiJoinAndRejectDuplicate() {
    const h = createHarness();
    h.setWallet("U1", 1000);
    h.setWallet("U2", 1000);

    h.send("U1", "G1", "多人 50", "玩家一");
    const joinReply = h.send("U2", "G1", "加入", "玩家二");
    const duplicateReply = h.send("U2", "G1", "加入", "玩家二");
    const round = h.getMulti("G1");

    assert.match(joinReply, /加入成功/);
    assert.match(duplicateReply, /已经加入/);
    assert.equal(h.getWallet("U1"), 950);
    assert.equal(h.getWallet("U2"), 950);
    assert.equal(round.players.length, 2);
    assert.equal(round.pot, 100);
}

function testMultiTurnAndWinnerTakesPot() {
    const h = createHarness();
    h.setWallet("U1", 1000);
    h.setWallet("U2", 1000);

    h.randomValues.push(0.2);
    h.send("U1", "G1", "多人 50", "玩家一");
    h.send("U2", "G1", "加入", "玩家二");
    h.send("U1", "G1", "开始", "玩家一");

    const safeReply = h.send("U1", "G1", "扳机", "玩家一");
    assert.match(safeReply, /安全格/);
    assert.match(safeReply, /下一位：玩家二/);

    const finalReply = h.send("U2", "G1", "扳机", "玩家二");
    assert.match(finalReply, /最后幸存者：玩家一/);
    assert.equal(h.getWallet("U1"), 1050);
    assert.equal(h.getWallet("U2"), 950);
    assert.equal(h.getMulti("G1"), null);
}

function testMultiOwnerEndRefundsPot() {
    const h = createHarness();
    h.setWallet("U1", 1000);
    h.setWallet("U2", 1000);

    h.send("U1", "G1", "多人 80", "玩家一");
    h.send("U2", "G1", "加入", "玩家二");
    const reply = h.send("U1", "G1", "结束", "玩家一");

    assert.match(reply, /已关闭多人道具轮盘/);
    assert.equal(h.getWallet("U1"), 1000);
    assert.equal(h.getWallet("U2"), 1000);
    assert.equal(h.getMulti("G1"), null);
}

function testWorkAndDebtBlocksEntry() {
    const workHarness = createHarness();
    workHarness.setWallet("U1", 1000);
    workHarness.setWorkStart("U1", Date.now());
    const workReply = workHarness.send("U1", "G1", "单人 50", "玩家一");
    assert.match(workReply, /正在打工/);
    assert.equal(workHarness.getWallet("U1"), 1000);
    assert.equal(workHarness.getSolo("G1", "U1"), null);

    const debtHarness = createHarness();
    debtHarness.setWallet("U1", 1000);
    debtHarness.setDebt("U1", 10);
    const debtReply = debtHarness.send("U1", "G1", "多人 50", "玩家一");
    assert.match(debtReply, /欠债/);
    assert.equal(debtHarness.getWallet("U1"), 1000);
    assert.equal(debtHarness.getMulti("G1"), null);
}

const tests = [
    testSoloPlayerSafeThenDealerFails,
    testSoloPlayerFailsClearsRound,
    testSoloDealerSafeReturnsTurn,
    testSoloPassBeforeFireBlocked,
    testMultiJoinAndRejectDuplicate,
    testMultiTurnAndWinnerTakesPot,
    testMultiOwnerEndRefundsPot,
    testWorkAndDebtBlocksEntry,
];

for (const test of tests) {
    test();
}

console.log(`roulette tests passed: ${tests.length}`);
