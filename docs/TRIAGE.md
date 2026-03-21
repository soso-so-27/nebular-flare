# にゃるほど 残す/捨てる判断表

コンセプト「毎日のひとコマが、この子の物語になる。」に基づく整理

凡例: ✅残す = コア導線 / 🔧改修 = リファクタ後に活用 / 📦退避 = _archive行き

## 画面
| 画面 | 判定 | 理由 |
|------|------|------|
| CollectionHome | ✅残す | 現行ホーム。コア導線 |
| ZukanScreen | ✅残す | 図鑑体験のコア |
| CaptureWorkflowSheet | 🔧改修 | 785行。分割必須 |
| PhotoImportWizard | ✅残す | v2写真インポート |
| CatScreen | ✅残す | 猫プロフィール |
| CalendarScreen | 🔧改修 | コア導線との関係を再定義 |
| LoginScreen | ✅残す | 認証 |
| OnboardingScreen | 🔧改修 | 方針書のUXに合わせる |
| album/care/gallery/notification/settings/tools-screen | 📦退避済 | _archiveへ移動完了 |

## データモデル
| テーブル | 判定 | 理由 |
|---------|------|------|
| photos (v2) | ✅残す | 新写真パイプラインのコア |
| photo_cat_links / photo_analysis_* | ✅残す | v2の一部 |
| collection_definitions / discoveries | ✅残す | 図鑑体験のコア |
| cat_images | 📦退避 | photos v2へマイグレーション後に廃止 |
| cats / households / users | ✅残す | マスタデータ |
| care_logs / incidents | 🔧改修 | 物語の背景情報として再定義 |
| database.ts | 🔧改修 | v2スキーマと同期必要 |

## API
| ルート | 判定 | 理由 |
|--------|------|------|
| api/photos/import | ✅残す | Auth修正済み |
| api/ai-worker | 🔧改修 | バケット修正済み。複数ジョブ対応が残課題 |
| api/collection/aggregate | ✅残す | 図鑑反映 |
| api/debug-ai | 📦削除済 | セキュリティリスクのため削除完了 |

詳細版: nyaruhodo-triage.docx を参照

---
