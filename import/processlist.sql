SELECT ID AS id
FROM information_schema.PROCESSLIST
WHERE TIME > 30
AND COMMAND != 'Sleep';
