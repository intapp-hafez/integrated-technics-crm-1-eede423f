import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStoreState } from "@/lib/store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/manager/registered-accounts")({
  component: ManagerRegisteredAccountsPage,
});

function ManagerRegisteredAccountsPage() {
  const { registeredAccounts, registeredAccountsPublic } = useStoreState();

  return (
    <AppShell panel="manager" user={{ name: "", role: "manager", initials: "" }} pageTitle="Registered Accounts">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Registered Accounts</h2>
        <p className="text-sm text-muted-foreground">
          Directory of registered accounts and contacts.
        </p>
      </div>

      {!registeredAccountsPublic ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">This directory is currently private.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-muted/50 text-xs uppercase text-foreground">
              <tr>
                <th className="px-6 py-4 font-bold">Account Name</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {registeredAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium text-foreground">{acc.name}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {acc.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">{acc.owner || "—"}</td>
                </tr>
              ))}
              {registeredAccounts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center">
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
