# XMind MCP Server

TypeScript製のXMindマインドマップを作成・管理するためのMCPサーバーです。

## 機能

- マインドマップの作成
- トピック（ノード）の追加
- マインドマップ構造の取得
- XMind形式でのファイル保存
- マインドマップ一覧の表示

## インストール

```bash
npm install -g @inoue2002/xmind-mcp
```

または、npxで直接使用することもできます（インストール不要）。

## 使用方法

### Claude DesktopでMCPサーバーとして使用

`~/Library/Application Support/Claude/claude_desktop_config.json` に以下を追加：

**npxを使用する場合（推奨）：**
```json
{
  "mcpServers": {
    "xmind": {
      "command": "npx",
      "args": ["-y", "@inoue2002/xmind-mcp"]
    }
  }
}
```

**グローバルインストールした場合：**
```json
{
  "mcpServers": {
    "xmind": {
      "command": "xmind-mcp"
    }
  }
}
```

## 利用可能なツール

### 1. create_mindmap
新しいマインドマップを作成します。

```json
{
  "title": "プロジェクト計画",
  "rootTitle": "メイントピック"
}
```

### 2. add_topic
既存のトピックに新しいトピックを追加します。

```json
{
  "mindMapId": "mindmap_1",
  "parentTopicId": "topic_1",
  "title": "サブトピック"
}
```

### 3. get_mindmap
マインドマップの構造を取得します。

```json
{
  "mindMapId": "mindmap_1"
}
```

### 4. list_mindmaps
作成したマインドマップの一覧を表示します。

```json
{}
```

### 5. save_mindmap
マインドマップをXMindファイルとして保存します。

```json
{
  "mindMapId": "mindmap_1",
  "filePath": "/path/to/output.xmind"
}
```

## 開発

```bash
# ビルド
npm run build

# ウォッチモード
npm run watch

# 実行
npm start
```

## ライセンス

MIT
