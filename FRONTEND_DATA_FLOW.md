# Capstone-SagiTech: Frontend Data Flow (Before & After Backend Integration)

This document explains how your frontend currently handles data, and what will change after integrating with your Django REST backend and SQLite3 database. Use this as a reference to avoid confusion during development.

---

## Current State (Before Backend Integration)
- **User data, scan results, and analytics are NOT real or persistent.**
- All data is stored in the browser (e.g., localStorage) or as mock data in the frontend code.
- No data is shared between users or devices.
- Logging in, registering, and scanning bananas only affects the local browser.

---

## After Backend Integration
- **All important data will be fetched from and saved to the backend via API calls.**
- User registration, login, and roles will be managed by Django and stored in the SQLite3 database.
- Scan results and analytics will be real, persistent, and available to users across devices.
- The frontend will no longer use localStorage for user or scan data (only for non-sensitive UI preferences, if needed).

---

## Data Flow: Before vs. After

| Feature                | Before (No Backend)         | After (With Backend)                |
|------------------------|-----------------------------|-------------------------------------|
| User Registration      | Local only (not real)       | API call to Django, saved in DB     |
| User Login             | Local only (not real)       | API call to Django, JWT/session     |
| User Roles             | Hardcoded or local          | Managed by backend, stored in DB    |
| Scan Results           | localStorage or mock data   | API call to Django, saved in DB     |
| Analytics              | Calculated from local data  | Calculated from real backend data   |
| Data Persistence       | Browser only                | Persistent in SQLite3 database      |
| Multi-user Support     | No                          | Yes                                 |

---

## Summary
- **Before integration:** All data is local and not real/persistent.
- **After integration:** All data is real, persistent, and managed by your Django backend and SQLite3 database via REST API calls.

**Always use this document to remind yourself of the data flow and avoid confusion as you transition to a fullstack system!** 