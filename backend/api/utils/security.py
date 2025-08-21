"""
Security utilities for SagiTech
"""

import hashlib
import secrets
import logging
from typing import Optional
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from PIL import Image
import magic

logger = logging.getLogger(__name__)


class FileSecurityValidator:
    """Validate uploaded files for security"""
    
    # Allowed MIME types
    ALLOWED_IMAGE_TYPES = [
        'image/jpeg',
        'image/png', 
        'image/webp'
    ]
    
    # Maximum file size (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    # Minimum image dimensions
    MIN_WIDTH = 100
    MIN_HEIGHT = 100
    
    # Maximum image dimensions
    MAX_WIDTH = 4096
    MAX_HEIGHT = 4096

    @classmethod
    def validate_image_file(cls, uploaded_file: UploadedFile) -> tuple[bool, Optional[str]]:
        """
        Comprehensive validation of uploaded image files
        
        Returns:
            (is_valid, error_message)
        """
        try:
            # Check file size
            if uploaded_file.size > cls.MAX_FILE_SIZE:
                return False, f"File too large: {uploaded_file.size} bytes (max: {cls.MAX_FILE_SIZE})"
            
            # Check MIME type
            if uploaded_file.content_type not in cls.ALLOWED_IMAGE_TYPES:
                return False, f"Invalid file type: {uploaded_file.content_type}"
            
            # Verify file content matches MIME type (prevent MIME spoofing)
            file_content = uploaded_file.read()
            uploaded_file.seek(0)  # Reset file pointer
            
            try:
                detected_type = magic.from_buffer(file_content, mime=True)
                if detected_type not in cls.ALLOWED_IMAGE_TYPES:
                    return False, f"File content doesn't match declared type. Detected: {detected_type}"
            except Exception as e:
                logger.warning(f"Could not detect file type: {e}")
                # Continue without MIME validation if magic fails
            
            # Validate image using PIL
            try:
                with Image.open(uploaded_file) as img:
                    width, height = img.size
                    
                    # Check dimensions
                    if width < cls.MIN_WIDTH or height < cls.MIN_HEIGHT:
                        return False, f"Image too small: {width}x{height} (min: {cls.MIN_WIDTH}x{cls.MIN_HEIGHT})"
                    
                    if width > cls.MAX_WIDTH or height > cls.MAX_HEIGHT:
                        return False, f"Image too large: {width}x{height} (max: {cls.MAX_WIDTH}x{cls.MAX_HEIGHT})"
                    
                    # Check for potential malicious content
                    if img.mode not in ['RGB', 'RGBA', 'L']:
                        return False, f"Unsupported image mode: {img.mode}"
                    
                    # Verify image can be processed
                    img.verify()
                    
            except Exception as e:
                return False, f"Invalid image file: {str(e)}"
            
            return True, None
            
        except Exception as e:
            logger.error(f"File validation error: {e}")
            return False, f"Validation failed: {str(e)}"

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Sanitize uploaded filename"""
        import re
        
        # Remove path separators and dangerous characters
        filename = re.sub(r'[^\w\s.-]', '', filename)
        filename = re.sub(r'[\\/:]', '_', filename)
        
        # Limit length
        if len(filename) > 100:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:95] + ('.' + ext if ext else '')
        
        return filename

    @classmethod
    def generate_secure_filename(cls, original_filename: str) -> str:
        """Generate secure filename with timestamp and hash"""
        import os
        from datetime import datetime
        
        # Get file extension
        _, ext = os.path.splitext(original_filename)
        
        # Generate secure name
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        random_hash = secrets.token_hex(8)
        
        return f"scan_{timestamp}_{random_hash}{ext}"


class InputSanitizer:
    """Sanitize user inputs"""
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            return ""
        
        # Remove null bytes and control characters
        value = value.replace('\x00', '').strip()
        
        # Limit length
        if len(value) > max_length:
            value = value[:max_length]
        
        return value
    
    @staticmethod
    def sanitize_email(email: str) -> str:
        """Sanitize email input"""
        if not isinstance(email, str):
            return ""
        
        # Basic email sanitization
        email = email.strip().lower()
        
        # Remove dangerous characters
        allowed_chars = set('abcdefghijklmnopqrstuvwxyz0123456789@.-_')
        email = ''.join(c for c in email if c in allowed_chars)
        
        return email[:254]  # Email max length


class APIKeyManager:
    """Manage API keys securely"""
    
    @staticmethod
    def validate_api_key(key: str) -> bool:
        """Validate API key format"""
        if not key or len(key) < 32:
            return False
        
        # Check for valid characters
        allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
        return all(c in allowed_chars for c in key)
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate secure API key"""
        return secrets.token_urlsafe(32)


class SecurityLogger:
    """Log security events"""
    
    @staticmethod
    def log_suspicious_activity(user, activity: str, details: dict):
        """Log potentially suspicious activity"""
        logger.warning(f"🚨 Suspicious activity: {activity}")
        logger.warning(f"User: {user}")
        logger.warning(f"Details: {details}")
        
        # In production, this would integrate with security monitoring
        # e.g., send to SIEM, trigger alerts, etc.
    
    @staticmethod
    def log_failed_authentication(email: str, ip: str, reason: str):
        """Log failed authentication attempts"""
        logger.warning(f"🔐 Failed login attempt")
        logger.warning(f"Email: {email}")
        logger.warning(f"IP: {ip}")
        logger.warning(f"Reason: {reason}")
        
        # Track failed attempts in cache for rate limiting
        from django.core.cache import cache
        key = f"failed_login:{ip}"
        failed_count = cache.get(key, 0)
        cache.set(key, failed_count + 1, 3600)  # 1 hour
        
        if failed_count > 5:
            logger.error(f"🚨 Multiple failed login attempts from IP: {ip}")


# Export utilities
__all__ = [
    'FileSecurityValidator',
    'InputSanitizer', 
    'APIKeyManager',
    'SecurityLogger'
]