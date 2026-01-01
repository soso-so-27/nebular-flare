-- Trigger to touch 'cats' updated_at on weight history change
-- This ensures that useCats() hook (which listens to cats changes) re-fetches data including new weights.

CREATE OR REPLACE FUNCTION touch_cat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cats
    SET updated_at = NOW()
    WHERE id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.cat_id ELSE NEW.cat_id END);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_weight_history_change
AFTER INSERT OR UPDATE OR DELETE ON cat_weight_history
FOR EACH ROW
EXECUTE FUNCTION touch_cat_updated_at();
