# 🗄️ Database Management

## 📊 **Schema Overview**

The Erasmos database is built on **PostgreSQL** with a comprehensive schema supporting:

- **Multi-role user management** with hierarchical relationships
- **Advanced application workflows** with approval processes  
- **Flexible billing system** with personal vs team application rates
- **Complete audit trails** for all user actions

---

## 🚀 **Setup Instructions**

### **1. Database Creation**
```bash
# Using Docker (Recommended)
docker run --name erasmos-db \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 \
  -d postgres

# Or install PostgreSQL locally and create database
createdb erasmos
```

### **2. Schema Installation**
```bash
# Load complete schema
psql -h localhost -p 5432 -U postgres -d postgres < schema.sql
```

### **3. Apply Migrations (In Order)**
```bash

# Step 13: Personal Applications Billing
psql -h localhost -p 5432 -U postgres -d postgres < migrations/004_step13_personal_billing.sql
```

---

## 📋 **Migration Files**


### **004_step13_personal_billing.sql**
- Adds `is_personal` column to applications table
- Creates `team_leader_personal_billing_settings` table
- Implements advanced billing logic with separate personal/team rates
- Adds utility functions for rate calculations

---

## 🔍 **Database Verification**

### **Check Schema Installation**
```sql
-- Verify main tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check user management setup
SELECT id, name, email, role FROM users LIMIT 5;

-- Verify billing configuration
SELECT * FROM team_leader_billing_overview;
```

### **Test Data Queries**
```sql
-- Applications breakdown
SELECT 
  is_personal,
  COUNT(*) as application_count,
  status
FROM applications 
GROUP BY is_personal, status;

-- User status overview
SELECT
  u.name,
  u.role,
  u.email
FROM users u
WHERE u.role IN ('TeamLeader', 'Associate');

-- Billing rates overview
SELECT * FROM team_leader_billing_overview;
```

---

## 🛠️ **Maintenance Commands**

### **Backup Database**
```bash
pg_dump -h localhost -p 5432 -U postgres postgres > erasmos_backup_$(date +%Y%m%d).sql
```

### **Restore Database**
```bash
psql -h localhost -p 5432 -U postgres postgres < erasmos_backup_YYYYMMDD.sql
```

### **Update Statistics**
```sql
ANALYZE; -- Update table statistics for optimal query planning
VACUUM;  -- Reclaim storage and update statistics
```

---

## 📊 **Key Database Features**

### **Performance Optimizations**
- **Strategic Indexing**: All foreign keys and frequently queried columns indexed
- **Query Optimization**: Complex joins optimized with proper indexes
- **Connection Pooling**: Backend uses connection pooling for optimal performance

### **Data Integrity**
- **Foreign Key Constraints**: Maintain referential integrity across all relationships
- **Check Constraints**: Validate data at database level
- **Triggers**: Automatic timestamp updates and audit trail maintenance

### **Security Features**
- **Role-Based Access**: Database-level security aligned with application roles
- **Audit Trails**: Complete logging of all data modifications
- **Data Encryption**: Sensitive data encrypted at rest and in transit

---

## 🔧 **Troubleshooting**

### **Common Issues**

**Connection Issues**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres
# or for local installation
pg_isready
```

**Migration Failures**
```sql
-- Check if tables already exist
SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%applications%';

-- Check constraint conflicts
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'users'::regclass;
```

**Performance Issues**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
SELECT schemaname, tablename, last_analyze, last_autoanalyze 
FROM pg_stat_all_tables 
WHERE schemaname = 'public';
```

---

## 📈 **Future Enhancements**

### **Planned Database Features**
- **Advanced Analytics Views**: Pre-computed business intelligence queries
- **Data Archiving**: Automatic archiving of old records for performance
- **Replication Setup**: Master-slave replication for high availability
- **Advanced Indexing**: Partial and expression indexes for complex queries

### **Monitoring Integration**
- **Query Performance Tracking**: Integration with pg_stat_statements
- **Connection Pool Monitoring**: Real-time connection usage analytics  
- **Storage Usage Alerts**: Automatic notifications for storage thresholds

---

*Database schema maintained with care for optimal performance and data integrity*