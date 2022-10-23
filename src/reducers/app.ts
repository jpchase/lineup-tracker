import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppState {
  page: string;
  offline: boolean;
  drawerOpened: boolean;
  snackbarOpened: boolean;
}

const INITIAL_STATE: AppState = {
  page: '',
  offline: false,
  drawerOpened: false,
  snackbarOpened: false,
};

const appSlice = createSlice({
  name: 'app',
  initialState: INITIAL_STATE,
  reducers: {
    updatePage: {
      reducer: (state, action: PayloadAction<{ page: string }>) => {
        state.page = action.payload.page;
      },
      prepare: (page: string) => {
        return { payload: { page } };
      }
    },
    updateOffline: {
      reducer: (state, action: PayloadAction<{ offline: boolean }>) => {
        state.offline = action.payload.offline;
      },
      prepare: (offline: boolean) => {
        return { payload: { offline } };
      }
    },
    updateDrawerState: {
      reducer: (state, action: PayloadAction<{ opened: boolean }>) => {
        state.drawerOpened = action.payload.opened;
      },
      prepare: (opened: boolean) => {
        return { payload: { opened } };
      }
    },
    openSnackBar: (state) => {
      state.snackbarOpened = true;
    },
    closeSnackBar: (state) => {
      state.snackbarOpened = false;
    },
  },
});

const { actions, reducer } = appSlice;

export const {
  openSnackBar, closeSnackBar,
  updateDrawerState, updateOffline, updatePage
} = actions;
export const app = reducer;
