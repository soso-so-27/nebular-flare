-- Check "Shelf" (Encyclopedia) counts based on labels.moment
SELECT
  ai_analysis->'labels'->>'moment' as moment,
  COUNT(*) as count
FROM cat_images
WHERE ai_analysis IS NOT NULL
GROUP BY moment;

-- Check "Discover" (For You) candidates
SELECT
  id,
  ai_analysis->'forYouScores'->>'dailyPick' as daily_score,
  ai_analysis->'forYouScores'->>'weeklyHighlight' as weekly_score,
  ai_analysis->'forYouScores'->>'funnyMoment' as funny_score,
  ai_analysis->'uiTags' as tags
FROM cat_images
WHERE ai_analysis IS NOT NULL
ORDER BY daily_score DESC
LIMIT 10;
