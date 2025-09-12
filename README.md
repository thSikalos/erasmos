# 🏢 Έρασμος - Business Management Platform

A comprehensive business management system for team leaders, associates, and administrators built with **Node.js**, **React**, and **PostgreSQL**.

## 🎯 **Features Overview**

### **👥 User Management**
- **Multi-role System**: Admin, Team Leader, Associate, Secretary roles
- **Team Hierarchies**: Team leaders manage their associates  
- **Advanced Authentication**: JWT-based with terms acceptance tracking
- **User Activity**: Complete audit trails and session management

### **📋 Application Management** 
- **Smart Application Creation**: Context-aware forms with dynamic fields
- **Personal vs Team Applications**: Separate workflows and billing
- **Approval Workflows**: Team applications require leader approval
- **Status Tracking**: Complete lifecycle management

### **💰 Advanced Billing System**
- **Dual Billing Model**: Different rates for personal vs team applications
- **Flexible Configuration**: Per-leader customization for both categories
- **Volume Discounts**: Automatic tier-based discounts for team applications
- **Professional Invoicing**: PDF generation with detailed breakdowns

### **⚖️ Legal Compliance**
- **GDPR-Compliant Terms System**: Version-controlled terms acceptance
- **PDF Documentation**: Legal-proof acceptance records with full audit trail
- **Data Protection**: Complete user agreement archival system

### **📊 Reporting & Analytics**
- **Dashboard Analytics**: Real-time business intelligence  
- **Commission Tracking**: Automated calculation and reporting
- **Financial Reports**: Comprehensive billing and payment tracking

---

## 🏗️ **Project Structure**

```
erasmos/
├── backend/              # Node.js API Server
│   ├── src/
│   │   ├── controllers/  # Business logic
│   │   ├── routes/       # API endpoints  
│   │   ├── middleware/   # Authentication, validation
│   │   └── config/       # Database and app configuration
│   └── package.json
│
├── frontend/             # React Web Application  
│   ├── src/
│   │   ├── pages/        # Application screens
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # State management
│   │   └── utils/        # Helper functions
│   └── package.json
│
├── database/             # Database Management
│   ├── schema.sql        # Complete database schema
│   └── migrations/       # Version-controlled DB changes
│
└── docs/                 # Project Documentation
    ├── setup/            # Installation and setup guides
    ├── features/         # Feature documentation  
    └── deployment/       # Production deployment guides
```

---

## 🚀 **Quick Start**

### **Prerequisites**
- **Node.js** 18+ 
- **PostgreSQL** 14+
- **Docker** (optional, recommended)

### **1. Clone Repository**
```bash
git clone https://github.com/your-username/erasmos.git
cd erasmos
```

### **2. Database Setup**
```bash
# With Docker (recommended)
docker run --name erasmos-db -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres

# Load schema and migrations
psql -h localhost -p 5432 -U postgres -d postgres < database/schema.sql
psql -h localhost -p 5432 -U postgres -d postgres < database/migrations/002_step12_terms.sql  
psql -h localhost -p 5432 -U postgres -d postgres < database/migrations/003_terms_versioning.sql
psql -h localhost -p 5432 -U postgres -d postgres < database/migrations/004_step13_personal_billing.sql
```

### **3. Backend Setup**
```bash
cd backend
npm install
npm run dev  # Starts development server on port 3000
```

### **4. Frontend Setup**  
```bash
cd frontend
npm install  
npm run dev  # Starts development server on port 5173
```

### **5. Access Application**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432

---

## 📱 **Application Flow**

### **For Team Leaders:**
1. **Login** → Terms acceptance (if first time)
2. **Dashboard** → Overview of team performance and personal metrics
3. **Applications** → Create personal (immediate) or team applications  
4. **Team Management** → Approve associate applications
5. **Billing** → View invoices with separate personal/team breakdown

### **For Associates:**
1. **Login** → Terms acceptance  
2. **Applications** → Create applications (require team leader approval)
3. **Dashboard** → Track application status and commissions

### **For Administrators:**
1. **User Management** → Create/manage all users and hierarchies
2. **Billing Configuration** → Set rates for team vs personal applications
3. **System Administration** → Terms management, reporting, system health

---

## 🔧 **Key Technologies**

### **Backend Stack**
- **Node.js + Express**: RESTful API server
- **PostgreSQL**: Primary database with advanced queries
- **JWT Authentication**: Secure token-based auth with role management  
- **PDFKit**: Professional PDF generation for invoices and legal documents
- **Comprehensive Middleware**: Terms checking, authentication, role-based access

### **Frontend Stack**
- **React 19**: Modern component-based UI
- **React Router**: Client-side routing with protected routes
- **Axios**: HTTP client with interceptors for auth and error handling
- **Context API**: State management for authentication and user data
- **Responsive Design**: Mobile-first, professional interface

### **Database Features**
- **Advanced Schema**: Multi-table relationships with foreign keys
- **Audit Trails**: Complete tracking of user actions and data changes
- **Version Control**: Database migrations with rollback support
- **Performance**: Optimized queries with proper indexing

---

## 📈 **Business Intelligence**

### **Advanced Billing Analytics**
- **Revenue Tracking**: Separate analysis for personal vs team applications
- **Commission Management**: Automated calculation with custom rates per user
- **Volume Discounts**: Tier-based pricing with automatic application
- **Financial Reporting**: Professional invoices with legal compliance

### **User Activity Analytics** 
- **Terms Compliance**: Track acceptance rates and legal documentation
- **Application Workflows**: Monitor approval times and bottlenecks  
- **Team Performance**: Analyze productivity across different team structures

---

## 🔒 **Security & Compliance**

### **Data Protection**
- **GDPR Compliance**: Complete user consent management with versioned terms
- **Audit Trails**: Every user action logged with timestamps and IP addresses
- **Legal Documentation**: PDF generation for compliance and record-keeping

### **Application Security**
- **Role-Based Access Control**: Granular permissions based on user roles
- **JWT Token Management**: Secure authentication with automatic refresh
- **Input Validation**: Comprehensive sanitization and validation on all inputs
- **SQL Injection Prevention**: Parameterized queries and prepared statements

---

## 👥 **Contributing**

### **Development Workflow**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`  
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### **Code Standards**
- **ES6+** JavaScript with consistent formatting
- **Component-based** React architecture  
- **RESTful API** design principles
- **Comprehensive** error handling and logging

---

## 📞 **Support & Documentation**

- **Setup Guide**: `docs/setup/`
- **Feature Documentation**: `docs/features/`  
- **API Documentation**: `docs/api/`
- **Deployment Guide**: `docs/deployment/`

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🏆 **Project Status**

**Current Version**: v1.0.0 (Step 13 Complete)
- ✅ **Complete User Management** with role-based access
- ✅ **Advanced Billing System** with personal vs team applications
- ✅ **GDPR-Compliant Terms System** with PDF documentation
- ✅ **Professional Admin Interface** with comprehensive configuration
- ✅ **Mobile-Responsive Design** with modern UX/UI

**Next Steps**: Performance optimization, advanced reporting, mobile app development

---

*Built with ❤️ for modern business management*