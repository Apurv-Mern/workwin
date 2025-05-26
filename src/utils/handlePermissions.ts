// hooks/usePermissions.ts
import { useAppSelector } from "../hooks/reduxHooks";

export const usePermissions = () => {
  const {
    user: { permissions },
  } = useAppSelector((state: any) => state.auth);

  const hasPermission = (perm: string) => permissions?.includes(perm);

  return { hasPermission };
};
