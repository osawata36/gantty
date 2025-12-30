.PHONY: install dev build preview clean test test-ui test-coverage test-e2e test-e2e-ui test-e2e-headed lint format check tauri-dev tauri-build help

# デフォルトターゲット
.DEFAULT_GOAL := help

#==============================================================================
# 初期化
#==============================================================================

## 依存関係をインストール
install:
	npm install
	npx playwright install

#==============================================================================
# 開発
#==============================================================================

## 開発サーバーを起動（Webのみ）
dev:
	npm run dev

## Tauriデスクトップアプリで開発サーバーを起動
tauri-dev:
	npm run tauri dev

#==============================================================================
# ビルド
#==============================================================================

## Webアプリをビルド
build:
	npm run build

## ビルド結果をプレビュー
preview:
	npm run preview

## Tauriデスクトップアプリをビルド
tauri-build:
	npm run tauri build

## ビルド成果物を削除
clean:
	rm -rf dist
	rm -rf src-tauri/target

#==============================================================================
# テスト
#==============================================================================

## ユニットテストを実行
test:
	npm run test

## ユニットテストをUIモードで実行
test-ui:
	npm run test:ui

## カバレッジ付きでユニットテストを実行
test-coverage:
	npm run test:coverage

## E2Eテストを実行
test-e2e:
	npm run test:e2e

## E2EテストをUIモードで実行
test-e2e-ui:
	npm run test:e2e:ui

## E2Eテストをheadedモードで実行
test-e2e-headed:
	npm run test:e2e:headed

## すべてのテストを実行
test-all: test test-e2e

#==============================================================================
# コード品質
#==============================================================================

## ESLintでコードをチェック
lint:
	npm run lint

## Prettierでコードをフォーマット
format:
	npm run format

## lint + テストを実行（CI用）
check: lint test test-e2e

#==============================================================================
# デプロイ
#==============================================================================

## リリースビルドを作成（Tauriアプリ）
release: check tauri-build
	@echo "Release build completed: src-tauri/target/release/bundle/"

#==============================================================================
# ヘルプ
#==============================================================================

## このヘルプを表示
help:
	@echo "Gantty - WBS & Gantt Chart Editor"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo ""
	@echo "  \033[1m初期化\033[0m"
	@echo "    \033[36minstall\033[0m          依存関係をインストール"
	@echo ""
	@echo "  \033[1m開発\033[0m"
	@echo "    \033[36mdev\033[0m              開発サーバーを起動（Webのみ）"
	@echo "    \033[36mtauri-dev\033[0m        Tauriデスクトップアプリで開発サーバーを起動"
	@echo ""
	@echo "  \033[1mビルド\033[0m"
	@echo "    \033[36mbuild\033[0m            Webアプリをビルド"
	@echo "    \033[36mpreview\033[0m          ビルド結果をプレビュー"
	@echo "    \033[36mtauri-build\033[0m      Tauriデスクトップアプリをビルド"
	@echo "    \033[36mclean\033[0m            ビルド成果物を削除"
	@echo ""
	@echo "  \033[1mテスト\033[0m"
	@echo "    \033[36mtest\033[0m             ユニットテストを実行"
	@echo "    \033[36mtest-ui\033[0m          ユニットテストをUIモードで実行"
	@echo "    \033[36mtest-coverage\033[0m    カバレッジ付きでユニットテストを実行"
	@echo "    \033[36mtest-e2e\033[0m         E2Eテストを実行"
	@echo "    \033[36mtest-e2e-ui\033[0m      E2EテストをUIモードで実行"
	@echo "    \033[36mtest-e2e-headed\033[0m  E2Eテストをheadedモードで実行"
	@echo "    \033[36mtest-all\033[0m         すべてのテストを実行"
	@echo ""
	@echo "  \033[1mコード品質\033[0m"
	@echo "    \033[36mlint\033[0m             ESLintでコードをチェック"
	@echo "    \033[36mformat\033[0m           Prettierでコードをフォーマット"
	@echo "    \033[36mcheck\033[0m            lint + テストを実行（CI用）"
	@echo ""
	@echo "  \033[1mデプロイ\033[0m"
	@echo "    \033[36mrelease\033[0m          リリースビルドを作成（Tauriアプリ）"
