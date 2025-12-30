import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Gantty マニュアル',
  description: 'WBS・ガントチャートエディタ Gantty の操作マニュアル',
  lang: 'ja-JP',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'ホーム', link: '/' },
      { text: 'はじめに', link: '/getting-started/' },
      { text: 'ビュー', link: '/views/' },
      { text: 'タスク管理', link: '/tasks/' },
      { text: 'チュートリアル', link: '/tutorials/' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'はじめに',
          items: [
            { text: '概要', link: '/getting-started/' },
            { text: 'インストール', link: '/getting-started/installation' },
            { text: '最初のプロジェクト', link: '/getting-started/first-project' },
          ]
        }
      ],
      '/views/': [
        {
          text: 'ビューの使い方',
          items: [
            { text: '概要', link: '/views/' },
            { text: 'リストビュー', link: '/views/list-view' },
            { text: 'ガントチャートビュー', link: '/views/gantt-view' },
            { text: 'カンバンビュー', link: '/views/kanban-view' },
          ]
        }
      ],
      '/tasks/': [
        {
          text: 'タスク管理',
          items: [
            { text: '概要', link: '/tasks/' },
            { text: 'タスクの作成・編集', link: '/tasks/create-edit' },
            { text: '階層構造（親子関係）', link: '/tasks/hierarchy' },
            { text: '日程と所要日数', link: '/tasks/dates-duration' },
            { text: '進捗管理', link: '/tasks/progress' },
            { text: 'ドラッグ&ドロップ操作', link: '/tasks/drag-drop' },
          ]
        }
      ],
      '/members/': [
        {
          text: 'メンバー管理',
          items: [
            { text: '概要', link: '/members/' },
            { text: 'メンバー登録', link: '/members/registration' },
            { text: 'タスクへの割り当て', link: '/members/assignment' },
          ]
        }
      ],
      '/status/': [
        {
          text: 'ステータス管理',
          items: [
            { text: '概要', link: '/status/' },
            { text: 'カスタマイズ', link: '/status/customization' },
          ]
        }
      ],
      '/files/': [
        {
          text: 'ファイル操作',
          items: [
            { text: '概要', link: '/files/' },
            { text: '保存と読み込み', link: '/files/save-open' },
          ]
        }
      ],
      '/tutorials/': [
        {
          text: 'チュートリアル',
          items: [
            { text: '一覧', link: '/tutorials/' },
            { text: '基本的なワークフロー', link: '/tutorials/basic-workflow' },
            { text: 'チームプロジェクト管理', link: '/tutorials/team-project' },
          ]
        }
      ],
      '/reference/': [
        {
          text: 'リファレンス',
          items: [
            { text: '概要', link: '/reference/' },
            { text: '用語集', link: '/reference/glossary' },
          ]
        }
      ],
      '/faq/': [
        {
          text: 'よくある質問',
          items: [
            { text: 'FAQ', link: '/faq/' },
          ]
        }
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/osawata36/gantty' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Gantty'
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '検索',
            buttonAriaLabel: '検索'
          },
          modal: {
            noResultsText: '結果が見つかりませんでした',
            resetButtonTitle: 'リセット',
            footer: {
              selectText: '選択',
              navigateText: '移動',
              closeText: '閉じる'
            }
          }
        }
      }
    },

    outline: {
      label: '目次'
    },

    docFooter: {
      prev: '前のページ',
      next: '次のページ'
    },

    lastUpdated: {
      text: '最終更新'
    },

    returnToTopLabel: 'トップに戻る',
  }
})
