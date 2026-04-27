import { useEffect, useState } from "react";
import { listenAuth, signOut as authSignOut, type User } from "@/data/authRepo";
import { ensureGroupDoc } from "@/data/groupRepo";
import { registerParent } from "@/data/parentsRepo";
import { findFamily } from "@/data/familiesBundle";

const GROUP_ID_KEY = "idrive-group-id";

export interface AuthState {
  isLoading: boolean;
  authUser: User | null;
  groupId: string | null;
  authError: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    isLoading: true, authUser: null, groupId: null, authError: null,
  });

  useEffect(() => {
    return listenAuth(async (user) => {
      if (!user) {
        setState({ isLoading: false, authUser: null, groupId: null, authError: null });
        return;
      }

      const family = user.email ? findFamily(user.email) : undefined;
      if (!family) {
        await authSignOut();
        setState({
          isLoading: false, authUser: null, groupId: null,
          authError: "Your account is not authorised. Contact your group admin.",
        });
        return;
      }

      try {
        const displayName = user.displayName?.trim() || user.email!.split("@")[0];
        // Always run on every sign-in (no cached fast-path) so the latest
        // families.yaml roster propagates after `./run.sh --firebase`.
        await ensureGroupDoc(family.groupId, family.name, family.members);
        await registerParent(family.groupId, user.uid, displayName, user.email ?? "");
        localStorage.setItem(`${GROUP_ID_KEY}-${user.uid}`, family.groupId);
        setState({ isLoading: false, authUser: user, groupId: family.groupId, authError: null });
      } catch {
        setState({
          isLoading: false, authUser: null, groupId: null,
          authError: "Sign-in failed. Try again.",
        });
      }
    });
  }, []);

  return state;
}

export async function clearGroupCache(uid: string): Promise<void> {
  localStorage.removeItem(`${GROUP_ID_KEY}-${uid}`);
}
