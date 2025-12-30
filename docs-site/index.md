---
layout: home

hero:
  name: "Gantty"
  text: "シンプルで強力なWBS・ガントチャートエディタ"
  tagline: プロジェクトのスコープとスケジュールを直感的に管理
  actions:
    - theme: brand
      text: はじめる
      link: /getting-started/
    - theme: alt
      text: チュートリアル
      link: /tutorials/

features:
  - icon: 📋
    title: リストビュー
    details: タスクを階層的に管理し、WBS（作業分解構成図）を簡単に作成できます。インライン編集やドラッグ&ドロップで直感的に操作。
    link: /views/list-view
    linkText: 詳しく見る
  - icon: 📊
    title: ガントチャートビュー
    details: 日程を視覚的に把握し、タスクバーをドラッグして期間を調整。日/週/月のスケール切り替えで全体像から詳細まで確認できます。
    link: /views/gantt-view
    linkText: 詳しく見る
  - icon: 🗂️
    title: カンバンビュー
    details: ステータス別にタスクをカード形式で表示。ドラッグ&ドロップでステータスを変更し、進捗を一目で把握できます。
    link: /views/kanban-view
    linkText: 詳しく見る
  - icon: 👥
    title: メンバー管理
    details: チームメンバーを登録し、タスクに責任者とボール（現担当者）を割り当て。誰が何を担当しているか明確に管理できます。
    link: /members/
    linkText: 詳しく見る
---

## クイックスタート

Ganttyは起動するとすぐにタスクを追加できます。3ステップで始めましょう。

<div class="quick-start">

### Step 1: アプリを起動

アプリを起動すると、自動的に新しいプロジェクトが作成されます。すぐにタスクの入力を開始できます。

### Step 2: タスクを追加

「タスクを追加」ボタンをクリックし、タスク名を入力してEnterキーを押します。サブタスクを追加して階層構造を作ることもできます。

### Step 3: 日程を設定

タスクをクリックして詳細パネルを開き、開始日と終了日（または所要日数）を設定します。ガントチャートビューに切り替えると、タスクバーとして表示されます。

</div>

## 主な機能

| 機能 | 説明 |
|------|------|
| 📁 プロジェクトファイル | .gantty形式で保存・読み込み |
| 🌳 階層構造 | 親子関係でタスクを整理 |
| 📅 日程管理 | 開始日・終了日・所要日数を設定 |
| 📈 進捗管理 | 0-100%の進捗率を設定 |
| 🏷️ ステータス | カスタマイズ可能なステータス |
| 👤 責任者・ボール | タスクの担当者を明確化 |
| 🖱️ ドラッグ&ドロップ | 直感的なタスク操作 |

## ドキュメント

<div class="doc-links">

- **[はじめに](/getting-started/)** - インストールと最初のプロジェクト
- **[ビューの使い方](/views/)** - リスト・ガント・カンバンビュー
- **[タスク管理](/tasks/)** - タスクの作成・編集・階層化
- **[メンバー管理](/members/)** - チームメンバーの登録と割り当て
- **[ステータス管理](/status/)** - ステータスのカスタマイズ
- **[ファイル操作](/files/)** - 保存と読み込み
- **[チュートリアル](/tutorials/)** - ステップバイステップガイド
- **[よくある質問](/faq/)** - FAQ

</div>

<style>
.quick-start {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}

.quick-start h3 {
  margin-top: 1rem;
  color: var(--vp-c-brand-1);
}

.doc-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.5rem;
}

.doc-links ul {
  list-style: none;
  padding: 0;
}

.doc-links li {
  padding: 0.25rem 0;
}
</style>
