from rest_framework.permissions import BasePermission

class IsAdminUserProfile(BasePermission):
    """
    Allows access only to users with admin role in Profile.
    """
    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and hasattr(user, 'profile') and user.profile.role == 'admin' 