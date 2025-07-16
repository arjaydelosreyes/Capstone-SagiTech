// src/utils/authService.ts
import { User } from "@/types";
import { toast } from "@/hooks/use-toast";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type UserWithPassword = User & { password: string };

export async function register({ name, email, password }: { name: string; email: string; password: string }) {
  try {
    const username = name.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 10000);
    const res = await fetch('http://localhost:8000/api/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role: 'farmer', name }),
    });
    if (!res.ok) {
      let errorMsg = "Registration failed. Please check your details.";
      try {
        const data = await res.clone().json();
        if (typeof data === "string") errorMsg = data;
        else if (data.detail) errorMsg = data.detail;
        else if (data.error) errorMsg = data.error;
        else if (data.email && Array.isArray(data.email)) errorMsg = data.email[0];
        else if (data.username && Array.isArray(data.username)) errorMsg = data.username[0];
        // Add more fields as needed
      } catch {
        try {
          const text = await res.text();
          if (text) errorMsg = text;
        } catch {}
      }
      toast({
        title: "Registration Error",
        description: errorMsg,
        variant: "destructive",
      });
      throw new Error(errorMsg);
    }
    return res.json();
  } catch (err: any) {
    console.error("Registration error:", err);
    toast({
      title: "Registration Error",
      description: err.message || "An unexpected error occurred during registration.",
      variant: "destructive",
    });
    throw err;
  }
}

export async function login({ email, password }: { email: string; password: string }) {
  try {
    const res = await fetch('http://localhost:8000/api/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      let errorMsg = "Login failed. Please check your credentials.";
      try {
        const data = await res.clone().json();
        if (typeof data === "string") errorMsg = data;
        else if (data.detail) {
          if (data.detail === "No active account found with the given credentials") {
            errorMsg = "Incorrect email or password. Please try again.";
          } else {
            errorMsg = data.detail;
          }
        }
        else if (data.error) errorMsg = data.error;
      } catch {
        try {
          const text = await res.text();
          if (text) errorMsg = text;
        } catch {}
      }
      toast({
        title: "Login Error",
        description: errorMsg,
        variant: "destructive",
      });
      throw new Error(errorMsg);
    }
    return await res.json();
  } catch (err: any) {
    console.error("Login error:", err);
    toast({
      title: "Login Error",
      description: err.message || "An unexpected error occurred during login.",
      variant: "destructive",
    });
    throw err;
  }
}

// Utility to fetch with auto-refresh of JWT token
export async function fetchWithAuth(url: string, options: any = {}) {
  let token = localStorage.getItem("sagitech-token");
  let res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    // Try to refresh token
    const tokens = JSON.parse(localStorage.getItem("sagitech-tokens") || '{}');
    const refresh = tokens.refresh;
    if (refresh) {
      const refreshRes = await fetch("http://localhost:8000/api/token/refresh/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem("sagitech-token", data.access);
        // Retry original request with new token
        res = await fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${data.access}`,
          },
        });
      } else {
        // Refresh failed, force logout
        localStorage.removeItem("sagitech-token");
        localStorage.removeItem("sagitech-tokens");
    localStorage.removeItem("sagitech-user");
        throw new Error("Session expired. Please log in again.");
      }
    } else {
      throw new Error("Session expired. Please log in again.");
    }
  }
  return res;
}

export async function uploadScanRecord({ image, banana_count, ripeness_results, avg_confidence }) {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('banana_count', banana_count);
  formData.append('ripeness_results', JSON.stringify(ripeness_results));
  formData.append('avg_confidence', avg_confidence);

  const res = await fetchWithAuth('http://localhost:8000/api/scan-records/', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload scan record');
  return res.json();
}

export async function fetchScanRecords() {
  const res = await fetchWithAuth('http://localhost:8000/api/scan-records/');
  if (!res.ok) throw new Error('Failed to fetch scan records');
  return res.json();
}

export const authService = {
  register,
  login,
  uploadScanRecord,
  fetchScanRecords,
}; 