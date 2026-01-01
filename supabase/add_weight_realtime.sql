-- Enable real-time for cat_weight_history table
-- This allows the frontend to receive updates when a weight record is added/updated/deleted

-- Add table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE cat_weight_history;
