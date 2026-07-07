// ==UserScript==
// @name         COC角色卡转赛马娘育成卡
// @author       Air, Codex
// @version      1.0.4
// @description  上传 Excel 格式 COC 角色卡后，用 .赛马娘 生成赛马娘风格育成卡
// @timestamp    1783468800
// @license      MIT
// ==/UserScript==

let ext = seal.ext.find('coc-uma-card');
if (!ext) {
  ext = seal.ext.new('coc-uma-card', 'Air, Codex', '1.0.0');
  seal.ext.register(ext);
}

seal.ext.registerStringConfig(ext, 'OneBot_API_地址', 'http://luckylillia:3010/api', 'llbot/Milky 的 HTTP 监听地址，末尾不要带斜杠');
seal.ext.registerStringConfig(ext, '赛马娘转换后端', 'http://coc-uma-card:21999', 'uma_musume.py 的服务地址。Docker 部署时推荐把后端放进 sealdice-ai_sealnet 网络。');

const HORSE_TEAM_SLOT_ALIASES = {
  上等: 'upper',
  上: 'upper',
  上马: 'upper',
  upper: 'upper',
  中等: 'middle',
  中: 'middle',
  中马: 'middle',
  middle: 'middle',
  下等: 'lower',
  下: 'lower',
  下马: 'lower',
  lower: 'lower',
};

const HORSE_TEAM_SLOT_LABELS = {
  upper: '上等',
  middle: '中等',
  lower: '下等',
};

const APTITUDE_LABELS = {
  melee: '近战',
  ranged: '远程',
  city: '城市',
  wild: '野外',
  library: '文献',
  data: '资料',
  endurance: '耐久',
  emergency: '应急',
  mental: '精神',
  luck: '运气',
};

function normalizeGroupId(groupId) {
  if (!groupId) return '';
  const value = String(groupId);
  if (value.includes('Group')) return value;
  if (/^\d+$/.test(value)) return `QQ-Group:${value}`;
  return value;
}

function plainGroupId(ctx) {
  const groupId = normalizeGroupId(ctx.group && ctx.group.groupId);
  return groupId.replace('QQ-Group:', '');
}

function playerKey(ctx) {
  return ctx.player && ctx.player.userId ? ctx.player.userId.replace(/^QQ:/, '') : '';
}

function playerName(ctx) {
  return (ctx.player && ctx.player.name) || `玩家${playerKey(ctx)}`;
}

function backendBase() {
  let backendUrl = seal.ext.getStringConfig(ext, '赛马娘转换后端');
  if (backendUrl.endsWith('/')) backendUrl = backendUrl.slice(0, -1);
  return backendUrl;
}

function buildQuery(params) {
  const parts = [];
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  });
  return parts.join('&');
}

async function backendGet(path, params) {
  const url = `${backendBase()}${path}?${buildQuery(params)}`;
  const resp = await fetch(url);
  return readJsonResponse(resp, '赛马娘马赛后端');
}

function collectArgs(cmdArgs, startIndex) {
  const rest = [];
  for (let i = startIndex; i <= cmdArgs.args.length; i++) {
    const item = cmdArgs.getArgN(i);
    if (item) rest.push(item);
  }
  return rest;
}

function extractAtQQ(msg) {
  const match = msg && msg.message ? msg.message.match(/\[CQ:at,qq=(\d+)\]/) : null;
  return match ? match[1] : '';
}

function formatCardLine(card, index) {
  const prefix = index ? `${index}. ` : '';
  return `${prefix}${card.name}｜${card.rank} ${card.eval_points}｜速${card.stats.speed} 耐${card.stats.stamina} 力${card.stats.power} 根${card.stats.guts} 智${card.stats.wisdom}`;
}

function formatTeamSlots(team) {
  const slots = team && team.slots ? team.slots : {};
  return ['upper', 'middle', 'lower'].map((slot) => {
    const item = slots[slot] || {};
    const card = item.card;
    if (!card) return `${HORSE_TEAM_SLOT_LABELS[slot]}：未设置`;
    return `${HORSE_TEAM_SLOT_LABELS[slot]}：${card.name}｜${card.rank} ${card.eval_points}`;
  }).join('\n');
}

function economyUserId(ctx, msg) {
  if (ctx && ctx.player && ctx.player.userId) return ctx.player.userId;
  if (msg && msg.sender && msg.sender.userId) return msg.sender.userId;
  if (msg && msg.sender && msg.sender.user_id) return msg.sender.user_id;
  const key = playerKey(ctx);
  return key ? `QQ:${key}` : '';
}

function getEconomyExt() {
  const economy = seal.ext.find('slot-economy');
  if (!economy || typeof economy.storageGet !== 'function' || typeof economy.storageSet !== 'function') {
    return null;
  }
  return economy;
}

function economyStorageGetInt(economy, key, fallback) {
  const raw = economy.storageGet(key);
  if (raw === undefined || raw === null || raw === '') return fallback;
  const value = Number.parseInt(String(raw), 10);
  return Number.isSafeInteger(value) ? value : fallback;
}

function economyStorageSetInt(economy, key, value) {
  economy.storageSet(key, String(Math.max(0, Math.floor(Number(value) || 0))));
}

function economyWalletKey(userId) {
  return `wallet:${userId}`;
}

function economyDebtKey(userId) {
  return `debt:${userId}`;
}

function economyWorkStartKey(userId) {
  return `workStart:${userId}`;
}

function economyGetWallet(economy, userId) {
  return economyStorageGetInt(economy, economyWalletKey(userId), 0);
}

function economySetWallet(economy, userId, amount) {
  economyRememberUser(economy, userId);
  economyStorageSetInt(economy, economyWalletKey(userId), amount);
}

function economyCurrency(economy) {
  try {
    const value = seal.ext.getStringConfig(economy, '货币名');
    if (typeof value === 'string' && value.length > 0) return value;
  } catch (e) {}
  return '金币';
}

function economyRememberUser(economy, userId, name) {
  if (!userId) return;
  let users = [];
  const raw = economy.storageGet('walletUsers');
  if (raw) {
    try {
      const parsed = JSON.parse(String(raw));
      if (Array.isArray(parsed)) users = parsed.map((item) => String(item));
    } catch (e) {}
  }
  if (!users.includes(userId)) {
    users.push(userId);
    economy.storageSet('walletUsers', JSON.stringify(users));
  }
  if (name) economy.storageSet(`walletName:${userId}`, name);
}

function parseBetAmount(value) {
  const amount = Number.parseInt(String(value || '').replace(/[^\d]/g, ''), 10);
  if (!Number.isSafeInteger(amount) || amount <= 0) return 0;
  return amount;
}

function saveCocExcelFile(ctx, msg, file) {
  const groupId = normalizeGroupId(
    (msg && msg.groupId) || (ctx && ctx.group && ctx.group.groupId) || (file && file.group_id),
  );
  if (!groupId || !file) return;

  const filename = file.name || file.file || file.filename || file.file_name || file.fileName || '';
  if (!filename) return;

  const lowerName = filename.toLowerCase();
  if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) return;

  const fileInfo = {
    name: filename,
    file_id: file.id || file.file_id || '',
    busid: file.busid || 0,
    url: file.url || file.file_url || file.fileUrl || file.download_url || file.downloadUrl || '',
    uploaded_time: file.uploaded_time || file.uploadedTime || Math.floor(Date.now() / 1000),
  };
  if (!fileInfo.file_id && !fileInfo.url) return;

  ext.storageSet(`coc_last_excel_${groupId}`, JSON.stringify(fileInfo));
}

ext.onGroupUpload = (ctx, msg, file) => {
  saveCocExcelFile(ctx, msg, file);
};

ext.onNotCommandReceived = (ctx, msg) => {
  if (!msg || !msg.groupId || !msg.message) return;
  if (!msg.message.includes('[CQ:file,')) return;

  const match = msg.message.match(/\[CQ:file,([^\]]+)\]/);
  if (!match || !match[1]) return;

  const params = {};
  match[1].split(',').forEach((seg) => {
    const pos = seg.indexOf('=');
    if (pos <= 0) return;
    const key = seg.slice(0, pos).trim();
    const value = seg.slice(pos + 1).trim();
    params[key] = value;
  });

  saveCocExcelFile(ctx, msg, {
    id: params.file_id || '',
    name: params.file || params.name || '',
    busid: params.busid || 0,
    url: params.url || params.file_url || params.download_url || '',
  });
};

const cmdUma = seal.ext.newCmdItemInfo();
cmdUma.name = '赛马娘';
cmdUma.help = '用法：上传 Excel 格式的 COC 角色卡后，输入 .赛马娘 生成育成卡。';

async function readJsonResponse(resp, label) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    const preview = text ? text.slice(0, 120) : '空响应';
    throw new Error(`${label}返回非 JSON：${preview}`);
  }
}

async function fetchDownloadUrl(apiBase, groupId, fileData) {
  const milkyResp = await fetch(`${apiBase}/get_group_file_download_url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      group_id: groupId,
      file_id: fileData.file_id,
    }),
  });
  const milkyJson = await readJsonResponse(milkyResp, 'llbot 文件下载接口');
  if (milkyJson && milkyJson.data && milkyJson.data.download_url) {
    return milkyJson.data.download_url;
  }

  const onebotResp = await fetch(`${apiBase}/get_group_file_url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      group_id: groupId,
      file_id: fileData.file_id,
      busid: fileData.busid,
    }),
  }).catch(() => null);

  if (onebotResp) {
    const onebotJson = await readJsonResponse(onebotResp, 'OneBot 文件下载接口').catch(() => null);
    if (onebotJson && onebotJson.data && onebotJson.data.url) {
      return onebotJson.data.url;
    }
  }

  const msg = milkyJson && milkyJson.message ? milkyJson.message : '未知错误';
  throw new Error(`获取群文件下载链接失败：${msg}`);
}

async function fetchLatestGroupExcel(apiBase, groupId, uploaderId) {
  const resp = await fetch(`${apiBase}/get_group_files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      group_id: groupId,
      parent_folder_id: '/',
    }),
  });
  const json = await readJsonResponse(resp, 'llbot 群文件列表接口');
  const files = json && json.data && Array.isArray(json.data.files) ? json.data.files : [];
  const excelFiles = files
    .filter((file) => {
      const filename = file.file_name || file.name || '';
      const lowerName = filename.toLowerCase();
      return lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    })
    .sort((a, b) => (b.uploaded_time || 0) - (a.uploaded_time || 0));

  if (excelFiles.length === 0) return null;

  const uploaderFile = uploaderId
    ? excelFiles.find((file) => String(file.uploader_id || '') === String(uploaderId))
    : null;
  const file = uploaderFile || excelFiles[0];

  return {
    name: file.file_name || file.name || 'COC角色卡.xlsx',
    file_id: file.file_id || file.id || '',
    busid: file.busid || 0,
    url: file.url || file.download_url || '',
    uploaded_time: file.uploaded_time || 0,
  };
}

cmdUma.solve = async (ctx, msg, cmdArgs) => {
  const groupId = normalizeGroupId(ctx.group && ctx.group.groupId);
  if (!groupId || !groupId.includes('Group')) {
    seal.replyToSender(ctx, msg, '该功能仅限群聊使用。');
    return seal.ext.newCmdExecuteResult(true);
  }

  let onebotApiUrl = seal.ext.getStringConfig(ext, 'OneBot_API_地址');
  if (onebotApiUrl.endsWith('/')) onebotApiUrl = onebotApiUrl.slice(0, -1);
  let backendUrl = seal.ext.getStringConfig(ext, '赛马娘转换后端');
  if (backendUrl.endsWith('/')) backendUrl = backendUrl.slice(0, -1);

  const onebotGroupId = parseInt(groupId.replace('QQ-Group:', ''));
  const playerId = ctx.player && ctx.player.userId ? ctx.player.userId.replace(/^QQ:/, '') : '';
  const fileDataStr = ext.storageGet(`coc_last_excel_${groupId}`);
  let fileData = null;

  try {
    fileData = await fetchLatestGroupExcel(onebotApiUrl, onebotGroupId, playerId);
    if (fileData) {
      ext.storageSet(`coc_last_excel_${groupId}`, JSON.stringify(fileData));
    }
  } catch (e) {
    console.error('读取群文件列表失败: ', e);
  }

  if (!fileData && fileDataStr) {
    try {
      fileData = JSON.parse(fileDataStr);
    } catch (e) {
      fileData = null;
    }
  }

  if (!fileData) {
    seal.replyToSender(ctx, msg, '当前群没有检测到 Excel 角色卡。请先发送角色卡表格。');
    return seal.ext.newCmdExecuteResult(true);
  }

  seal.replyToSender(ctx, msg, `正在转换【${fileData.name}】，请稍候。`);

  try {
    const commonParams = `user_key=${encodeURIComponent(playerId)}&group_id=${encodeURIComponent(onebotGroupId)}&user_name=${encodeURIComponent(playerName(ctx))}`;
    const endpoint = fileData.url
      ? `${backendUrl}/generate_uma?url=${encodeURIComponent(fileData.url)}&${commonParams}`
      : `${backendUrl}/generate_uma_group_file?api_base=${encodeURIComponent(onebotApiUrl)}&group_id=${encodeURIComponent(onebotGroupId)}&file_id=${encodeURIComponent(fileData.file_id)}&filename=${encodeURIComponent(fileData.name)}&${commonParams}`;
    const resp = await fetch(endpoint);
    const resJson = await readJsonResponse(resp, '赛马娘转换后端');

    if (resJson.status === 'ok') {
      const imgUrl = `${backendUrl}/get_img?title=${encodeURIComponent(resJson.name)}&t=${new Date().getTime()}`;
      const stableText = resJson.stable_saved ? '\n已加入马房。' : '';
      seal.replyToSender(
        ctx,
        msg,
        `转换完成。\n角色：${resJson.character}\n总评：${resJson.rank} / ${resJson.eval_points}${stableText}\n[CQ:image,file=${imgUrl},cache=0]`,
      );
      ext.storageSet(`coc_last_excel_${groupId}`, '');
    } else {
      seal.replyToSender(ctx, msg, `转换失败：${resJson.msg}`);
    }
  } catch (e) {
    console.error('赛马娘转换出错: ', e);
    seal.replyToSender(ctx, msg, `插件执行错误：${e.message}`);
  }

  return seal.ext.newCmdExecuteResult(true);
};

ext.cmdMap['赛马娘'] = cmdUma;
ext.cmdMap['uma'] = cmdUma;
ext.cmdMap['coc赛马娘'] = cmdUma;

const cmdStable = seal.ext.newCmdItemInfo();
cmdStable.name = '马房';
cmdStable.help = `马房：
.马房 列表
.马房 详情 <卡名>
.马房 删除 <卡名>`;

cmdStable.solve = async (ctx, msg, cmdArgs) => {
  const userKey = playerKey(ctx);
  const sub = (cmdArgs.getArgN(1) || '列表').toLowerCase();
  const rest = collectArgs(cmdArgs, 2);
  try {
    if (sub === '列表' || sub === 'list') {
      const result = await backendGet('/stable/list', { user_key: userKey });
      if (result.status !== 'ok') {
        seal.replyToSender(ctx, msg, `失败：${result.msg}`);
        return seal.ext.newCmdExecuteResult(true);
      }
      if (!result.cards.length) {
        seal.replyToSender(ctx, msg, '马房里还没有马。先用 .赛马娘 生成。');
        return seal.ext.newCmdExecuteResult(true);
      }
      const lines = result.cards.slice(0, 12).map((card, index) => formatCardLine(card, index + 1));
      seal.replyToSender(ctx, msg, `马房共有 ${result.count} 张卡。\n${lines.join('\n')}`);
    } else if (sub === '详情' || sub === 'detail') {
      const name = rest.join(' ').trim();
      if (!name) {
        seal.replyToSender(ctx, msg, '用法：.马房 详情 <卡名>');
        return seal.ext.newCmdExecuteResult(true);
      }
      const result = await backendGet('/stable/detail', { user_key: userKey, name });
      if (result.status !== 'ok') {
        seal.replyToSender(ctx, msg, `失败：${result.msg}`);
        return seal.ext.newCmdExecuteResult(true);
      }
      const card = result.card;
      const aptitudes = Object.keys(card.aptitudes || {}).map((key) => `${APTITUDE_LABELS[key] || key}:${card.aptitudes[key]}`).join(' ');
      seal.replyToSender(ctx, msg, `${formatCardLine(card)}\n适性：${aptitudes || '无'}`);
    } else if (sub === '删除' || sub === '移除' || sub === 'remove' || sub === 'delete') {
      const name = rest.join(' ').trim();
      if (!name) {
        seal.replyToSender(ctx, msg, '用法：.马房 删除 <卡名>');
        return seal.ext.newCmdExecuteResult(true);
      }
      const result = await backendGet('/stable/remove', { user_key: userKey, name });
      seal.replyToSender(ctx, msg, result.status === 'ok' ? result.msg : `失败：${result.msg}`);
    } else {
      seal.replyToSender(ctx, msg, cmdStable.help);
    }
  } catch (e) {
    seal.replyToSender(ctx, msg, `马房错误：${e.message}`);
  }
  return seal.ext.newCmdExecuteResult(true);
};

ext.cmdMap['马房'] = cmdStable;

const cmdHorseTeam = seal.ext.newCmdItemInfo();
cmdHorseTeam.name = '马队';
cmdHorseTeam.help = `马队：
.马队 设置 上等 <卡名>
.马队 设置 中等 <卡名>
.马队 设置 下等 <卡名>
.马队 列表`;

cmdHorseTeam.solve = async (ctx, msg, cmdArgs) => {
  const userKey = playerKey(ctx);
  const sub = (cmdArgs.getArgN(1) || '列表').toLowerCase();
  const groupId = plainGroupId(ctx);
  try {
    if (sub === '列表' || sub === 'list') {
      const result = await backendGet('/horse_team/list', {
        user_key: userKey,
        group_id: groupId,
        user_name: playerName(ctx),
      });
      if (result.status !== 'ok') {
        seal.replyToSender(ctx, msg, `失败：${result.msg}`);
        return seal.ext.newCmdExecuteResult(true);
      }
      seal.replyToSender(ctx, msg, `当前马队：\n${formatTeamSlots(result.team)}`);
    } else if (sub === '设置' || sub === 'set') {
      const slotRaw = cmdArgs.getArgN(2) || '';
      const slot = HORSE_TEAM_SLOT_ALIASES[slotRaw] || HORSE_TEAM_SLOT_ALIASES[slotRaw.toLowerCase()];
      const name = collectArgs(cmdArgs, 3).join(' ').trim();
      if (!slot || !name) {
        seal.replyToSender(ctx, msg, '用法：.马队 设置 上等 <卡名>');
        return seal.ext.newCmdExecuteResult(true);
      }
      const result = await backendGet('/horse_team/set', {
        user_key: userKey,
        group_id: groupId,
        user_name: playerName(ctx),
        slot,
        name,
      });
      if (result.status !== 'ok') {
        seal.replyToSender(ctx, msg, `失败：${result.msg}`);
        return seal.ext.newCmdExecuteResult(true);
      }
      seal.replyToSender(ctx, msg, `${result.msg}\n${formatTeamSlots(result.team)}`);
    } else {
      seal.replyToSender(ctx, msg, cmdHorseTeam.help);
    }
  } catch (e) {
    seal.replyToSender(ctx, msg, `马队错误：${e.message}`);
  }
  return seal.ext.newCmdExecuteResult(true);
};

ext.cmdMap['马队'] = cmdHorseTeam;

const cmdRace = seal.ext.newCmdItemInfo();
cmdRace.name = '马赛';
cmdRace.help = `马赛：
.马赛 出战 上中下
.马赛 出战 下 上 中
.马赛 出战 下上中 @对方
.马赛 下注 50 上中下
.赌马 50 下上中 @对方`;

async function runRaceAndReply(ctx, msg, order, opponentKey, betAmount) {
  const params = {
    user_key: playerKey(ctx),
    group_id: plainGroupId(ctx),
    user_name: playerName(ctx),
    order,
    opponent_key: opponentKey,
    opponent_name: opponentKey ? `玩家${opponentKey}` : '',
  };

  let economy = null;
  let economyId = '';
  let balanceBefore = 0;
  let currency = '金币';

  if (betAmount > 0) {
    economy = getEconomyExt();
    if (!economy) {
      seal.replyToSender(ctx, msg, '赌马需要先启用 dc模拟器。');
      return;
    }
    economyId = economyUserId(ctx, msg);
    if (!economyId) {
      seal.replyToSender(ctx, msg, '没有拿到你的钱包 ID。');
      return;
    }
    currency = economyCurrency(economy);
    economyRememberUser(economy, economyId, playerName(ctx));
    const workStart = economyStorageGetInt(economy, economyWorkStartKey(economyId), 0);
    if (workStart > 0) {
      seal.replyToSender(ctx, msg, '你正在打工，不能赌马。');
      return;
    }
    const debt = economyStorageGetInt(economy, economyDebtKey(economyId), 0);
    if (debt > 0) {
      seal.replyToSender(ctx, msg, `你还有欠债 ${debt}${currency}，先还债再赌马。`);
      return;
    }
    balanceBefore = economyGetWallet(economy, economyId);
    if (balanceBefore < betAmount) {
      seal.replyToSender(ctx, msg, `余额不足，当前余额：${balanceBefore}${currency}。本次下注需要：${betAmount}${currency}。`);
      return;
    }
    economySetWallet(economy, economyId, balanceBefore - betAmount);
  }

  try {
    seal.replyToSender(ctx, msg, betAmount > 0 ? `下注成功：${betAmount}${currency}。马赛开跑，请稍候。` : '马赛开跑，请稍候。');
    const result = await backendGet('/race/run', params);
    if (result.status !== 'ok') {
      if (betAmount > 0) economySetWallet(economy, economyId, balanceBefore);
      seal.replyToSender(ctx, msg, `失败：${result.msg}`);
      return;
    }
    const lines = (result.rounds || []).map((item) => item.text).join('\n');
    const imgUrl = `${backendBase()}/get_img?title=${encodeURIComponent(result.img)}&t=${Date.now()}`;
    let betText = '';
    if (betAmount > 0) {
      if (result.winner_side === 'user') {
        const payout = betAmount * 2;
        const balance = economyGetWallet(economy, economyId) + payout;
        economySetWallet(economy, economyId, balance);
        betText = `\n赌马结算：赢。返还 ${payout}${currency}。当前余额：${balance}${currency}。`;
      } else {
        const balance = economyGetWallet(economy, economyId);
        betText = `\n赌马结算：输。扣除 ${betAmount}${currency}。当前余额：${balance}${currency}。`;
      }
    }
    seal.replyToSender(
      ctx,
      msg,
      `马赛结束。\n比分：${result.score}\n胜者：${result.winner}\n对手：${result.opponent_name}\n${lines}${betText}\n[CQ:image,file=${imgUrl},cache=0]`,
    );
  } catch (e) {
    if (betAmount > 0) economySetWallet(economy, economyId, balanceBefore);
    seal.replyToSender(ctx, msg, `马赛错误：${e.message}`);
  }
}

cmdRace.solve = async (ctx, msg, cmdArgs) => {
  const groupId = plainGroupId(ctx);
  if (!groupId) {
    seal.replyToSender(ctx, msg, '马赛仅限群聊使用。');
    return seal.ext.newCmdExecuteResult(true);
  }

  const sub = (cmdArgs.getArgN(1) || '').toLowerCase();
  if (sub !== '出战' && sub !== 'run' && sub !== '下注' && sub !== '赌马' && sub !== 'bet') {
    seal.replyToSender(ctx, msg, cmdRace.help);
    return seal.ext.newCmdExecuteResult(true);
  }

  const isBet = sub === '下注' || sub === '赌马' || sub === 'bet';
  const betAmount = isBet ? parseBetAmount(cmdArgs.getArgN(2)) : 0;
  if (isBet && betAmount <= 0) {
    seal.replyToSender(ctx, msg, '用法：.马赛 下注 50 上中下');
    return seal.ext.newCmdExecuteResult(true);
  }
  const orderStart = isBet ? 3 : 2;
  const orderParts = collectArgs(cmdArgs, orderStart).filter((item) => !item.includes('[CQ:at,'));
  const order = orderParts.join('');
  const opponentKey = extractAtQQ(msg);
  if (!order) {
    seal.replyToSender(ctx, msg, isBet ? '用法：.马赛 下注 50 上中下' : '用法：.马赛 出战 上中下');
    return seal.ext.newCmdExecuteResult(true);
  }

  await runRaceAndReply(ctx, msg, order, opponentKey, betAmount);
  return seal.ext.newCmdExecuteResult(true);
};

ext.cmdMap['马赛'] = cmdRace;

const cmdRaceBet = seal.ext.newCmdItemInfo();
cmdRaceBet.name = '赌马';
cmdRaceBet.help = '赌马下注并出战。\n用法：.赌马 50 上中下 / .赌马 50 下上中 @对方';
cmdRaceBet.solve = async (ctx, msg, cmdArgs) => {
  const groupId = plainGroupId(ctx);
  if (!groupId) {
    seal.replyToSender(ctx, msg, '赌马仅限群聊使用。');
    return seal.ext.newCmdExecuteResult(true);
  }
  const betAmount = parseBetAmount(cmdArgs.getArgN(1));
  if (betAmount <= 0) {
    seal.replyToSender(ctx, msg, cmdRaceBet.help);
    return seal.ext.newCmdExecuteResult(true);
  }
  const orderParts = collectArgs(cmdArgs, 2).filter((item) => !item.includes('[CQ:at,'));
  const order = orderParts.join('');
  if (!order) {
    seal.replyToSender(ctx, msg, cmdRaceBet.help);
    return seal.ext.newCmdExecuteResult(true);
  }
  await runRaceAndReply(ctx, msg, order, extractAtQQ(msg), betAmount);
  return seal.ext.newCmdExecuteResult(true);
};

ext.cmdMap['赌马'] = cmdRaceBet;
