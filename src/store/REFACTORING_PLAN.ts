/**
 * =============================================================================
 * app-store.tsx リファクタリング計画
 * =============================================================================
 * 
 * 現状の問題:
 * - 1339行の巨大ファイル（God Object パターン）
 * - 状態変更で全コンポーネントが再レンダリング
 * - テスト・保守が困難
 * 
 * =============================================================================
 * 推奨: 段階的分離アプローチ
 * =============================================================================
 * 
 * Phase 1: CatsContext の分離（最優先・最インパクト）
 * ─────────────────────────────────────────────────
 * - cats, setCats
 * - useCats フック統合
 * - uploadCatImage, updateCat, deleteCat
 * - 猫関連の Realtime subscription
 * 
 * 効果: 猫一覧の更新で他のUIが再レンダリングされなくなる
 * 
 * Phase 2: InventoryContext の分離
 * ─────────────────────────────────
 * - inventory, setInventory
 * - useInventory フック統合
 * - 在庫の CRUD 操作
 * 
 * Phase 3: SettingsContext の分離
 * ─────────────────────────────────
 * - noticeDefs, careTaskDefs
 * - 設定の永続化ロジック
 * 
 * Phase 4: 残りを AppContext に維持
 * ─────────────────────────────────
 * - isDemo, isPro
 * - household 情報
 * - グローバルなUI状態
 * 
 * =============================================================================
 * 実装時の注意点
 * =============================================================================
 * 
 * 1. 依存関係の整理
 *    - CatsContext は他に依存しない
 *    - InventoryContext は householdId に依存
 *    - SettingsContext は householdId に依存
 * 
 * 2. Provider のネスト順序
 *    <AuthProvider>
 *      <AppProvider>        // グローバル状態
 *        <CatsProvider>     // 猫データ
 *          <InventoryProvider>
 *            <App />
 *          </InventoryProvider>
 *        </CatsProvider>
 *      </AppProvider>
 *    </AuthProvider>
 * 
 * 3. テスト戦略
 *    - 分離前にスナップショットテストを作成
 *    - 分離後にリグレッションがないか確認
 * 
 * =============================================================================
 * 参考: CatsContext の雛形
 * =============================================================================
 * 
 * // src/store/cats-context.tsx
 * 
 * import { createContext, useContext, ReactNode } from 'react';
 * import { useCats } from '@/hooks/use-supabase-data';
 * 
 * type CatsContextType = {
 *     cats: Cat[];
 *     loading: boolean;
 *     refetchCats: () => void;
 *     updateCat: (id: string, updates: Partial<Cat>) => Promise<void>;
 *     uploadCatImage: (catId: string, file: File) => Promise<void>;
 * };
 * 
 * const CatsContext = createContext<CatsContextType | null>(null);
 * 
 * export function CatsProvider({ householdId, children }: { 
 *     householdId: string | null; 
 *     children: ReactNode 
 * }) {
 *     const { cats, loading, refetch } = useCats(householdId);
 *     // ... CRUD operations
 *     return <CatsContext.Provider value={...}>{children}</CatsContext.Provider>;
 * }
 * 
 * export function useCatsContext() {
 *     const ctx = useContext(CatsContext);
 *     if (!ctx) throw new Error('useCatsContext must be used within CatsProvider');
 *     return ctx;
 * }
 */
