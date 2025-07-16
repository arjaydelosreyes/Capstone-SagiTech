# Capstone-SagiTech: Important Data to Save in Database

This document outlines the key data models and fields to prioritize when designing your database schema for backend integration. Focus on these models first to ensure smooth frontend-backend interaction.

---

## 1. User
**(Leverage Django's built-in User model, but you can extend as needed)**

- `id` (AutoField, primary key)
- `username` (CharField, unique)
- `email` (EmailField, unique)
- `password` (CharField, hashed)
- `first_name` (CharField)
- `last_name` (CharField)
- `date_joined` (DateTimeField)
- `role` (CharField, e.g., 'farmer', 'admin')

> **Priority:** High — Needed for authentication, user-specific data, and permissions.

---

## 2. ScanResult
**(Represents a banana scan performed by a user)**

- `id` (AutoField, primary key)
- `user` (ForeignKey to User)
- `image` (ImageField or URL)
- `banana_count` (IntegerField)
- `confidence` (FloatField, e.g., 92.5)
- `ripeness` (CharField, e.g., 'ripe', 'unripe', 'overripe')
- `timestamp` (DateTimeField, auto_now_add=True)

> **Priority:** High — Core to the app’s functionality and dashboard analytics.

---

## 3. (Optional) Analytics/Aggregates
- These can be calculated on the fly, but you may want to store:
  - `user` (ForeignKey to User)
  - `total_scans` (IntegerField)
  - `average_confidence` (FloatField)
  - `last_scan_date` (DateTimeField)

> **Priority:** Medium — Useful for dashboard stats, but can be derived from ScanResult.

---

## 4. (Optional) Feedback/Notes
- `id` (AutoField, primary key)
- `user` (ForeignKey to User)
- `message` (TextField)
- `created_at` (DateTimeField)

> **Priority:** Low — Only if you want to collect user feedback.

---

## 5. (Optional) Admin Settings
- For admin-only features, e.g., thresholds, system notices.

> **Priority:** Low — Can be added after core features.

---

## **Recommended Prioritization for Backend Integration**
1. **User** (authentication, roles)
2. **ScanResult** (all scan data)
3. (Optional) Analytics/Aggregates (if needed for performance)
4. (Optional) Feedback/Notes
5. (Optional) Admin Settings

---

**Start with User and ScanResult models for your initial backend and API development.** 