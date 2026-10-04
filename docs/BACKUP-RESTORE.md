\# Backup and Restore Runbook



\## Purpose



This document defines the backup and recovery process for the StockAI Polymers PostgreSQL database.



\## Backup



Production PostgreSQL backups must:



\* Run on the defined backup schedule

\* Be stored outside the application runtime

\* Use protected S3 storage

\* Follow the configured retention/lifecycle policy

\* Be monitored for successful completion



Never commit database dumps to Git.



\## Backup Verification



For each backup review:



1\. Confirm the backup job completed successfully.

2\. Confirm a backup object exists in the configured S3 location.

3\. Record the backup timestamp.

4\. Confirm the backup belongs to the expected database/environment.

5\. Investigate failed or missing backups immediately.



\## Restore Drill



Restore testing must use a temporary or non-production PostgreSQL database.



Never overwrite the production database during a restore test.



Record:



\* Backup object used

\* Backup timestamp

\* Restore target

\* Restore start time

\* Restore completion time

\* Schema validation result

\* Critical data validation result

\* Application connectivity result

\* Cleanup result



\## Recovery Validation



After restoration:



\* Verify database connectivity.

\* Verify required tables exist.

\* Verify critical records are present.

\* Verify application migrations/schema compatibility.

\* Run application health checks.

\* Remove the temporary restore environment after validation.



\## RTO and RPO



Do not claim an RTO or RPO until it has been measured.



Record the measured values from an actual restore drill and update the disaster-recovery documentation.



\## Security



Backup storage must not expose production data publicly.



Database credentials must never be stored in this document or committed to source control.



Backup files must be treated as sensitive production data.



\## Recovery Principle



A successful backup job does not by itself prove recoverability.



Production recovery capability should be considered validated only after a documented non-destructive restore drill succeeds.
