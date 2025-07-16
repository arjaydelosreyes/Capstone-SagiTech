# Backend Integration Logic Recap

This document summarizes the key backend integration logic for authentication, registration, profile management, and role-based access in this Django project.

---

## 1. Authentication (JWT, Email-based)
- **Custom JWT Authentication:**
  - Uses a custom serializer (`EmailTokenObtainPairSerializer`) to allow login with email and password instead of username.
  - On login, the serializer injects the username based on the provided email, then authenticates using Django's default user model.
  - Endpoint: `POST /api/token/` (see `authentication.py`)

## 2. Registration
- **Custom Registration Serializer:**
  - Accepts `username`, `email`, `password`, `role`, and `name` (full name) fields.
  - Splits the `name` into `first_name` and `last_name` for the Django User model.
  - Enforces unique email and username with clear error messages.
  - Creates a `Profile` object for each user, assigning the selected role (`farmer` or `admin`).
  - Endpoint: `POST /api/register/` (see `serializers.py`)

## 3. Profile Management
- **Profile Model:**
  - Each user has a one-to-one `Profile` with a `role` field (`farmer` or `admin`).
  - The `ProfileViewSet` exposes profile data via REST API.
  - Authenticated users can fetch their own profile via `/api/profiles/me/`.
  - Endpoint: `GET /api/profiles/me/` (see `models.py`, `views.py`)

## 4. Role-Based Access
- **Role Assignment:**
  - Role is set at registration and stored in the `Profile` model.
  - Role can be used in frontend or additional backend permissions to control access to resources.

## 5. API Endpoints
- `/api/register/` — User registration
- `/api/token/` — Obtain JWT token (login)
- `/api/profiles/` — CRUD for profiles (admin only)
- `/api/profiles/me/` — Get current user's profile

## 6. Settings & Middleware
- **JWT Authentication** is set as the default in `REST_FRAMEWORK` settings.
- **CORS** is enabled for all origins (development only).

---

## References
- `api/serializers.py` — User, Profile, and Register serializers
- `api/authentication.py` — Custom JWT logic
- `api/views.py` — Profile and registration views
- `api/models.py` — Profile model
- `api/urls.py` — API routing
- `backend/settings.py` — REST and CORS settings

---

**Note:** Superuser/admin name assignment is handled manually or via script after creation, as automation within management commands was unreliable due to transaction timing. 