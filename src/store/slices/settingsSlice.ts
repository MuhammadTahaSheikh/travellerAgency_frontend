import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/lib/api';
import { setCurrencyConfig } from '@/lib/currency';
import { ApiResponse } from '@/types';

interface SettingsState {
  currency: string;
  locale: string;
  loaded: boolean;
  loading: boolean;
}

const initialState: SettingsState = {
  currency: 'PKR',
  locale: 'en-PK',
  loaded: false,
  loading: false,
};

export const fetchAppSettings = createAsyncThunk(
  'settings/fetchAppSettings',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get<ApiResponse<Record<string, Record<string, string>>>>('/settings');
      const financial = res.data?.financial || {};
      const currency = financial.currency || 'PKR';
      const locale = financial.currency_locale;
      setCurrencyConfig(currency, locale);
      return { currency, locale: locale || undefined };
    } catch (err) {
      setCurrencyConfig('PKR');
      return rejectWithValue((err as Error).message);
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    applyCurrency(state, action: { payload: { currency: string; locale?: string } }) {
      state.currency = action.payload.currency;
      if (action.payload.locale) state.locale = action.payload.locale;
      setCurrencyConfig(action.payload.currency, action.payload.locale);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAppSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.currency = action.payload.currency;
      })
      .addCase(fetchAppSettings.rejected, (state) => {
        state.loading = false;
        state.loaded = true;
        state.currency = 'PKR';
        setCurrencyConfig('PKR');
      });
  },
});

export const { applyCurrency } = settingsSlice.actions;
export default settingsSlice.reducer;
