"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useConsoleData } from "@/components/console/console-data-provider";
import { useLocale } from "@/i18n/locale-provider";
import { toIntlTag } from "@/i18n/format";
import { bffPost } from "@/lib/bff-client";
import { RECHARGE_ORDER_STORAGE_KEY } from "@/lib/bundle-constants";
import { formatMycoolpayLabel } from "@/lib/wallet-labels";
import type { components as PaymentComponents } from "@/types/schemas-payment";
import { Loader2, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type WalletResponse = PaymentComponents["schemas"]["WalletResponse"];
type WalletRechargeResponse =
  PaymentComponents["schemas"]["WalletRechargeResponse"];

function createRechargeIdempotencyKey(walletId: string) {
  return `wallet-${walletId}-recharge-${crypto.randomUUID()}`;
}

export function WalletCard() {
  const { user, sessionContext, wallet, walletLoading, setWallet } =
    useConsoleData();
  const { t, locale } = useLocale();
  const loading = walletLoading;
  const [creating, setCreating] = useState(false);
  const [recharging, setRecharging] = useState(false);
  const [walletName, setWalletName] = useState("");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);

  async function handleCreateWallet() {
    const actorId = sessionContext?.actorId ?? user?.actorId;
    const trimmedName = walletName.trim();
    if (!actorId) return;
    if (!trimmedName) {
      toast.error(t.wallet.nameRequired);
      return;
    }

    setCreating(true);
    try {
      const created = await bffPost<WalletResponse>("/api/payments/wallets", {
        ownerId: actorId,
        ownerName: trimmedName,
      });
      setWallet(created);
      setCreateDialogOpen(false);
      setWalletName("");
      toast.success(t.wallet.created);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.wallet.createError);
    } finally {
      setCreating(false);
    }
  }

  async function handleRecharge() {
    if (!wallet?.id) return;
    const amount = Number(rechargeAmount);
    if (!amount || amount <= 0) {
      toast.error(t.wallet.invalidAmount);
      return;
    }
    setRecharging(true);
    try {
      const recharge = await bffPost<WalletRechargeResponse>(
        `/api/payments/wallets/${wallet.id}/recharge`,
        {
          amount,
          currency: "XAF",
          provider: "MYCOOLPAY",
          method: "MOBILE_MONEY",
          idempotencyKey: createRechargeIdempotencyKey(wallet.id),
        },
      );

      if (recharge.orderId) {
        sessionStorage.setItem(RECHARGE_ORDER_STORAGE_KEY, recharge.orderId);
      }

      if (recharge.redirectUrl) {
        setRechargeDialogOpen(false);
        setRechargeAmount("");
        globalThis.location.assign(recharge.redirectUrl);
        return;
      }

      toast.error(t.wallet.mycoolpayRedirectMissing);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.wallet.rechargeError);
    } finally {
      setRecharging(false);
    }
  }

  const walletLabel = wallet?.ownerName?.trim() || t.wallet.defaultName;
  const mycoolpayLabel = formatMycoolpayLabel(wallet?.ownerName);
  const intlTag = toIntlTag(locale);

  if (loading) {
    return <Skeleton className="yypay:h-40 yypay:w-full" />;
  }

  return (
    <Card>
      <CardHeader className="yypay:flex yypay:flex-row yypay:items-start yypay:justify-between yypay:space-y-0">
        <div>
          <CardTitle className="yypay:flex yypay:items-center yypay:gap-2">
            <Wallet className="yypay:h-5 yypay:w-5 yypay:text-primary" />
            {walletLabel}
          </CardTitle>
          <CardDescription>{t.wallet.balanceAndOperations}</CardDescription>
        </div>
        {wallet && (
          <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" aria-label={t.wallet.recharge}>
                <Plus className="yypay:h-4 yypay:w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.wallet.rechargeTitle(walletLabel)}</DialogTitle>
                <DialogDescription>
                  {t.wallet.rechargeDescription}
                </DialogDescription>
              </DialogHeader>
              <div className="yypay:space-y-3">
                <Label htmlFor="amount">{t.wallet.amountLabel}</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="10000"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleRecharge} disabled={recharging}>
                  {recharging && (
                    <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                  )}
                  {t.wallet.rechargeVia(mycoolpayLabel)}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {!wallet ? (
          <div className="yypay:space-y-6">
            <p className="yypay:text-sm yypay:text-secondary">
              {t.wallet.emptyState}
            </p>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>{t.wallet.createWallet}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.wallet.createTitle}</DialogTitle>
                  <DialogDescription>
                    {t.wallet.createDescription}
                  </DialogDescription>
                </DialogHeader>
                <div className="yypay:space-y-3">
                  <Label htmlFor="wallet-name">{t.wallet.nameLabel}</Label>
                  <Input
                    id="wallet-name"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    placeholder={t.wallet.namePlaceholder}
                    maxLength={80}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateWallet} disabled={creating}>
                    {creating && (
                      <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                    )}
                    {t.wallet.createWallet}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div>
            <p className="yypay:text-3xl yypay:font-bold yypay:text-foreground">
              {wallet.balance?.toLocaleString(intlTag) ?? 0}
            </p>
            <p className="yypay:mt-2 yypay:text-sm yypay:text-secondary">
              {t.wallet.lastUpdated}{" "}
              {wallet.updatedAt
                ? new Date(wallet.updatedAt).toLocaleString(intlTag)
                : "-"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
