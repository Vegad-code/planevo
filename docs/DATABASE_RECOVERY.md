# Planevo Database Point-in-Time Recovery (PITR) & Backup Verification

This guide outlines the point-in-time recovery (PITR) and manual backup procedures for the Planevo Supabase database. PITR allows you to restore your database to any specific second within your retention window (typically 7 days on the Pro tier).

---

## 1. Supabase Point-in-Time Recovery (PITR)

Supabase Pro and Enterprise tiers support PITR. When recovering from a critical event (such as accidental data deletion or schema corruption):

### Step-by-Step Recovery Process
1. **Access Supabase Dashboard**: Log in to the [Supabase Dashboard](https://supabase.com/dashboard) and navigate to your production project.
2. **Go to Database Settings**: Click on **Settings** (gear icon) in the sidebar, then select **Database**.
3. **Navigate to Backups**: Scroll down to the **Backups** section.
4. **Initiate Point-in-Time Restore**:
   - Click on the **Restore** button or select **Point-in-Time Recovery**.
   - Select the target date and time (in UTC) to which you want to restore.
5. **Restore Mode (New Project)**:
   - Supabase restores PITR backups to a **new project** to prevent destructive overwrites of your current live database. This allows you to verify the restored database before routing live traffic.
   - Enter the name and configuration details for the new restored project.
   - Click **Restore** to begin the provisioning and restoration process. This may take 10–30 minutes depending on database size.
6. **Data Verification**:
   - Once the restored project is active, connect to it using a database GUI (like PgAdmin or DBeaver) or check the Supabase Table Editor.
   - Confirm that the critical data (users, calendar_events, tasks) is present and correct as of the target timestamp.
7. **Connection Swap**:
   - Update your environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in **Vercel** production settings and any server hosts to point to the new project's connection strings.
   - Redeploy the web app to apply the new connection details.
   - Swap the Mobile Expo environment variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) to match the restored instance for mobile clients.

---

## 2. Emergency Manual Backups (CLI fallback)

If you need a local snapshot before running risky migrations, use the standard PostgreSQL CLI tools:

### Creating a Snapshot (Backup)
Run this command from your terminal:
```bash
pg_dump -h db.your-project-ref.supabase.co -U postgres -d postgres -F p -f local_backup_snapshot.sql
```
*Note: You will be prompted to enter your database password.*

### Restoring a Manual Snapshot
To restore a manual SQL snapshot back to a test or staging database:
```bash
psql -h db.your-test-project-ref.supabase.co -U postgres -d postgres -f local_backup_snapshot.sql
```

---

## 3. Weekly Recovery Verification Checklist

To ensure backups are active and reliable, perform this quick validation monthly:
- [ ] Verify that PITR is enabled in Supabase Billing & Settings.
- [ ] Run a test manual backup (`pg_dump`) to ensure connections are not blocked by firewall rules.
- [ ] Keep database credentials stored securely in your team password manager.
