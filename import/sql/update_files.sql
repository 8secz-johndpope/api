UPDATE file SET
    md5 = ?,
    changed = NOW(),
    changed_by = ?
WHERE id = ?;
