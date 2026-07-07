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

    const ext = {
        cmdMap: {},
        storageGet(key) {
            return store.has(key) ? store.get(key) : "";
        },
        storageSet(key, value) {
            if (value === "") store.delete(key);
            else store.set(key, String(value));
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

    vm.runInNewContext(script, { seal, console, Date, Math, setTimeout() {}, Promise });

    function setWallet(userId, amount) {
        store.set(`wallet:${userId}`, String(amount));
    }

    function getWallet(userId) {
        return Number(store.get(`wallet:${userId}`) || 0);
    }

    function send(command, senderId, args, at, options = {}) {
        replies.length = 0;
        const name = options.name || senderId;
        const ctx = {
            player: { userId: senderId, name },
            group: { groupId: "QQ-Group:1000" },
            privilegeLevel: options.privilegeLevel === undefined ? 100 : options.privilegeLevel,
        };
        const msg = {
            messageType: "group",
            groupId: "QQ-Group:1000",
            sender: { userId: senderId, nickname: name },
        };
        const text = String(args || "");
        ext.cmdMap[command].solve(ctx, msg, {
            cleanArgs: text,
            rawArgs: text,
            args: text ? text.split(/\s+/) : [],
            at: at || [],
            amIBeMentionedFirst: Boolean(options.amIBeMentionedFirst),
        });
        return replies.join("\n---\n");
    }

    return { store, setWallet, getWallet, send };
}

function testTransferWithMilkyMention() {
    const h = createHarness();
    h.setWallet("QQ:111", 500);

    const reply = h.send("转账", "QQ:111", "50", [{ userId: "QQ:222" }]);

    assert.match(reply, /转账成功/);
    assert.equal(h.getWallet("QQ:111"), 450);
    assert.equal(h.getWallet("QQ:222"), 50);
}

function testAdminAddMoneyWithMilkyMention() {
    const h = createHarness();

    const reply = h.send("加钱", "QQ:111", "100", [{ userId: "QQ:222" }]);

    assert.match(reply, /已给/);
    assert.equal(h.getWallet("QQ:222"), 100);
}

function testWalletRegisterWithOnlyMilkyMentions() {
    const h = createHarness();

    const reply = h.send("钱包登记", "QQ:111", "", [{ userId: "QQ:222" }, { userId: "QQ:333" }]);
    const users = JSON.parse(h.store.get("walletUsers"));

    assert.match(reply, /已登记 2 个钱包/);
    assert.deepEqual(users.sort(), ["QQ:222", "QQ:333"]);
}

function testMentionSkipsBotWhenBotMentionedFirst() {
    const h = createHarness();
    h.setWallet("QQ:111", 500);

    const reply = h.send("转账", "QQ:111", "50", [{ userId: "QQ:999" }, { userId: "QQ:222" }], {
        amIBeMentionedFirst: true,
    });

    assert.match(reply, /转账成功/);
    assert.equal(h.getWallet("QQ:222"), 50);
    assert.equal(h.getWallet("QQ:999"), 0);
}

const tests = [
    testTransferWithMilkyMention,
    testAdminAddMoneyWithMilkyMention,
    testWalletRegisterWithOnlyMilkyMentions,
    testMentionSkipsBotWhenBotMentionedFirst,
];

for (const test of tests) {
    test();
}

console.log(`mention target tests passed: ${tests.length}`);
