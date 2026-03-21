-- V2 collection seed data for Supabase SQL Editor
-- Purpose:
--   Seed collection_definitions / collection_rules with the actual English tags
--   currently returned by photo_analysis_results.
--
-- Observed live AI tags on 2026-03-21:
--   pose_tags   : sitting, facing forward
--   action_tags : gazing, looking
--   place_tags  : home, indoor, living room
--   mood_tags   : calm, curious
--   object_tags : books, furniture, plants
--
-- Important:
--   1. These tables do not have household_id columns, so no household placeholder is needed.
--   2. rule_json is shaped to match src/app/api/collection/aggregate/route.ts ruleMatches():
--      - category limits matching to one tag family
--      - match_tags is interpreted as OR
--      - match_all_tags would be interpreted as AND
--   3. Current zukan-screen v2 mode expects slugs that map to UI shelf items.
--      These slugs are clean English identifiers for the new rule system.
--      If the UI still relies on legacy slug names from ZUKAN_AXES, a later UI mapping fix may still be needed.

begin;

-- Remove existing rules for these slugs so the seed can be re-run safely.
delete from collection_rules
where collection_definition_id in (
  select id
  from collection_definitions
  where slug in (
    'pose_sitting',
    'pose_facing_forward',
    'action_looking',
    'action_gazing',
    'location_indoor',
    'location_home',
    'location_living_room',
    'emotion_calm',
    'emotion_curious',
    'object_plants',
    'object_books',
    'object_furniture'
  )
);

insert into collection_definitions (
  slug,
  name,
  category,
  description,
  level_thresholds,
  is_active,
  sort_order
)
values
  (
    'pose_sitting',
    'おすわり図鑑',
    'pose',
    '座っている猫の写真を集める図鑑',
    '{"1": 1, "2": 3, "3": 10}'::jsonb,
    true,
    10
  ),
  (
    'pose_facing_forward',
    '正面顔図鑑',
    'pose',
    'こちらを向いている猫の写真を集める図鑑',
    '{"1": 1, "2": 3, "3": 10}'::jsonb,
    true,
    11
  ),
  (
    'action_looking',
    '見つめる瞬間図鑑',
    'action',
    '何かを見つめている猫の瞬間を集める図鑑',
    '{"1": 1, "2": 3, "3": 8}'::jsonb,
    true,
    20
  ),
  (
    'action_gazing',
    'じっと見つめる図鑑',
    'action',
    'じっと視線を向けている猫の写真を集める図鑑',
    '{"1": 1, "2": 3, "3": 8}'::jsonb,
    true,
    21
  ),
  (
    'location_indoor',
    'おうち時間図鑑',
    'location',
    '室内で過ごす猫の写真を集める図鑑',
    '{"1": 1, "2": 3, "3": 10}'::jsonb,
    true,
    30
  ),
  (
    'location_home',
    'ホーム図鑑',
    'location',
    '家の中での猫の暮らしを集める図鑑',
    '{"1": 1, "2": 3, "3": 10}'::jsonb,
    true,
    31
  ),
  (
    'location_living_room',
    'リビング図鑑',
    'location',
    'リビングにいる猫の写真を集める図鑑',
    '{"1": 1, "2": 3, "3": 10}'::jsonb,
    true,
    32
  ),
  (
    'emotion_calm',
    'おだやか図鑑',
    'emotion',
    '落ち着いた表情の猫を集める図鑑',
    '{"1": 1, "2": 3, "3": 10}'::jsonb,
    true,
    40
  ),
  (
    'emotion_curious',
    'きょうみしんしん図鑑',
    'emotion',
    '好奇心いっぱいの猫の表情を集める図鑑',
    '{"1": 1, "2": 3, "3": 10}'::jsonb,
    true,
    41
  ),
  (
    'object_plants',
    '植物と猫図鑑',
    'object',
    '植物と一緒に写る猫の写真を集める図鑑',
    '{"1": 1, "2": 3, "3": 8}'::jsonb,
    true,
    50
  ),
  (
    'object_books',
    '本と猫図鑑',
    'object',
    '本のそばにいる猫の写真を集める図鑑',
    '{"1": 1, "2": 3, "3": 8}'::jsonb,
    true,
    51
  ),
  (
    'object_furniture',
    '家具と猫図鑑',
    'object',
    '家具と一緒に写る猫の写真を集める図鑑',
    '{"1": 1, "2": 3, "3": 8}'::jsonb,
    true,
    52
  )
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  level_thresholds = excluded.level_thresholds,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into collection_rules (
  collection_definition_id,
  rule_json,
  priority,
  is_active
)
select id, '{"category":"pose","match_tags":["sitting"]}'::jsonb, 100, true
from collection_definitions
where slug = 'pose_sitting'

union all
select id, '{"category":"pose","match_tags":["facing forward"]}'::jsonb, 100, true
from collection_definitions
where slug = 'pose_facing_forward'

union all
select id, '{"category":"action","match_tags":["looking"]}'::jsonb, 90, true
from collection_definitions
where slug = 'action_looking'

union all
select id, '{"category":"action","match_tags":["gazing"]}'::jsonb, 90, true
from collection_definitions
where slug = 'action_gazing'

union all
select id, '{"category":"location","match_tags":["indoor"]}'::jsonb, 80, true
from collection_definitions
where slug = 'location_indoor'

union all
select id, '{"category":"location","match_tags":["home"]}'::jsonb, 80, true
from collection_definitions
where slug = 'location_home'

union all
select id, '{"category":"location","match_tags":["living room"]}'::jsonb, 85, true
from collection_definitions
where slug = 'location_living_room'

union all
select id, '{"category":"emotion","match_tags":["calm"]}'::jsonb, 70, true
from collection_definitions
where slug = 'emotion_calm'

union all
select id, '{"category":"emotion","match_tags":["curious"]}'::jsonb, 70, true
from collection_definitions
where slug = 'emotion_curious'

union all
select id, '{"category":"object","match_tags":["plants"]}'::jsonb, 60, true
from collection_definitions
where slug = 'object_plants'

union all
select id, '{"category":"object","match_tags":["books"]}'::jsonb, 60, true
from collection_definitions
where slug = 'object_books'

union all
select id, '{"category":"object","match_tags":["furniture"]}'::jsonb, 60, true
from collection_definitions
where slug = 'object_furniture';

commit;

-- Optional verification queries after insert:
-- select slug, name, category from collection_definitions order by sort_order, slug;
-- select cd.slug, cr.rule_json, cr.priority
-- from collection_rules cr
-- join collection_definitions cd on cd.id = cr.collection_definition_id
-- order by cd.sort_order, cr.priority desc;
