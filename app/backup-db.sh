#!/bin/sh
# Dump every FirstJobJab database to backups/ (gitignored). Restore: docker compose exec -T db psql -U fjm -d <db> < backups/<file>.sql
set -e
mkdir -p backups
ts=$(date +%Y%m%d-%H%M)
for db in $(docker compose exec -T db psql -U fjm -d postgres -tAc "select datname from pg_database where datname like 'fjm%'"); do
  docker compose exec -T db pg_dump -U fjm --clean --if-exists "$db" > "backups/${db}_$ts.sql"
  echo "backups/${db}_$ts.sql"
done
