SELECT 
    id, 
    action_type, 
    points, 
    earned_at,
    user_id
FROM cat_footprints 
ORDER BY earned_at DESC 
LIMIT 50;

SELECT 
    action_type, 
    SUM(points) as total_points,
    COUNT(*) as count
FROM cat_footprints 
GROUP BY action_type;
