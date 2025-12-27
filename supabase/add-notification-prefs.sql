-- Add notification_preferences column to users table
alter table public.users 
add column if not exists notification_preferences jsonb default '{"care_reminder": true, "health_alert": true}';

-- Comment on column
comment on column public.users.notification_preferences is 'User settings for smart notifications';
