import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_TOKEN_KEY = "auth_session_token";

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
  }
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl();
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${base}/api${path}`, { ...options, headers });
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  workMinutes: number;
  salaryEstimate: number;
  note: string | null;
  createdAt: string;
}

export interface AttendanceSummary {
  month: string;
  totalWorkMinutes: number;
  totalWorkDays: number;
  totalSalaryEstimate: number;
  records: AttendanceRecord[];
}

export interface UserSettings {
  userId: string;
  hourlyWage: number;
  breakMinutes: number;
  workplaceName: string | null;
}

export async function getAttendanceSummary(month?: string): Promise<AttendanceSummary> {
  const params = month ? `?month=${month}` : "";
  const res = await apiFetch(`/attendance/summary${params}`);
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export async function getAttendanceRecords(month?: string): Promise<AttendanceRecord[]> {
  const params = month ? `?month=${month}` : "";
  const res = await apiFetch(`/attendance${params}`);
  if (!res.ok) throw new Error("Failed to fetch records");
  const data = await res.json();
  return data.records;
}

export async function createAttendanceRecord(data: {
  date: string;
  clockIn: string;
  clockOut?: string | null;
  breakMinutes?: number;
  note?: string | null;
}): Promise<AttendanceRecord> {
  const res = await apiFetch("/attendance", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create record");
  }
  return res.json();
}

export async function updateAttendanceRecord(
  id: string,
  data: {
    clockIn?: string;
    clockOut?: string | null;
    breakMinutes?: number;
    note?: string | null;
  }
): Promise<AttendanceRecord> {
  const res = await apiFetch(`/attendance/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update record");
  return res.json();
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const res = await apiFetch(`/attendance/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete record");
}

export async function getUserSettings(): Promise<UserSettings> {
  const res = await apiFetch("/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export async function updateUserSettings(data: {
  hourlyWage?: number;
  breakMinutes?: number;
  workplaceName?: string | null;
}): Promise<UserSettings> {
  const res = await apiFetch("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}
