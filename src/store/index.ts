import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import permissionReducer from "./slices/permissionSlice";
import userReducer from "./slices/userSlice";
import type { ThunkAction, Action } from "@reduxjs/toolkit";

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const store = configureStore({
  reducer: {
    auth: authReducer,
    permissions: permissionReducer,
    users: userReducer,
  },
  // Optional: enable this if you ever need to bypass non-serializable checks
  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware({
  //     serializableCheck: {
  //       ignoredActions: ["auth/login/fulfilled", "auth/login/rejected"],
  //     },
  //   }),
});

// Optional: for complex thunk logic
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
