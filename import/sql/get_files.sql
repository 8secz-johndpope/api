SELECT
    id,
    md5,
    s3_key,
    url
FROM file
WHERE url IS NULL
ORDER BY id;