# Claude Code移行用 現状レポ�EチE
作�E日: 2026-03-21
対象リポジトリ: `c:\Users\soya_\.gemini\antigravity\playground\nebular-flare`

こ�Eレポ�Eト�E、ローカルワークスペ�Eスのファイル確認、`git status`、`npm.cmd run lint -- .`、`npm.cmd test -- --run`、`npm.cmd run build` の実行結果をもとに作�EしてぁE��す、E
補足:
- こ�Eリポジトリは現在 `main...origin/main` で、未コミット変更と未追跡ファイルが多数あります、E- PowerShell 上では日本語が一部斁E��化けして見えたため、UI斁E��めE��本語データは Claude Code 側で UTF-8 エチE��タでも�E確認したほぁE��安�Eです、E- ユーザー認識では「猫の一生を記録する図鑑アプリ」ですが、コード�Eース上には「猫ケア/家族�E有アプリ」由来の構造がかなり残ってぁE��す、E
---

## 1. プロジェクト概要E
- アプリ吁E `にめE��ほど` 系の名前で運用されてぁE��形跡が強ぁE��す。補助吁E冁E��名として `NyaruHD`�E�EWA short name�E�と `nebular-flare`�E�Eackage名�ESupabase project_id�E�が併存してぁE��す、E- コンセプト�E�E、E斁E���E�E
  - 当�Eは「家族でめE��く記録できる猫ケア/生活ログアプリ」に近い設計です、E  - 現在は「猫の写真をAIで刁E��し、猫の一生を図鑁Eコレクションとして蓁E��する」方向へ強くピボットしてぁE��す、E- ターゲチE��プラチE��フォーム: 両方�E�EOS / Android�E�。ただぁEReact Native ではなく、Next.js 製の PWA / モバイルWeb が中忁E��す、E- 使用フレームワーク・言誁E
  - `Next.js 16.1.0`�E�Epp Router�E�E  - `React 19.2.3`
  - `TypeScript`
  - `Tailwind CSS 4`
- 主要な外部ライブラリ/パッケージ�E�一覧�E�E
  - UI/スタイル: `@radix-ui/react-*`, `framer-motion`, `lucide-react`, `sonner`, `recharts`, `class-variance-authority`, `clsx`, `tailwind-merge`
  - チE�Eタ/バックエンチE `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-query`
  - 画僁EメチE��ア: `browser-image-compression`, `html-to-image`, `html2canvas`
  - AI/通知: `openai`, `firebase`
  - ユーチE��リチE��: `date-fns`
  - チE��チE開発: `vitest`, `@testing-library/*`, `eslint`, `typescript`
- 現在の開発スチE�Eタス: 開発中。主要導線�E存在しますが、新旧実裁E�E新旧スキーマ�E未接続画面が混在しており、大規模再編の途中です、E
追加の客観惁E��:
- コード規模: `src` 207ファイル / 紁E6,886衁E- `scripts`: 29ファイル / 紁E,407衁E- `supabase/migrations`: 40ファイル / 紁E,269衁E- `supabase/functions`: 4ファイル / 紁E01衁E
---

## 2. フォルダ構�E

`node_modules`, `build`, `.git` は除外。`.next` は生�E物なので中身は展開せず、存在のみ記載します、E
```text
.
├── .agent/
━E  └── skills/
━E      └── vercel-react-native-skills/
━E          ├── AGENTS.md
━E          ├── SKILL.md
━E          └── rules/{animation-derived-value.md, animation-gesture-detector-press.md, animation-gpu-properties.md, design-system-compound-components.md, fonts-config-plugin.md, imports-design-system-folder.md, js-hoist-intl.md, list-performance-callbacks.md, list-performance-function-references.md, list-performance-images.md, list-performance-inline-objects.md, list-performance-item-expensive.md, list-performance-item-memo.md, list-performance-item-types.md, list-performance-virtualize.md, monorepo-native-deps-in-app.md, monorepo-single-dependency-versions.md, navigation-native-navigators.md, react-compiler-destructure-functions.md, react-compiler-reanimated-shared-values.md, react-state-dispatcher.md, react-state-fallback.md, react-state-minimize.md, rendering-no-falsy-and.md, rendering-text-in-text-component.md, scroll-position-no-state.md, state-ground-truth.md, ui-expo-image.md, ui-image-gallery.md, ui-measure-views.md, ui-menus.md, ui-native-modals.md, ui-pressable.md, ui-safe-area-scroll.md, ui-scrollview-content-inset.md, ui-styling.md}
├── .agents/
━E  ├── rules.txt
━E  └── skills/
━E      └── vercel-react-native-skills/ (`.agent` と同一構�E)
├── .gemini/
━E  └── skills/
━E      └── vercel-react-native-skills/ (`.agent` と同一構�E)
├── .github/
━E  ├── skills/
━E  ━E  └── vercel-react-native-skills/ (`.agent` と同一構�E)
━E  └── workflows/
━E      └── daily-assistant.yaml
├── .next/ (Next.js生�E物)
├── .vercel/
━E  ├── README.txt
━E  └── project.json
├── docs/
━E  └── COLOR_SYSTEM.md
├── public/
━E  ├── cat-outline.svg
━E  ├── demo-cat-1.png
━E  ├── demo-cat-2.png
━E  ├── file.svg
━E  ├── globe.svg
━E  ├── icon.svg
━E  ├── manifest.json
━E  ├── next.svg
━E  ├── offline.html
━E  ├── sw.js
━E  ├── sw.template.js
━E  ├── vercel.svg
━E  └── window.svg
├── scripts/
━E  ├── apply_migration_simple.js
━E  ├── apply_migration_tmp.ts
━E  ├── batch-ai-tag.ts
━E  ├── check-buckets.mjs
━E  ├── check-configs.ts
━E  ├── check-constraints.mjs
━E  ├── check_constraints_deep.mjs
━E  ├── check-feb15.mjs
━E  ├── check-schema.mjs
━E  ├── check-updates.mjs
━E  ├── check_tables.ts
━E  ├── fix-sync-issue.ts
━E  ├── generate-sw.mjs
━E  ├── inspect-data-json.mjs
━E  ├── inspect-data.mjs
━E  ├── inspect-incidents.mjs
━E  ├── inspect-schema.mjs
━E  ├── list-avatars.mjs
━E  ├── list-storage.mjs
━E  ├── migrate-images.mjs
━E  ├── prepare-move.mjs
━E  ├── replace-emerald.mjs
━E  ├── reproduce_incident.mjs
━E  ├── send-daily-assistant.js
━E  ├── send-morning-reminder.js
━E  ├── simulation_draft.js
━E  ├── test-urls.mjs
━E  ├── verify_date_logic.ts
━E  └── verify_zukan_data.ts
├── src/
━E  ├── app/
━E  ━E  ├── api/
━E  ━E  ━E  ├── ai-worker/route.ts
━E  ━E  ━E  ├── analyze-cat/route.ts
━E  ━E  ━E  ├── collection/aggregate/route.ts
━E  ━E  ━E  └── photos/import/route.ts
━E  ━E  ├── collection/
━E  ━E  ━E  ├── layout.tsx
━E  ━E  ━E  └── page.tsx
━E  ━E  ├── demo/buttons/page.tsx
━E  ━E  ├── join/page.tsx
━E  ━E  ├── landing/page.tsx
━E  ━E  ├── favicon.ico
━E  ━E  ├── globals.css
━E  ━E  ├── layout.tsx
━E  ━E  ├── loading.tsx
━E  ━E  └── page.tsx
━E  ├── components/
━E  ━E  ├── app/
━E  ━E  ━E  ├── home/{cat-filter-bar.tsx, day-cell.tsx, day-detail-view.tsx, home-background.tsx, immersive-home.tsx, notification-sheet.tsx, weekly-feed-carousel.tsx, weekly-grid.tsx, weekly-home.tsx}
━E  ━E  ━E  ├── immersive/{care-history-list.tsx, editorial-corners.tsx, ImmersivePhotoView.tsx, integrated-notification-pill.tsx, layout-island-neo.tsx, magic-bubble-neo.tsx, observation-editor.tsx, photo-detail-view.tsx, quest-grid.tsx, unified-care-list.tsx, zen-gestures.tsx}
━E  ━E  ━E  ├── modals/{calendar-modal.tsx, care-settings-modal.tsx, care-task-form.tsx, care-task-list.tsx, cat-edit-modal.tsx, cat-form.tsx, cat-gallery-modal.tsx, cat-list.tsx, cat-settings-modal.tsx, cat-verification-modal.tsx, family-member-modal.tsx, incident-detail-modal.tsx, incident-list-sheet.tsx, incident-modal.tsx, inventory-settings-modal.tsx, medication-log-modal.tsx, notice-settings-modal.tsx, notification-modal.tsx, nyannlog-events-tab.tsx, nyannlog-header-v2.tsx, nyannlog-input-tab-view-final.tsx, nyannlog-requests-tab.tsx, nyannlog-requests-tab-view.tsx, nyannlog-sheet.tsx, observation-history-modal.tsx, photo-list-sheet.tsx, photo-modal.tsx, photo-sort-modal.tsx, profile-settings-modal.tsx, report-config-modal.tsx, sitter-report-config-modal.tsx, theme-exchange-modal.tsx, theme-tab-donation.tsx, theme-tab-layout.tsx, theme-tab-report.tsx}
━E  ━E  ━E  ├── screens/{album-screen.tsx, calendar-screen.tsx, care-screen.tsx, cat-screen.tsx, dekigoto-screen.tsx, gallery-screen.tsx, join-screen.tsx, login-screen.tsx, notification-screen.tsx, onboarding-screen.tsx, rewind-digest.tsx, settings-screen.tsx, splash-screen.tsx, tools-screen.tsx, zukan-screen.tsx}
━E  ━E  ━E  └── shared/{activity-feed.tsx, activity-log-item.tsx, anomaly-alert-banner.tsx, background-video.tsx, bottom-navigation-bar.tsx, capture-workflow-sheet.tsx, catch-up-panel.tsx, catch-up-stack.tsx, cat-observation-list.tsx, cat-profile-card.tsx, cat-profile-detail.tsx, check-section.tsx, collapsible-card.tsx, dekigoto-calendar.tsx, dekigoto-cat-box.tsx, embedded-input-card.tsx, footprint-badge.tsx, footprint-popup.tsx, footprint-stats-card.tsx, home-view-toggle.tsx, household-care-list.tsx, medical-report-view.tsx, notification-settings.tsx, nyannlog-item.tsx, reaction-bar.tsx, sidebar-menu.tsx, sitter-report-view.tsx, story-cover-view.tsx, today-care-status.tsx, unified-care-list.tsx, weekly-page-client.tsx, weight-chart.tsx}
━E  ━E  ├── collection/{collection-care.tsx, collection-home.tsx, collection-nav.tsx, collection-photo.tsx, photo-import-wizard.tsx}
━E  ━E  ├── ui/{avatar.tsx, backdrop-surface.tsx, badge.tsx, brand-loader.tsx, button.tsx, card.tsx, cat-avatar.tsx, cat-up-logo.tsx, celebration-overlay.tsx, dialog.tsx, input.tsx, label.tsx, phone-frame.tsx, select.tsx, separator.tsx, sonner.tsx, switch.tsx, textarea.tsx}
━E  ━E  └── pwa-register.tsx
━E  ├── hooks/
━E  ━E  ├── supabase/{use-adhoc-tasks.ts, use-calendar-data.ts, use-care-data.ts, use-cats.ts, use-footprints.ts, use-household.ts, use-incidents.ts, use-inventory.ts, use-medication.ts, use-user-profile.ts, use-user-read-timestamps.ts, use-weekly-album.ts}
━E  ━E  ├── use-care-logic.ts
━E  ━E  ├── use-care-task-form.ts
━E  ━E  ├── use-cat-form.ts
━E  ━E  ├── use-grouped-logs.ts
━E  ━E  ├── use-home-gestures.ts
━E  ━E  ├── use-household-media.ts
━E  ━E  ├── use-incident-detail.ts
━E  ━E  ├── use-inventory-settings.ts
━E  ━E  ├── use-medication-log.ts
━E  ━E  ├── use-memories.ts
━E  ━E  ├── use-notice-settings.ts
━E  ━E  ├── use-supabase-data.ts
━E  ━E  ├── use-theme-exchange.ts
━E  ━E  └── use-weekly-summary.ts
━E  ├── lib/{ai-album-helper.ts, cat-speech.ts, constants.ts, date-utils.ts, error-utils.ts, file-validation.ts, firebase.ts, haptics.ts, icon-utils.tsx, image-analysis.ts, image-processing.ts, logger.ts, query-client.ts, sounds.ts, storage.ts, supabase.ts, timeline-utils.ts, utils.ts, utils-ai.ts, utils-catchup.test.ts, utils-catchup.ts, utils-date.ts, utils-meal-slots.ts, zukan-data.tsx}
━E  ├── providers/{auth-provider.tsx, footprint-provider.tsx, query-provider.tsx}
━E  ├── store/
━E  ━E  ├── app-store.tsx
━E  ━E  └── domains/{album-context.tsx, care-context.tsx, cat-context.tsx, core-context.tsx, incident-context.tsx, inventory-context.tsx, medication-context.tsx, settings-context.tsx}
━E  ├── test/setup.ts
━E  └── types/{database.ts, index.ts, timeline-types.ts}
├── supabase/
━E  ├── _archive/
━E  ━E  ├── debug/{check_all_data_integrity.sql, check_bg_columns.sql, check_db_status.sql, check_family_data.sql, check_inventory_columns.sql, check_invite_flow.sql, check_latest_incident.sql, check_note_columns.sql, check_rpc_exposure.sql, check_schema.sql, check_video_uploads.sql, check-invites-rls.sql, check-membership.sql, check-rls-status.sql, check-schema.sql, check-users.sql, cleanup-test-data.sql, debug_footprints.sql, debug_ids.sql, debug_push_notification.sql, debug_rpc_definition.sql, debug-cats-409.sql, debug-onboarding.sql, debug-onboarding-v6.sql, debug-rpc.sql, delete_specific_incident.sql, diagnosis_notification_system.sql, test-cat-insert.sql, verify_invitation_b_status.sql, verify_join_result.sql}
━E  ━E  ├── fixes/{fix_ambiguous_function.sql, fix_cats_rpc.sql, fix_cats_rpc_json.sql, fix_critical_recursion_v4.sql, fix_footprints_constraint.sql, fix_gallery_registration_full.sql, fix_policies_and_data.sql, fix_rls_final_v2.sql, fix_rls_final_v3.sql, fix_rls_recursion.sql, fix_rls_v5_definitive.sql, fix_storage_for_video.sql, fix_users_rls.sql, fix_users_rls_emergency.sql, fix-care-registration.sql, fix-consolidated-rls.sql, fix-consolidated-rls-part2.sql, fix-consolidated-rls-part3.sql, fix-consolidated-rls-part4.sql, fix-consolidated-rls-part5.sql, fix-consolidated-rls-part6.sql, fix-households-rls.sql, fix-households-select.sql, fix-insert-policies.sql, fix-inventory-rls.sql, fix-invites-rls.sql, fix-join-rpc.sql, fix-members-fetch.sql, fix-missing-rpc-and-check-fk.sql, fix-rls.sql, fix-rls-complete.sql, fix-rls-robust.sql, fix-rls-users-only.sql, fix-rls-v2.sql, fix-users-rls.sql, fix-users-select-self.sql, fix-users-update.sql}
━E  ━E  └── legacy_migrations/{add_cat_background_settings.sql, add_cat_gallery.sql, add_cat_images_memo.sql, add_cat_profile_fields.sql, add_created_by_to_images.sql, add_data_validation_constraints.sql, add_household_invites.sql, add_invites_complete.sql, add_new_fetch_rpc.sql, add_notes_column.sql, add_observation_ack.sql, add_push_tokens.sql, add_remove_member_rpc.sql, add_rpc_fetch_family_members.sql, add_settings_tables.sql, add_signup_trigger.sql, add_weight_realtime.sql, add_weight_touch_trigger.sql, add-incidents-tables.sql, add-notification-prefs.sql, complete-onboarding-rls.sql, complete-rls-reset.sql, consolidated_migration.sql, create_households_tables.sql, create_incidents_schema.sql, create_join_household_rpc.sql, drop-recursive-policy.sql, ensure_columns_and_rpc.sql, ensure_users_table.sql, final-rls-cleanup.sql, force_fix_db.sql, force_fix_rpc.sql, reload_schema.sql, repair_household_members.sql, reset-all-rls.sql, rls_audit.sql, setup_visual_logs.sql, update_care_tasks.sql, update_care_tasks_cats.sql, update_join_household_rpc.sql}
━E  ├── functions/{analyze-cat-image/index.ts, generate-weekly-caption/index.ts, push-notification/index.ts, scheduled-reminder/index.ts}
━E  ├── migrations/{20260109120000_optimize_cats_query.sql, 20260109120001_rls_security_fix.sql, 20260109120002_user_sync_trigger.sql, 20260110120000_fix_storage_policies.sql, 20260111_cat_footprints.sql, 20260111_theme_exchange.sql, 20260112_optimize_gallery_indices.sql, 20260112_unified_gallery.sql, 20260113_add_tags_column.sql, 20260114_multi_cat_images.sql, 20260114_setup_ai_webhook.sql, 20260115100000_add_memo_to_cats_rpc.sql, 20260115104000_photo_reactions.sql, 20260115120000_user_read_timestamps.sql, 20260115130000_add_missing_care_task_columns.sql, 20260116_update_footprint_action_type.sql, 20260117_add_cat_vaccine_fields.sql, 20260117_update_cats_rpc_vaccine.sql, 20260118_nyannlog_migration.sql, 20260119_timeline_diary_features.sql, 20260120_drop_reaction_constraint.sql, 20260120_fix_reaction_rls_final.sql, 20260120_reaction_heart_optimization.sql, 20260120_safely_consume_footprints_v2.sql, 20260120_safely_consume_footprints_v3.sql, 20260121_adhoc_tasks.sql, 20260126_medical_report_enhancement.sql, 20260128_weekly_album_sharing.sql, 20260129_fix_medication_logs_schema.sql, 20260131_consolidate_incident_fields.sql, 20260215_add_ai_analysis_to_cat_images.sql, 20260215_deletion_sync_trigger.sql, 20260215_multi_cat_incidents_fix.sql, 20260215_photo_sync_trigger.sql, 20260215_sync_ai_analysis_metadata.sql, 20260215_update_cats_rpc_ai.sql, 20260215_update_unified_gallery_ai.sql, 20260216_fix_final_constraints_and_sync.sql, 20260216_fix_unique_array_merge_final.sql, 20260310223500_nyaruhd_v2_schema.sql}
━E  ├── config.toml
━E  ├── debug_ai_output.sql
━E  └── schema.sql
├── .env.local
├── .eslintignore
├── .gitignore
├── _tmp_catup.html
├── build.log
├── build_log.txt
├── build_log_3001.txt
├── cat_care_app_mock_checklist_card_modes.jsx
├── cat_care_app_要件定義�E�開発老E�E有用�E�Emd
├── check_all_incidents.ts
├── check_constraints.ts
├── check_latest.ts
├── check_photo_url.ts
├── components.json
├── debug_output.json
├── eslint.config.mjs
├── footprints_data.sql
├── logs_dump.sql
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
├── reproduce_incident_error.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── vitest.config.ts
```

所愁E
- アプリ本体以外に、スキル定義ミラー、デバッグSQL、単発スクリプト、ログファイルがかなり多く、ルートが散らかってぁE��す、E- `src/components/app/screens` に「現役画面」と「未接続�E旧画面」が同屁E��てぁE��す、E- `supabase/_archive` が非常に大きく、現行真実�EDB定義を見失ぁE��すい構造です、E
---

## 3. 主要ファイルと役割

| ファイルパス | 役割・責勁E| 状態（完�E/作�E中/放置�E�E|
|---|---|---|
| `package.json` | 依存関係、scripts、�Eロジェクト名定義 | 完�E |
| `README.md` | プロジェクト説明。現状は create-next-app の初期斁E��のまま | 放置 |
| `next.config.ts` | Next.js設定。画像許可、型/ESLintビルド無要E| 作�E中 |
| `tsconfig.json` | TypeScript設定。`strict` 有効、`allowJs` 有効、`supabase` 除夁E| 完�E |
| `eslint.config.mjs` | ESLint設定。かなり多くのルールを緩咁E| 作�E中 |
| `public/manifest.json` | PWA設宁E| 作�E中 |
| `src/app/layout.tsx` | 全体レイアウト、メタチE�Eタ、PWA、Auth/QueryProvider、Toaster | 作�E中 |
| `src/app/page.tsx` | `/` ルートを `/collection` 相当�E画面へ直絁E| 作�E中 |
| `src/app/collection/page.tsx` | 現在の実質メインアプリシェル。タブ�E移、認証、スプラチE��ュ、E��知雁E��E| 作�E中 |
| `src/app/collection/layout.tsx` | `/collection` ルート用レイアウチE| 完�E |
| `src/app/landing/page.tsx` | LP/マ�EケチE��ングペ�Eジ | 完�E |
| `src/app/join/page.tsx` | 招征E��加ペ�Eジ | 完�E |
| `src/app/api/analyze-cat/route.ts` | 画像AI解析Edge Functionへのプロキシ | 作�E中 |
| `src/app/api/photos/import/route.ts` | v2写真取り込みAPI。`photos` とジョブキューに投�E | 作�E中 |
| `src/app/api/ai-worker/route.ts` | OpenAIを呼ぶ写真解析ワーカーAPI | 作�E中 |
| `src/app/api/collection/aggregate/route.ts` | AIタグを図鑁EコレクションDBに反映 | 作�E中 |
| `src/store/app-store.tsx` | 各Context Providerの合�E | 作�E中 |
| `src/providers/auth-provider.tsx` | Supabase認証のクライアント�EProvider | 完�E |
| `src/providers/query-provider.tsx` | React Query Provider | 完�E |
| `src/providers/footprint-provider.tsx` | 足跡/ポイント機�EのProvider。現状は no-op スタチE| 放置 |
| `src/store/domains/settings-context.tsx` | UI設定と通知設定�E保持、localStorage連携 | 作�E中 |
| `src/store/domains/core-context.tsx` | household/users など共通データの保持 | 作�E中 |
| `src/store/domains/cat-context.tsx` | 猫惁E��、画像アチE�Eロード、AI解析呼び出ぁE| 作�E中 |
| `src/store/domains/care-context.tsx` | ケアログ、観察、notice/task 定義の管琁E| 作�E中 |
| `src/store/domains/incident-context.tsx` | できごと/医療ログ周り�EContext、Eook誤用あり | 作�E中 |
| `src/components/collection/collection-home.tsx` | 現行�Eホ�Eム。発見、図鑑、E��次アルバム、AI導緁E| 作�E中 |
| `src/components/app/screens/zukan-screen.tsx` | 図鑁E棁EUI の本佁E| 作�E中 |
| `src/components/collection/collection-photo.tsx` | 写真一覧、フィルタ、削除、AI一括解极E| 作�E中 |
| `src/components/collection/photo-import-wizard.tsx` | 褁E��写真めEv2 `photos` パイプラインに投�E | 作�E中 |
| `src/components/app/shared/capture-workflow-sheet.tsx` | カメラ/写真選択�EAI候補�E保存までの大きなワークフロー | 作�E中 |
| `src/components/app/shared/bottom-navigation-bar.tsx` | 現行�E下部ナビ。実裁E��状態定義にズレあり | 作�E中 |
| `src/components/collection/collection-nav.tsx` | 旧/別案�Eコレクション用ナビ。未接綁E| 放置 |
| `src/components/app/screens/cat-screen.tsx` | 猫プロフィール/健康/履歴 | 作�E中 |
| `src/components/app/screens/calendar-screen.tsx` | カレンダー/日別ログ雁E��E| 作�E中 |
| `src/components/app/screens/login-screen.tsx` | メール認証・新規登録・チE��導緁E| 完�E |
| `src/components/app/screens/onboarding-screen.tsx` | household / cats 初期作�E | 作�E中 |
| `src/components/app/screens/join-screen.tsx` | 招征E��ード参加UI | 完�E |
| `src/components/app/screens/album-screen.tsx` | 旧アルバム画面。現行シェルから未接綁E| 放置 |
| `src/components/app/screens/care-screen.tsx` | 旧ケア画面。未接綁E| 放置 |
| `src/components/app/screens/gallery-screen.tsx` | 旧ギャラリー画面。未接綁E| 放置 |
| `src/components/app/screens/notification-screen.tsx` | 旧通知画面。未接綁E| 放置 |
| `src/components/app/screens/settings-screen.tsx` | 旧設定画面。未接綁E| 放置 |
| `src/components/app/screens/tools-screen.tsx` | 旧チE�Eル画面。未接綁E| 放置 |
| `src/components/ui/sonner.tsx` | ToasterのチE�Eマ連携。`next-themes` 前提だぁEProvider 不在 | 作�E中 |
| `src/hooks/use-supabase-data.ts` | Supabase hooks の再エクスポ�EチE| 完�E |
| `src/hooks/supabase/use-cats.ts` | 猫一覧・画像�E体重めESupabase / RPC から取征E| 作�E中 |
| `src/hooks/supabase/use-incidents.ts` | インシチE��ト取得�E追加・更新・通知 | 作�E中 |
| `src/hooks/supabase/use-user-profile.ts` | プロフィール・通知設定�Epush token 管琁E| 作�E中 |
| `src/lib/storage.ts` | Supabase StorageアチE�Eロード�E通化 | 作�E中 |
| `src/lib/zukan-data.tsx` | 図鑑軸/タグのハ�Eドコード定義 | 作�E中 |
| `src/types/index.ts` | アプリ側の主要型定義 | 作�E中 |
| `src/types/database.ts` | 旧寁E��のDB型。現行スキーマとズレあり | 放置 |
| `supabase/schema.sql` | 初期寁E��のスキーマスナップショチE�� | 放置 |
| `supabase/migrations/20260310223500_nyaruhd_v2_schema.sql` | 新コレクション/写真解极Ev2 スキーチE| 作�E中 |
| `supabase/functions/analyze-cat-image/index.ts` | 旧AI画像解析�EEdge Function | 作�E中 |
| `supabase/functions/push-notification/index.ts` | FCM送信Edge Function | 作�E中 |
| `.github/workflows/daily-assistant.yaml` | 定時通知用GitHub Actions | 完�E |

補足:
- もっとも肥大化してぁE��ファイルは `capture-workflow-sheet.tsx`�E�E85行）、`zukan-screen.tsx`�E�E57行）、`src/app/collection/page.tsx`�E�E08行）などです、E- 機�Eの真ん中に巨大ファイルが褁E��あり、�E割対象が�E確です、E
---

## 4. チE�Eタ構造・モチE��定義

### 猫のチE�EタモチE���E�フィールド一覧とそ�E型！E
アプリ側の主定義は `src/types/index.ts` の `Cat` です、E
- `id: string`
- `name: string`
- `age: string`
- `sex: string`
- `avatar?: string`
- `birthday?: string`
- `weight?: number`
- `microchip_id?: string`
- `notes?: string`
- `images?: CatImage[]`
- `weightHistory?: CatWeightRecord[]`
- `background_mode?: 'random' | 'media' | 'avatar'`
- `background_media?: string | null`
- `last_vaccine_date?: string`
- `vaccine_type?: string`
- `flea_tick_date?: string`
- `flea_tick_product?: string`
- `deworming_date?: string`
- `deworming_product?: string`
- `heartworm_date?: string`
- `heartworm_product?: string`
- `neutered_status?: 'neutered' | 'intact' | 'unknown'`
- `living_environment?: 'indoor' | 'outdoor' | 'both'`
- `family_composition?: string`

関連垁E
- `CatWeightRecord`
  - `id: string`
  - `cat_id: string`
  - `weight: number`
  - `recorded_at: string`
  - `notes?: string`
- `CatImage`
  - `id: string`
  - `catId: string`
  - `catIds?: string[]`
  - `storagePath: string`
  - `createdAt: string`
  - `isFavorite: boolean`
  - `width?: number`
  - `height?: number`
  - `memo?: string`
  - `tags?: PhotoTag[]`
  - `aiAnalysis?: { pose?: string; description?: string; tags?: string[]; metadata?: Record<string, any> }`

### そ�E他�E主要なチE�EタモチE��

- `CareTaskDef`
  - ケアタスク定義。頻度、対象猫、優先度、リマインダ等を持つ
- `Task`
  - 実際の表示用タスク
- `NoticeDef` / `NoticeLog`
  - 観察�E気づき�E力�E定義とログ
- `SignalDef` / `SignalLog`
  - 痁E��/状態ラベルの定義とログ
- `Incident` / `IncidentUpdate`
  - できごと、受診、症状、メモ、�E真をまとめる主要ログ
- `InventoryItem`
  - 消耗品在庫
- `AppEvent`
  - 痁E��/投薬などの予宁E- `AppSettings`
  - プラン、�Eーム表示モード、E��音時間、しきい値、テーマ関連
- `MedicationLog`
  - 投薬ログ
- `WeeklyAlbumSettings`
  - 週次アルバムのレイアウチE選択�E省E- `SitterReportData`
  - シチE��ー引き継ぎ用レポ�EチE
### DB 側の主要モチE�� / チE�Eブル

旧系チE�Eブル:
- `households`
- `users`
- `cats`
- `care_logs`
- `observations`
- `inventory`
- `cat_weight_history`
- `cat_images`
- `care_task_defs`
- `notice_defs`
- `incidents`
- `incident_updates`
- `incident_reactions`
- `push_tokens`
- `notification_preferences` 系

新 v2 コレクション系チE�Eブル�E�E20260310223500_nyaruhd_v2_schema.sql`�E�E
- `photos`
- `photo_cat_links`
- `photo_analysis_jobs`
- `photo_analysis_results`
- `collection_definitions`
- `collection_rules`
- `cat_collection_items`
- `cat_collection_photos`
- `discoveries`

### チE�Eタの保存方法（ローカルDB / API / ファイル�E�E
- 主保存�Eは Supabase�E�Eostgres + Storage�E�E- フロントでは React Query / Context 経由で Supabase を直接叩く箁E��と、Next.js API Route を挟む箁E��が混在
- ローカルでは `localStorage` を多用
  - 設宁E  - チE��状慁E  - UI補助状慁E- PWA用に Service Worker (`public/sw.js`) と manifest を利用
- push 通知に Firebase Cloud Messaging を使用

### 使用してぁE��DB/ストレージの種顁E
- DB: Supabase PostgreSQL
- オブジェクト保孁E Supabase Storage
  - `cat-images`
  - `avatars`
  - なおコード上では `incoming` をバケチE��として扱ぁE��E��があり、実際の保存実裁E��不整合がありまぁE- クライアント保孁E browser `localStorage`
- 通知インフラ: Firebase / FCM

重要な構造皁E��顁E
- `src/types/database.ts` ぁEv2 スキーマを含んでおらず、型の「正」が崩れてぁE��す、E- `supabase/schema.sql` も古く、現行実�Eは migration 群を追わなぁE��刁E��りません、E- `cat_images` を中忁E��した旧パイプラインと `photos` を中忁E��した v2 パイプラインが並走してぁE��す、E
---

## 5. 画面・機�E一覧

実裁E��況E��E�E��Eコード接続状況と実行確認をもとにした概算です、E
| 画面吁E| 主な機�E | 実裁E��況E��E�E�E| ナビゲーション上�E位置 |
|---|---|---|---|
| `CollectionHome` | 写真中忁E�Eーム、最近�E発見、図鑑導線、E��次アルバム導緁E| 80% | タチE`home` |
| `ZukanScreen` | 図鑑棚、検索、検証モーダル、E��次アルバム、AIタグ反映 | 75% | タチE`collection` |
| `CollectionPhoto` | 写真一覧、フィルタ、褁E��選択、削除、AI一括解极E| 60% | 冁E��状慁E`photo`�E�現行ナビから�E未到達！E|
| `CaptureWorkflowSheet` | 写真選択、AI候補、猫/タグ補正、ログ保孁E| 75% | 下部ナビ中央カメラ |
| `PhotoImportWizard` | 褁E��写真の v2 取り込み、AIジョブ投入 | 60% | `CollectionHome` / `Zukan` から開くモーダル |
| `CatScreen` | 猫プロフィール、健康、履歴 | 60% | タチE`cat` |
| `CalendarScreen` | カレンダー、日別ログ、イベンチEケア雁E��E| 65% | タチE`calendar` |
| `NotificationSheet` | ケア、できごと、�E真、フラチE��ュバック通知の雁E��E| 70% | 冁E��状慁E`notifications`�E�現行ナビから�E未到達！E|
| `LoginScreen` | ログイン、新規登録、デモモード導緁E| 80% | 未ログイン時�E初期画面 |
| `OnboardingScreen` | household 作�E、�Eロフィール初期化、猫作�E、�E期在庫投�E | 70% | 初回ログイン征E|
| `JoinScreen` | 招征E��ードで household 参加 | 70% | `/join` |
| `LandingPage` | LP / マ�EケチE��ングペ�Eジ | 90% | `/landing` |
| `SplashScreen` | ブランドローチE��ング | 90% | アプリ起動時 |
| `album-screen.tsx` | 旧アルバム画面 | 30% | 未接綁E|
| `care-screen.tsx` | 旧ケア画面 | 30% | 未接綁E|
| `gallery-screen.tsx` | 旧ギャラリー画面 | 40% | 未接綁E|
| `notification-screen.tsx` | 旧通知画面 | 20% | 未接綁E|
| `settings-screen.tsx` | 旧設定画面 | 20% | 未接綁E|
| `tools-screen.tsx` | 旧チE�Eル画面 | 20% | 未接綁E|
| `rewind-digest.tsx` | 過去写真の振り返り系UI | 40% | 未接綁E|
| `demo/buttons/page.tsx` | UIボタン実験用ペ�Eジ | 100% | `/demo/buttons` |

特に重要な導線上�Eズレ:
- `src/app/collection/page.tsx` には `tab === "photo"` と `tab === "notifications"` の刁E��がありますが、現行�E `BottomNavigationBar` は `home / collection / camera / cat / calendar` しか出しません、E- `PhotoImportWizard` の完亁E���E琁E�� `setTab("zukan")` になっており、現行�Eタブ�E岐では `"zukan"` を表示できません。ここ�E実バグです、E
---

## 6. 現在の問題点・技術的負債

### コード品質

- 命名規則の一貫性:
  - アプリ名が `にめE��ほど` / `NyaruHD` / `nebular-flare` で刁E��してぁE��す、E  - 画面名も `collection`, `zukan`, `photo`, `notifications`, `care`, `cat` が混在し、現在の導線と一致してぁE��せん、E  - DBモチE��めE`cat_images` と `photos` が並存してぁE��す、E- コード�E重褁E
  - ギャラリー系処琁E�� `collection-home.tsx`, `zukan-screen.tsx`, `collection-photo.tsx`, `gallery-screen.tsx` に刁E��してぁE��す、E  - AI画像解析�E経路が、Next API と Supabase Edge Function の二系統で重褁E��てぁE��す、E  - 通知UIめE`NotificationSheet`, `notification-screen.tsx`, `notification-modal.tsx`, `IntegratedNotificationPill` など褁E��系統があります、E- 未使用コード�EチE��ドコーチE
  - 未接続画面: `album-screen.tsx`, `care-screen.tsx`, `gallery-screen.tsx`, `notification-screen.tsx`, `settings-screen.tsx`, `tools-screen.tsx`, `rewind-digest.tsx`
  - 未接続コンポ�EネンチE `collection-care.tsx`, `collection-nav.tsx`
  - `FootprintProvider` は完�Eに no-op で、実裁E��みの `useFootprints` と刁E��されてぁE��す、E  - ルート直下に build log / debug SQL / 単発スクリプトが多く、現役賁E��か残骸か判別しづらいです、E
追加で見つかった�E体的な不�E吁E
- `src/app/collection/page.tsx`
  - `PhotoImportWizard` 完亁E��に `setTab("zukan")` を呼ぶが、表示刁E��に `"zukan"` がなぁE  - `notifications` タブ表示を想定してぁE��が、現行ナビに通知ボタンがなぁE- `src/store/domains/cat-context.tsx`
  - `deleteCatImage()` ぁE`avatars` バケチE��から削除しており、画像削除先として不正
  - 環墁E��数欠落時に `process.env` を返す危険な実裁E- `src/app/api/ai-worker/route.ts`
  - ジョブキューめE`limit(1)` で1件しか処琁E��なぁE  - `photos/import` は褁E��ジョブを積�Eのに、worker は1回だぁEfire-and-forget で叩かれるため、褁E��写真投�E時に残ジョブが積み残る可能性が高い
- `src/app/api/ai-worker/route.ts`
  - 画像を `supabase.storage.from('incoming')` から読もうとするが、アチE�Eロード実裁E�E `cat-images` バケチE��側
- `src/components/ui/sonner.tsx`
  - `next-themes` の `useTheme()` を使ぁE��、見える篁E��に `ThemeProvider` がなぁE
### アーキチE��チャ

- 設計パターン�E�使ってぁE��も�E / 混在してぁE��も�E�E�E
  - Next.js App Router
  - 巨大なクライアントシェル (`src/app/collection/page.tsx`)
  - Contextベ�Eスのドメイン状態管琁E  - React Query によるサーバ�EチE�Eタ取征E  - Supabase RPC / direct table query / Edge Function / Next API Route の併用
  - `localStorage` を使った設定�EUI状態�E保持
  - 要するに「一つの設計に寁E��刁E��てぁE��ぁE��状態でぁE- 状態管琁E�E方法と問顁E
  - Context と React Query が両方使われてぁE��すが、責務墁E��が曖昧です、E  - Context 冁E��サーバ�EチE�Eタを�EラチE�EしてぁE��ため、二重状態化してぁE��箁E��があります、E  - `demo mode` 刁E��が吁E��ンチE��ストに散っており、保守コストが高いです、E  - `settings-context`, `care-context`, `inventory-context` などで「effectの中で同期皁E�� setState」しており、React lint に多数引っかかってぁE��す、E  - `incident-context` は Hook の使ぁE��自体が誤ってぁE��す、E- フォルダ構�Eの問顁E
  - `src/components/app/screens` に旧画面と現行画面が混在
  - `src/components/collection` に新規導線があり、`src/app/collection/page.tsx` がそこへつなぁE  - `src/store/domains` で旧ケア/ログの状態を持ちながら、`src/app/api/*` では新しい写真コレクションパイプラインが別進衁E  - ルート直下がノイズ多めで、移行対象/非対象の判定が忁E��E
### 設計方針�E変�E

- 当�Eの設計意図:
  - `cat_care_app_要件定義�E�開発老E�E有用�E�Emd` を見る限り、�Eは「最小�E力」「放置OK」「家族�E有」「AIは補助であり診断はしなぁE��方針�E猫ケアログアプリです、E  - IA めE`Home / Calendar / Log / Notes / More(Settings)` 寁E��でした、E- 途中で変わった点とそ�E琁E��:
  - 写真から生活をコレクション化する方向へ明確に寁E��てぁE��す、E  - そ�Eため `ZUKAN_AXES`, `discoveries`, `collection_definitions`, `photo_analysis_jobs` などの新概念が追加されてぁE��す、E  - UIも「�Eームでケア確認」から「�Eームで写真/発要E図鑑へ誘導」へ変化してぁE��す、E- 現在の状態との矛盾:
  - ドメインの中忁E��まだ `care_logs / incidents / cat_images` 側に残ってぁE��一方、封E��像�E `photos / collection_* / discoveries` 側です、E  - ルーチE`/` は LP ではなくアプリ本体に直行します、E  - 要件書の IA と現行ナビが一致しません、E  - ポインチE足跡、テーマ交換、寁E��タブなど「庁E��た構想」�Eあるが、E��用できる完�E度には達してぁE��せん、E
### 動作検証で確認できた問顁E
- `npm.cmd run lint -- .`
  - 失敁E  - `179` 件の問顁E(`84 errors / 95 warnings`)
  - 主な冁E��:
    - `react-hooks/rules-of-hooks`
    - `react-hooks/set-state-in-effect`
    - `react-hooks/preserve-manual-memoization`
    - `react-hooks/purity`
    - `<img>` 使用警呁E    - `require()` 禁止違反
- `npm.cmd test -- --run`
  - 失敁E  - Vitest 起動時に `spawn EPERM`
  - チE��トコード�E体がほぼなく、現状では品質拁E���E役割を果たしてぁE��せん
- `npm.cmd run build`
  - 失敁E  - `next/font/google` による `Geist`, `Geist Mono`, `Zen Maru Gothic` の取得失敁E  - オフライン/制限環墁E��ビルド不�E
  - さらに `next.config.ts` の `eslint` 設定�E Next 16 で非推奨/無効

---

## 7. 設定ファイル一覧

存在するも�Eのみ記載します。`babel.config.js`, `metro.config.js`, `app.json`, `app.config.js`, `.prettierrc` はありません。つまめEReact Native / Expo 系の設定�E存在しません、E
### `package.json`�E�Escripts`, `dependencies`, `devDependencies`�E�E
```json
{
  "scripts": {
    "dev": "next dev",
    "prebuild": "node scripts/generate-sw.mjs",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "generate-sw": "node scripts/generate-sw.mjs",
    "test": "vitest"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.89.0",
    "@tanstack/react-query": "^5.90.20",
    "browser-image-compression": "^2.0.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "firebase": "^12.7.0",
    "framer-motion": "^12.23.26",
    "html-to-image": "^1.11.13",
    "html2canvas": "^1.4.1",
    "lucide-react": "^0.562.0",
    "next": "16.1.0",
    "next-themes": "^0.4.6",
    "openai": "^6.22.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "recharts": "^3.7.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^5.1.2",
    "dotenv": "^17.2.3",
    "eslint": "^9",
    "eslint-config-next": "16.1.0",
    "jsdom": "^27.4.0",
    "tailwindcss": "^4",
    "tsx": "^4.21.0",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5",
    "vitest": "^4.0.18"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules", "supabase"]
}
```

### `eslint.config.mjs`

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts"
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "prefer-const": "off",
      "react-hooks/exhaustive-deps": "off"
    }
  }
]);

export default eslintConfig;
```

### `.eslintignore`

```text
*\n
```

備老E
- 冁E��がかなり不�E然です、E- しかめEESLint 9 では `.eslintignore` 自体が非推奨です、E
### `next.config.ts`

```ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
```

備老E
- `eslint.ignoreDuringBuilds` は Next 16 では無効/非推奨
- `typescript.ignoreBuildErrors: true` により、型エラーがあってもビルドを通そぁE��する設訁E
### `postcss.config.mjs`

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### `src/test/setup.ts`

```ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks if needed
```

### `components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {}
}
```

### `public/manifest.json`

```json
{
  "name": "にめE��ほど - ねこ�E足あとアプリ",
  "short_name": "NyaruHD",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#FAF9F7",
  "background_color": "#FAF9F7",
  "gcm_sender_id": "103953800507",
  "icons": [
    {
      "src": "/icon.svg",
      "sizes": "192x192 512x512",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/icon.svg",
      "sizes": "192x192 512x512",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ]
}
```

### `supabase/config.toml`�E�移行上重要な箁E���E�E
```toml
project_id = "nebular-flare"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 17

[db.migrations]
enabled = true
schema_paths = []

[db.seed]
enabled = true
sql_paths = ["./seed.sql"]

[storage]
enabled = true
file_size_limit = "50MiB"

[storage.s3_protocol]
enabled = true

[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["https://127.0.0.1:3000"]
enable_signup = true
enable_confirmations = false

[studio]
enabled = true
port = 54323
api_url = "http://127.0.0.1"
openai_api_key = "env(OPENAI_API_KEY)"

[edge_runtime]
enabled = true
policy = "per_worker"
inspector_port = 8083
deno_version = 1
```

重要な注愁E
- `db.seed.sql_paths = ["./seed.sql"]` ですが、実際には `supabase/seed.sql` が存在しません、E- つまりローカル Supabase の完�E再現手頁E�E、現状そ�Eままだと壊れてぁE��す、E
### `.github/workflows/daily-assistant.yaml`

```yaml
name: Daily Assistant

on:
  schedule:
    - cron: '0 23 * * *'
    - cron: '0 11 * * *'
  workflow_dispatch:

jobs:
  send-notification:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Daily Assistant
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          TZ: Asia/Tokyo
        run: node scripts/send-daily-assistant.js
```

### `.vercel/project.json`

```json
{
  "projectId": "prj_4nQ7souFyl0OWkwXr73fi3XDn5hL",
  "orgId": "team_cHmB8y8r9nt2qHOOlWdCFrO9",
  "projectName": "catup"
}
```

---

## 8. 未実裁E�E今後�E予宁E
以下�Eコード上�E痕跡から判断した冁E��で、一部は推測を含みます、E
- 実裁E��定だが未着手�E機�E:
  - v2 `photos` パイプラインを主導線として完�Eさせること
  - `discoveries` / `collection_definitions` を使った図鑑�E長体験�E本格匁E  - 通知タブを現行ナビへ再接続すること
  - 足跡/ポイント経済を再有効化すること
  - チE�Eマ交揁E/ 寁E��タチE/ レイアウト�E替の本格運用
- 途中で止まってぁE��機�E:
  - `FootprintProvider` 周めE  - `CollectionPhoto` の導線接綁E  - 旧 `gallery-screen.tsx` と新 `collection-photo.tsx` の整琁E  - 旧 `care-screen.tsx`, `settings-screen.tsx`, `notification-screen.tsx` の扱ぁE  - `next-themes` 連携
  - v2写真インポ�Eト後�Eジョブ継続�E琁E- めE��たいけど技術的に未検討�E機�E:
  - スキーマ�E完�E一本匁E  - AI処琁E�E堁E��なジョブ実行基盤
  - オフラインに強いPWA / キャチE��ュ戦略
  - 型安�Eな Supabase codegen 導�E
  - 自動テスト�E本格整傁E  - 旧要件�E�家族�E有ケアアプリ�E�と新要件�E�猫生図鑑）�Eどちらを主軸にするか�E再定義

---

## 9. 移行に忁E��な惁E��

- Git管琁E�E状況E 使ってぁE��
  - ブランチE `main...origin/main`
  - ただし現在のワークチE��ーは dirty
  - 未追跡の新規実裁E��多い
    - `src/app/api/ai-worker/`
    - `src/app/api/collection/`
    - `src/app/api/photos/`
    - `src/app/collection/`
    - `src/components/collection/`
    - `src/lib/zukan-data.tsx`
    - `supabase/migrations/20260310223500_nyaruhd_v2_schema.sql`
- 環墁E��数・シークレチE��の有無: あり
  - `.env.local` に存在を確認したキー
    - `NEXT_PUBLIC_FIREBASE_API_KEY`
    - `NEXT_PUBLIC_FIREBASE_APP_ID`
    - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
    - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
    - `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `VERCEL_OIDC_TOKEN`
  - コード上で別途忁E��な非�E開キー
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `OPENAI_API_KEY`
    - `FIREBASE_SERVICE_ACCOUNT`
    - `SUPABASE_URL`
- チE��トコード�E有無: ほぼなぁE  - 実質確認できたチE��ト�E `src/lib/utils-catchup.test.ts` のみ
  - `src/test/setup.ts` は最小構�E
- CI/CDの設宁E
  - `.github/workflows/daily-assistant.yaml` のみ
  - これは通知用ワークフローであり、build/lint/test/deploy の CI ではなぁE- そ�E他、移行時に注意が忁E��な点:
  - `next.config.ts` ぁEbuild 時�E型検査を無効化してぁE��
  - `eslint` めEbuild ガードとして機�EしてぁE��ぁE  - `src/types/database.ts` と現衁Emigration が一致してぁE��ぁE  - `supabase/config.toml` が存在しなぁE`seed.sql` を参照してぁE��
  - `README.md` が�Eロジェクト説明として役に立たなぁE  - `src/app/api/*` の一部ぁESupabase anon key 前提で、クライアント�E認証惁E��を正しく引き継いでぁE��ぁE  - `PhotoImportWizard` の fetch には `Authorization` ヘッダがなく、v2チE�Eブルの RLS ぁE`authenticated` 前提なので、現状のままだと本番で壊れる可能性が高い
  - `public/sw.js` は `prebuild` で毎回生�EされめE  - 今回の `build` 実行でめE`public/sw.js` が�E生�EされぁE  - Google Fonts 依存�Eため、制限ネチE��ワーク環墁E��は build が失敗すめE  - 日本語文言がターミナル上で斁E��化けして見えるため、Claude Code 側ではファイルエンコーチE��ング確認を推奨
  - `src` 配下だけでなく、ルート直下�E debug SQL / 単発スクリプト / ログを移行対象に含めるか�Eに決めたほぁE��よい

移行時の優先整琁E��E��しては、以下が現実的です、E
1. プロダクト方針�E一本匁E   - 「猫ケア家族アプリ」を核にするのぁE   - 「猫生図鑁E写真コレクションアプリ」を核にするのぁE2. チE�EタモチE��の一本匁E   - `cat_images` 系を残すぁE   - `photos` v2 へ寁E��るか
3. UI導線�E一本匁E   - 現行メインに使ぁE��面だけ残す
   - 未接続�E旧画面を退避/削除する
4. ビルド健全性の回復
   - 型エラー無視をめE��めE   - lint/test/build めECI に入れる
5. 秘寁E��報と運用の整琁E   - `.env` 整琁E   - debug route 削除
   - Supabase / Firebase / OpenAI の責務�E設訁E
---

### 結諁E
こ�Eプロジェクト�E「完�Eに破綻してぁE��」わけではありません。主要な画面、認証、Supabase 接続、�E真導線、図鑑UI、E��知インフラの土台はあります、E
ただし現状は、E- 旧アプリ構造と新コレクション構造が同屁E��てぁE��
- 型�Eスキーマ�E画面導線が一本化されてぁE��ぁE- lint/test/build が健全ではなぁE- 未接続コードと危険なチE��チE��実裁E��残ってぁE��

とぁE��意味で、Claude Code への移行前に「何を残し、何を捨てるか」を先に決める価値が非常に高い状態です、E
一言でぁE��と:

`土台はあるが、現状のままリファクタリングに入ると迷子になりやすい。まず�E product / data / navigation の三本を�E定義すべき段階。`

