# COC 角色卡转赛马娘育成卡

把群文件里的 COC Excel 角色卡转换成赛马娘风格育成卡图片。

## 组成

- `uma_musume.py`：Flask 后端，负责下载、解析 Excel、计算属性并渲染图片。
- `赛马娘角色卡.js`：SeaDice 插件，接收群内指令并调用后端。
- `assets/`：图片模板、坐标表、评级徽章素材。
- `deploy/Dockerfile`：后端容器部署文件。
- `deploy/coc-uma-card.service`：可选的 systemd 部署文件。

## SeaDice 配置

插件内需要配置：

- `赛马娘转换后端`：后端地址，例如 `http://coc-uma-card:21999`。
- `OneBot_API_地址`：llbot / OneBot API 地址，例如 `http://luckylillia:3010/api`。

群内先上传 `.xlsx` 角色卡，再发送：

```text
赛马娘
```

生成成功后，角色会自动加入账号全局马房。

## 马房 / 马队 / 马赛

```text
.马房 列表
.马房 详情 <卡名>
.马房 删除 <卡名>
.丢掉马儿 <卡名>

.马队 设置 上等 <卡名>
.马队 设置 中等 <卡名>
.马队 设置 下等 <卡名>
.马队 列表

.马赛 出战 上中下
.马赛 出战 下 上 中
.马赛 出战 下上中 @对方
.马赛 下注 50 上中下
.赌马 50 下上中 @对方
.马娘help
```

马队按账号全局保存，上等马、中等马、下等马只是自选槽位。马赛为三局两胜，自己的出场顺序由指令决定，对手顺序随机；未 @ 时会从当前群已有完整马队的玩家里自动匹配。

赌马会联动 `dc模拟器` 的钱包。下注前扣除余额，获胜返还 `下注 * 2`，包含本金；比赛失败或后端异常时会退回下注。

## 后端运行

本地运行：

```bash
python -m pip install -r requirements.txt
python uma_musume.py
```

Docker 运行：

```bash
docker build -t coc-uma-card:local -f deploy/Dockerfile .
docker run -d --name coc-uma-card --restart unless-stopped -p 21999:21999 coc-uma-card:local
```

## Excel 兼容

后端会在读取前清洗部分异常 `.xlsx` 结构：

- 非法 XML 字符
- 裸 `&`
- 无效数据验证
- 损坏样式表
- 条件格式和单元格、行、列样式引用

这些格式信息不参与计算，清洗后只读取角色卡数值。
