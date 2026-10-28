import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Loader2, ShieldCheck, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { payments, PLATFORM_FEE_RATE } from "@/lib/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function usePayoutAccount() {
  const { hustlerProfile } = useAuth();
  return useQuery({
    queryKey: ["payout-account", hustlerProfile?.id],
    enabled: !!hustlerProfile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hustler_payout_accounts")
        .select("bank_name, account_name, account_last4, updated_at")
        .eq("hustler_id", hustlerProfile!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Where a hustler's 90% lands. Bank details go straight to Paystack; we only keep the last 4 digits. */
export default function PayoutSettings({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const { data: account, isLoading } = usePayoutAccount();
  const [editing, setEditing] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const showForm = editing || (!isLoading && !account);
  const { data: banks, isLoading: loadingBanks, error: banksError } = useQuery({
    queryKey: ["paystack-banks"],
    enabled: showForm,
    staleTime: 60 * 60_000,
    retry: false,
    queryFn: async () => (await payments.banks()).banks,
  });

  const save = async () => {
    setSaving(true);
    try {
      const bankName = banks?.find((b) => b.code === bankCode)?.name;
      await payments.savePayoutAccount(bankCode, accountNumber, bankName);
      toast.success("Payout account saved. Customers can now pay you on Hustle.");
      setEditing(false);
      setAccountNumber("");
      queryClient.invalidateQueries({ queryKey: ["payout-account"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="glass-card rounded-3xl h-24 animate-pulse" />;

  return (
    <div className="glass-card rounded-3xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Payout account</p>
          {account && !editing ? (
            <p className="text-sm text-muted-foreground truncate">
              {account.bank_name || "Bank"} ···· {account.account_last4}
              {account.account_name ? ` · ${account.account_name}` : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add your bank account so customers can pay you. You keep {100 - PLATFORM_FEE_RATE * 100}% of every job plus all tips.
            </p>
          )}
        </div>
        {account && !editing && (
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4 mr-1" /> Change
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 animate-fade-in">
          {banksError ? (
            <p className="text-sm p-3 rounded-2xl glass-inset">{(banksError as Error).message}</p>
          ) : (
            <>
              <Select value={bankCode} onValueChange={setBankCode} disabled={loadingBanks}>
                <SelectTrigger className="h-11 rounded-full glass-chip">
                  <SelectValue placeholder={loadingBanks ? "Loading banks…" : "Choose your bank"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {banks?.map((b) => (
                    <SelectItem key={b.code + b.name} value={b.code}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                inputMode="numeric"
                autoComplete="off"
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
                className="h-11 rounded-full glass-chip"
              />
              <div className="flex gap-2">
                {account && (
                  <Button variant="outline" className="flex-1 rounded-full" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                )}
                <Button className="flex-1 rounded-full" onClick={save} disabled={!bankCode || accountNumber.length < 6 || saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  Save payout account
                </Button>
              </div>
            </>
          )}
          {!compact && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Your details go directly to Paystack, our payment partner. Hustle only stores your bank name and the last 4 digits.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
