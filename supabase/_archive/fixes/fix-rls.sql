-- 追加の RLS Policies for Onboarding
-- households, cats, inventory テーブルへの INSERT を許可

-- Households: 認証済みユーザーは世帯を作成できる
CREATE POLICY "Authenticated users can create households" ON households
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Cats: 自分の世帯に猫を追加できる
CREATE POLICY "Users can insert cats to own household" ON cats
    FOR INSERT WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- Inventory: 自分の世帯に在庫を追加できる
CREATE POLICY "Users can insert inventory to own household" ON inventory
    FOR INSERT WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- Care Logs: 自分の世帯にログを追加できる
CREATE POLICY "Users can insert care_logs to own household" ON care_logs
    FOR INSERT WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- Observations: 自分の世帯の猫に観察を追加できる
CREATE POLICY "Users can insert observations for own cats" ON observations
    FOR INSERT WITH CHECK (
        cat_id IN (SELECT id FROM cats WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        ))
    );
