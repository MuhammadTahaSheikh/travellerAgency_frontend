import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/lib/api';
import { Notification, ApiResponse } from '@/types';

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
}

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  const response = await api.get<ApiResponse<Notification[]>>('/notifications?limit=20');
  return response.data || [];
});

export const fetchUnreadCount = createAsyncThunk('notifications/unreadCount', async () => {
  const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  return response.data?.count || 0;
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0, loading: false } as NotificationState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });
  },
});

export default notificationSlice.reducer;
