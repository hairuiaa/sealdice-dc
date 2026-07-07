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

function normalizeGroupId(groupId) {
  if (!groupId) return '';
  const value = String(groupId);
  if (value.includes('Group')) return value;
  if (/^\d+$/.test(value)) return `QQ-Group:${value}`;
  return value;
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
    const endpoint = fileData.url
      ? `${backendUrl}/generate_uma?url=${encodeURIComponent(fileData.url)}`
      : `${backendUrl}/generate_uma_group_file?api_base=${encodeURIComponent(onebotApiUrl)}&group_id=${encodeURIComponent(onebotGroupId)}&file_id=${encodeURIComponent(fileData.file_id)}&filename=${encodeURIComponent(fileData.name)}`;
    const resp = await fetch(endpoint);
    const resJson = await readJsonResponse(resp, '赛马娘转换后端');

    if (resJson.status === 'ok') {
      const imgUrl = `${backendUrl}/get_img?title=${encodeURIComponent(resJson.name)}&t=${new Date().getTime()}`;
      seal.replyToSender(
        ctx,
        msg,
        `转换完成。\n角色：${resJson.character}\n总评：${resJson.rank} / ${resJson.eval_points}\n[CQ:image,file=${imgUrl},cache=0]`,
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
