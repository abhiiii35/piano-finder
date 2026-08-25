"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enableShareLink, revokeShareLink } from "@/actions/share";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Link2, Copy, XCircle } from "lucide-react";

export function ShareLinkCard({
  customerRecordId,
  shareToken: initialShareToken,
}: {
  customerRecordId: string;
  shareToken: string | null;
}) {
  const router = useRouter();
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [loading, setLoading] = useState(false);

  const link =
    shareToken && typeof window !== "undefined" ? `${window.location.origin}/p/${shareToken}` : "";

  async function handleEnable() {
    setLoading(true);
    const result = await enableShareLink(customerRecordId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setShareToken(result.shareToken ?? null);
    router.refresh();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  }

  async function handleRevoke() {
    if (!confirm("Revoke this client link? The current link will stop working.")) return;
    setLoading(true);
    const result = await revokeShareLink(customerRecordId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setShareToken(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Client page
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shareToken ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button type="button" variant="destructive" size="sm" disabled={loading} onClick={handleRevoke}>
              <XCircle className="mr-2 h-4 w-4" />
              Revoke link
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Give this customer a no-login page with their piano history and next-due estimate.
            </p>
            <Button type="button" size="sm" disabled={loading} onClick={handleEnable}>
              Create client link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
