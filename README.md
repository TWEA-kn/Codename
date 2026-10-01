# CODENAME · 联机版

两人合作、四人红蓝对战的像素词语推理游戏。创建房间后分享邀请链接，玩家各用自己的设备加入，全员准备后开始。

## 开发

要求 Node 24（本地 SQLite）。

```sh
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

本地房间保存至 `.local/rooms.sqlite`，不要提交。线上 Worker 使用 D1。迁移由 `npx drizzle-kit generate` 生成，生产发布应用迁移。

```sh
npm run build
node --test tests/*.test.mjs
```

## 词库

7 套内置词库。无畏契约 42 词（仅特工和地图），其余六套各 80 词。界面支持 TXT/JSON 导入、混合与去重。自定义词库保存在导入设备，选中后由房主同步到房间。

新增内置库：在 `src/data/wordpacks/` 添加 JSON；在 `server/rooms.js` 导入并加入 `packs`，使服务器可校验。前端自动发现 JSON。

```json
{"id":"unique-id","name":"主题名称","category":"主题","description":"简介","language":"zh-CN","words":["词语一","词语二"]}
```

实际需要 25–10000 个不重复词语，每词最多 24 字符。无畏契约名称参考 [英雄导航](https://wiki.biligame.com/valorant/Portal:英雄) 与 [地图导航](https://wiki.biligame.com/valorant/Portal:地图)。

规则、同步和权限说明见 [MULTIPLAYER.md](MULTIPLAYER.md)。

## 美术资源

Pixelarticons（MIT），Press Start 2P、Fusion Pixel（OFL），许可见 `public/assets/font-licenses/`。默认头像与特工头像由 ImageGen 生成；特工头像参考用户图片，记录在 `public/assets/valorant-avatars-notes.md`。
