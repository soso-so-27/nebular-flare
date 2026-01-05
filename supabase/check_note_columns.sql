
SELECT 
    table_name,
    column_name, 
    data_type
FROM 
    information_schema.columns
WHERE 
    table_name IN ('care_logs', 'observations')
    AND column_name IN ('note', 'notes', 'memo', 'comment');
