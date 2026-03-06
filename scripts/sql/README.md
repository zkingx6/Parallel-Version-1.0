Ad-hoc SQL for manual runs (resets, test data). Not migrations.

Example:
```bash
psql $DATABASE_URL -f scripts/sql/reset-hard-no-ranges-corrupted.sql
```
