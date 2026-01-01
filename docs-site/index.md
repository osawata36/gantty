---
layout: home

hero:
  name: "Gantty"
  text: "シンプルで強力な WBS・ガントチャートエディタ"
  tagline: 🤖 このプロジェクトはAIエージェント（Claude Code）の学習・検証目的で作成されています
  image:
    src: /images/05_gantt_view.png
    alt: Gantty ガントチャートビュー
  actions:
    - theme: brand
      text: チュートリアルを始める
      link: /tutorial/
    - theme: alt
      text: リファレンス
      link: /reference/

features:
  - icon: 📋
    title: リストビュー
    details: タスクを階層的に管理。ドラッグ&ドロップで簡単に構造を変更できます。
  - icon: 📊
    title: ガントチャート
    details: 日程を視覚的に把握。バーをドラッグして直感的にスケジュール調整。
  - icon: 🎯
    title: カンバンビュー
    details: ステータス別にタスクを整理。進捗状況を一目で確認できます。
  - icon: 🔗
    title: ネットワーク図
    details: タスク間の依存関係を可視化。クリティカルパスを把握できます。
---

::: warning ⚠️ 学習目的のプロジェクトです
このアプリケーションは、AIエージェント（Claude Code）によるソフトウェア開発の学習・検証を目的として作成されています。実際のプロジェクト管理での使用は想定していません。
:::

## クイックスタート

<div class="quick-start">

### 1. アプリを起動

起動すると自動で新規プロジェクトが作成されます。

### 2. タスクを追加

「タスクを追加」ボタンをクリックして、タスク名を入力します。

### 3. 日程を設定

タスクをクリックして詳細パネルを開き、開始日・終了日を設定します。

</div>

<style>
.quick-start {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}

.quick-start h3 {
  margin-top: 1rem;
}

.quick-start h3:first-child {
  margin-top: 0;
}
</style>
