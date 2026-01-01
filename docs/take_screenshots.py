"""
Take screenshots of the Gantty app for the user manual.
"""
from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        # Navigate to the app
        page.goto('http://localhost:1420')
        page.wait_for_load_state('networkidle')
        time.sleep(1)

        # 1. Initial empty state - List View
        print("Taking screenshot: 01_empty_list_view.png")
        page.screenshot(path='docs/images/01_empty_list_view.png')

        # Click "新規プロジェクト" if visible, or the app should already have an empty project
        # Let's add some tasks for the tutorial scenario

        # Add first task
        add_button = page.locator('button:has-text("タスクを追加")')
        if add_button.count() > 0:
            add_button.click()
            page.wait_for_timeout(300)
            page.keyboard.type('ウェブサイトリニューアル')
            page.keyboard.press('Enter')
            page.wait_for_timeout(500)

        # Add more tasks for a realistic project
        tasks = [
            '企画・設計フェーズ',
            'デザイン制作',
            '開発・実装',
            'テスト・検証',
            '本番リリース'
        ]

        for task in tasks:
            add_button = page.locator('button:has-text("タスクを追加")')
            if add_button.count() > 0:
                add_button.click()
                page.wait_for_timeout(300)
                page.keyboard.type(task)
                page.keyboard.press('Enter')
                page.wait_for_timeout(300)

        # 2. List view with tasks
        print("Taking screenshot: 02_list_view_with_tasks.png")
        page.screenshot(path='docs/images/02_list_view_with_tasks.png')

        # Add subtasks to first main task (企画・設計フェーズ)
        # Find the subtask button for the second task (index 1)
        subtask_buttons = page.locator('[aria-label="サブタスクを追加"]')
        if subtask_buttons.count() > 1:
            subtask_buttons.nth(1).click()
            page.wait_for_timeout(300)
            page.keyboard.type('要件定義')
            page.keyboard.press('Enter')
            page.wait_for_timeout(300)
            page.keyboard.type('ワイヤーフレーム作成')
            page.keyboard.press('Enter')
            page.wait_for_timeout(300)
            page.keyboard.type('サイトマップ作成')
            page.keyboard.press('Escape')
            page.wait_for_timeout(500)

        # 3. List view with hierarchy
        print("Taking screenshot: 03_list_view_hierarchy.png")
        page.screenshot(path='docs/images/03_list_view_hierarchy.png')

        # Click on a task to open detail panel
        task_items = page.locator('[data-testid^="task-item-"]')
        if task_items.count() > 0:
            task_items.first.click()
            page.wait_for_timeout(500)

        # 4. Task detail panel
        print("Taking screenshot: 04_task_detail_panel.png")
        page.screenshot(path='docs/images/04_task_detail_panel.png')

        # Set dates for some tasks via detail panel
        start_date_input = page.locator('button:has-text("開始日を設定")')
        if start_date_input.count() > 0:
            start_date_input.click()
            page.wait_for_timeout(300)
            # Click a date in the calendar
            day_buttons = page.locator('[role="gridcell"] button')
            if day_buttons.count() > 5:
                day_buttons.nth(5).click()
                page.wait_for_timeout(300)

        # Close detail panel if open
        close_button = page.locator('[aria-label="Close"]')
        if close_button.count() > 0:
            close_button.first.click()
            page.wait_for_timeout(300)

        # Switch to Gantt View
        gantt_button = page.locator('button:has-text("ガント")')
        if gantt_button.count() > 0:
            gantt_button.click()
            page.wait_for_timeout(1000)

        # 5. Gantt view
        print("Taking screenshot: 05_gantt_view.png")
        page.screenshot(path='docs/images/05_gantt_view.png')

        # Switch to Kanban View
        kanban_button = page.locator('button:has-text("カンバン")')
        if kanban_button.count() > 0:
            kanban_button.click()
            page.wait_for_timeout(1000)

        # 6. Kanban view
        print("Taking screenshot: 06_kanban_view.png")
        page.screenshot(path='docs/images/06_kanban_view.png')

        # Switch to Network View
        network_button = page.locator('button:has-text("ネットワーク")')
        if network_button.count() > 0:
            network_button.click()
            page.wait_for_timeout(1000)

        # 7. Network view
        print("Taking screenshot: 07_network_view.png")
        page.screenshot(path='docs/images/07_network_view.png')

        # Go back to list view for member management
        list_button = page.locator('button:has-text("リスト")')
        if list_button.count() > 0:
            list_button.click()
            page.wait_for_timeout(500)

        # Open member management dialog
        member_button = page.locator('button:has-text("メンバー")')
        if member_button.count() > 0:
            member_button.click()
            page.wait_for_timeout(500)

        # 8. Member management dialog
        print("Taking screenshot: 08_member_dialog.png")
        page.screenshot(path='docs/images/08_member_dialog.png')

        # Add a member
        add_member = page.locator('button:has-text("メンバーを追加")')
        if add_member.count() > 0:
            add_member.click()
            page.wait_for_timeout(300)
            name_input = page.locator('input[placeholder*="名前"]')
            if name_input.count() > 0:
                name_input.fill('田中太郎')
                page.wait_for_timeout(300)

        # Close dialog
        close_buttons = page.locator('button[aria-label="Close"], button:has-text("閉じる")')
        if close_buttons.count() > 0:
            close_buttons.first.click()
            page.wait_for_timeout(300)

        # Open status management dialog
        status_button = page.locator('button:has-text("ステータス")')
        if status_button.count() > 0:
            status_button.click()
            page.wait_for_timeout(500)

        # 9. Status management dialog
        print("Taking screenshot: 09_status_dialog.png")
        page.screenshot(path='docs/images/09_status_dialog.png')

        browser.close()
        print("All screenshots taken successfully!")

if __name__ == "__main__":
    main()
