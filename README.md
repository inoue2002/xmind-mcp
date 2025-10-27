# XMind MCP Server

TypeScript製のXMindマインドマップを作成・管理するためのMCPサーバーです。

## 機能

- マインドマップの作成
- トピック（ノード）の追加
- マインドマップ構造の取得
- XMind形式でのファイル保存
- 既存のXMindファイルの読み込み
- マインドマップ一覧の表示

## インストール

```bash
claude mcp add xmind npx -- -y @inoue2002/xmind-mcp
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

### 6. load_mindmap
既存のXMindファイルを読み込んで編集可能にします。

```json
{
  "filePath": "/path/to/existing.xmind"
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
