import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Gantty マニュアル',
  description: 'シンプルで強力なWBS・ガントチャートエディタ',
  lang: 'ja-JP',
  base: '/gantty/',

  head: [
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'ja_JP' }],
    ['meta', { name: 'og:site_name', content: 'Gantty Manual' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'ホーム', link: '/' },
      { text: 'チュートリアル', link: '/tutorial/' },
      { text: 'リファレンス', link: '/reference/' }
    ],

    sidebar: {
      '/tutorial/': [
        {
          text: 'はじめに',
          items: [
            { text: '概要', link: '/tutorial/' },
            { text: 'Step 1: プロジェクトを始める', link: '/tutorial/step1-start-project' },
            { text: 'Step 2: タスクを追加する', link: '/tutorial/step2-add-tasks' },
            { text: 'Step 3: 階層構造を作る', link: '/tutorial/step3-hierarchy' },
            { text: 'Step 4: 日程を設定する', link: '/tutorial/step4-schedule' },
            { text: 'Step 5: ガントチャートを活用する', link: '/tutorial/step5-gantt' },
            { text: 'Step 6: カンバンで進捗管理', link: '/tutorial/step6-kanban' },
            { text: 'Step 7: チームメンバー管理', link: '/tutorial/step7-members' },
            { text: 'Step 8: ネットワーク図', link: '/tutorial/step8-network' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'リファレンス',
          items: [
            { text: '概要', link: '/reference/' },
            { text: 'ビュー', link: '/reference/views' },
            { text: 'タスク', link: '/reference/tasks' },
            { text: 'メンバー', link: '/reference/members' },
            { text: 'ステータス', link: '/reference/status' },
            { text: 'ファイル操作', link: '/reference/files' },
            { text: '用語集', link: '/reference/glossary' }
          ]
        }
      ]
    },

    search: {
      provider: 'local'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/osawata36/gantty' }
    ],

    footer: {
      message: '🤖 このプロジェクトはAIエージェント（Claude Code）の学習・検証目的で作成されています',
      copyright: 'MIT License | Built with Claude Code'
    },

    docFooter: {
      prev: '前のページ',
      next: '次のページ'
    },

    outline: {
      label: 'このページの内容'
    },

    lastUpdated: {
      text: '最終更新'
    }
  }
})
