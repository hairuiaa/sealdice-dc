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

    vm.runInNewContext(script, { seal, console, Date, Math: math, setTimeout, Promise });

    function walletKey(userId) {
        return `wallet:${userId}`;
    }

    function setWallet(userId, amount) {
        store.set(walletKey(userId), String(amount));
    }

    function getWallet(userId) {
        return Number(store.get(walletKey(userId)) || 0);
    }

    function roundKey(groupId, userId) {
        return `blackjackRound:v2:${groupId}:${userId}`;
    }

    function legacyRoundKey(groupId) {
        return `blackjackRound:${groupId}`;
    }

    function putRound(round) {
        store.set(roundKey(round.groupId, round.userId), JSON.stringify(round));
    }

    function getRound(groupId, userId) {
        const raw = store.get(roundKey(groupId, userId));
        return raw ? JSON.parse(raw) : null;
    }

    function card(rank, suit = "♠") {
        return { suit, rank, marked: false };
    }

    function round(overrides = {}) {
        return {
            rulesVersion: 2,
            groupId: "G1",
            userId: "U1",
            playerName: "玩家一",
            phase: "playing",
            currentHandIndex: 0,
            deck: [],
            dealerHand: [card("10"), card("6", "♥")],
            dealerHoleRevealed: false,
            insuranceBet: 0,
            hands: [{
                cards: [card("10"), card("9", "♥")],
                bet: 100,
                originalBet: 100,
                fromSplit: false,
                splitAces: false,
                doubled: false,
                stood: false,
                busted: false,
                surrendered: false,
                finished: false,
            }],
            startedAt: Date.now(),
            updatedAt: Date.now(),
            ...overrides,
        };
    }

    function send(userId, groupId, args, name = "玩家一") {
        replies.length = 0;
        const ctx = {
            player: { userId, name },
            group: { groupId },
            privilegeLevel: 100,
        };
        const msg = {
            messageType: "group",
            groupId,
            sender: { userId, nickname: name },
        };
        const text = String(args || "");
        ext.cmdMap["21点"].solve(ctx, msg, {
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
        roundKey,
        legacyRoundKey,
        putRound,
        getRound,
        card,
        round,
        send,
    };
}

function testDirectStartAndIsolation() {
    const h = createHarness();
    h.setWallet("U1", 1000);
    h.setWallet("U2", 1000);

    const reply1 = h.send("U1", "G1", "50", "玩家一");
    const reply2 = h.send("U2", "G1", "下注60", "玩家二");

    assert.match(reply1, /21点开局/);
    assert.match(reply2, /21点开局/);
    assert.ok(h.getRound("G1", "U1"));
    assert.ok(h.getRound("G1", "U2"));
    assert.equal(h.getWallet("U1"), 950);
    assert.equal(h.getWallet("U2"), 940);
}

function testStandDealerBust() {
    const h = createHarness();
    h.setWallet("U1", 900);
    h.putRound(h.round({
        hands: [{ ...h.round().hands[0], cards: [h.card("10"), h.card("Q", "♥")] }],
        dealerHand: [h.card("10"), h.card("6", "♥")],
        deck: [h.card("K", "♦")],
    }));

    const reply = h.send("U1", "G1", "stand");

    assert.match(reply, /庄家爆牌/);
    assert.equal(h.getWallet("U1"), 1100);
    assert.equal(h.getRound("G1", "U1"), null);
}

function testHitBust() {
    const h = createHarness();
    h.setWallet("U1", 900);
    h.putRound(h.round({ deck: [h.card("5", "♦")] }));

    const reply = h.send("U1", "G1", "hit");

    assert.match(reply, /爆牌/);
    assert.equal(h.getWallet("U1"), 900);
    assert.equal(h.getRound("G1", "U1"), null);
}

function testNaturalBlackjackPayout() {
    const h = createHarness();
    h.setWallet("U1", 900);
    h.putRound(h.round({
        hands: [{ ...h.round().hands[0], cards: [h.card("A"), h.card("K", "♥")] }],
        dealerHand: [h.card("9"), h.card("7", "♥")],
    }));

    const reply = h.send("U1", "G1", "stand");

    assert.match(reply, /Blackjack/);
    assert.equal(h.getWallet("U1"), 1150);
}

function testInsuranceAgainstDealerBlackjack() {
    const h = createHarness();
    h.setWallet("U1", 900);
    h.putRound(h.round({
        phase: "insurance",
        hands: [{ ...h.round().hands[0], cards: [h.card("10"), h.card("9", "♥")] }],
        dealerHand: [h.card("A"), h.card("K", "♥")],
    }));

    const reply = h.send("U1", "G1", "insurance");

    assert.match(reply, /保险命中/);
    assert.equal(h.getWallet("U1"), 1000);
    assert.equal(h.getRound("G1", "U1"), null);
}

function testSurrender() {
    const h = createHarness();
    h.setWallet("U1", 900);
    h.putRound(h.round({
        hands: [{ ...h.round().hands[0], cards: [h.card("10"), h.card("6", "♥")] }],
    }));

    const reply = h.send("U1", "G1", "surrender");

    assert.match(reply, /投降/);
    assert.equal(h.getWallet("U1"), 950);
}

function testDoubleDown() {
    const h = createHarness();
    h.setWallet("U1", 900);
    h.putRound(h.round({
        hands: [{ ...h.round().hands[0], cards: [h.card("5"), h.card("6", "♥")] }],
        dealerHand: [h.card("9"), h.card("7", "♥")],
        deck: [h.card("K", "♦"), h.card("10", "♣")],
    }));

    const reply = h.send("U1", "G1", "double");

    assert.match(reply, /翻倍/);
    assert.match(reply, /庄家爆牌/);
    assert.equal(h.getWallet("U1"), 1200);
}

function testSplit() {
    const h = createHarness();
    h.setWallet("U1", 900);
    h.putRound(h.round({
        hands: [{ ...h.round().hands[0], cards: [h.card("8"), h.card("8", "♥")] }],
        dealerHand: [h.card("9"), h.card("7", "♥")],
        deck: [h.card("3", "♦"), h.card("2", "♣"), h.card("10", "♦")],
    }));

    const splitReply = h.send("U1", "G1", "split");
    const afterSplit = h.getRound("G1", "U1");
    assert.match(splitReply, /分牌/);
    assert.equal(afterSplit.hands.length, 2);
    assert.equal(h.getWallet("U1"), 800);

    h.send("U1", "G1", "stand");
    const finalReply = h.send("U1", "G1", "stand");
    assert.match(finalReply, /庄家爆牌/);
    assert.equal(h.getWallet("U1"), 1200);
}

function testSplitAces() {
    const h = createHarness();
    h.setWallet("U1", 900);
    h.putRound(h.round({
        hands: [{ ...h.round().hands[0], cards: [h.card("A"), h.card("A", "♥")] }],
        dealerHand: [h.card("9"), h.card("7", "♥")],
        deck: [h.card("K", "♦"), h.card("Q", "♣")],
    }));

    const reply = h.send("U1", "G1", "split");

    assert.match(reply, /分 A/);
    assert.equal(h.getWallet("U1"), 1200);
    assert.equal(h.getRound("G1", "U1"), null);
}

function testLegacyRoundRefund() {
    const h = createHarness();
    h.setWallet("U1", 100);
    h.setWallet("U2", 200);
    h.store.set(h.legacyRoundKey("G9"), JSON.stringify({
        groupId: "G9",
        players: [
            { userId: "U1", bet: 50 },
            { userId: "U2", bet: 30 },
        ],
    }));

    const reply = h.send("U1", "G9", "status");

    assert.match(reply, /已清理旧版多人21点/);
    assert.equal(h.getWallet("U1"), 150);
    assert.equal(h.getWallet("U2"), 230);
    assert.equal(h.store.has(h.legacyRoundKey("G9")), false);
}

const tests = [
    testDirectStartAndIsolation,
    testStandDealerBust,
    testHitBust,
    testNaturalBlackjackPayout,
    testInsuranceAgainstDealerBlackjack,
    testSurrender,
    testDoubleDown,
    testSplit,
    testSplitAces,
    testLegacyRoundRefund,
];

for (const test of tests) {
    test();
}

console.log(`blackjack tests passed: ${tests.length}`);
