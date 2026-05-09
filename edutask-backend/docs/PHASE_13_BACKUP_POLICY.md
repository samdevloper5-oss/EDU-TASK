# Phase 13 Backup & Recovery Policy

## Platform Assumption
Primary database platform: Supabase PostgreSQL.

## Backup Schedule
1. Daily full backup snapshot.
2. Continuous WAL/PITR enabled where plan supports it.
3. Retention: 14 days minimum for daily snapshots.

## Recovery Objectives
1. RPO (Recovery Point Objective): `<= 15 minutes` with PITR, otherwise last daily snapshot.
2. RTO (Recovery Time Objective): `<= 2 hours` for full service recovery.

## Recovery Procedure
1. Declare incident and freeze deploys.
2. Confirm corruption/outage scope and recovery timestamp target.
3. Restore database from snapshot or PITR target.
4. Repoint application to recovered database endpoint.
5. Run smoke checks:
   - `/health`
   - critical dispute/admin paths
   - metrics availability
6. Resume traffic gradually and monitor rollback/error counters.

## Validation Cadence
1. Quarterly restore drill in staging.
2. Validate backup integrity and RTO adherence.
3. Document drill outcome and corrective actions.

## Access Control
1. Backup restore rights restricted to platform admins.
2. Recovery actions require incident ticket and audit trail.
