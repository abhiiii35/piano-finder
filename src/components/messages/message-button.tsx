"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { getOrCreateThread } from "@/actions/messages";
import { toast } from "sonner";

type Props = {
  technicianId: string;
};

export function MessageButton({ technicianId }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!session) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    const result = await getOrCreateThread(technicianId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.threadId) {
      router.push(`/dashboard/messages/${encodeURIComponent(result.threadId)}`);
    }
  }

  return (
    <Button
      variant="outline"
      className="w-full"
      size="lg"
      onClick={handleClick}
      disabled={loading}
    >
      <MessageSquare className="mr-2 h-4 w-4" />
      {loading ? "Loading..." : "Send a Message"}
    </Button>
  );
}
