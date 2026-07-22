import { callEdgeFunction } from "./edgeFunction";

// The backend branch owns the 'provision-paper-account' edge function (a
// separate branch — it does not exist in this worktree yet). This module
// only defines the client-side call shape it must satisfy: an authed POST
// with no body, idempotent (safe to call again if a row already exists).

export type ProvisionPaperAccountResult = {
  status?: string;
  [key: string]: unknown;
};

export function provisionPaperAccount(): Promise<ProvisionPaperAccountResult> {
  return callEdgeFunction("provision-paper-account", {});
}
