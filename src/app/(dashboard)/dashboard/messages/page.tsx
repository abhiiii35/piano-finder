import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { getInboxThreads } from "@/actions/messages";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MessagesInboxPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const result = await getInboxThreads();
  if ("error" in result) redirect("/dashboard");

  const isTechnician = session.user.role === "TECHNICIAN";
  const bookingBase = isTechnician
    ? "/dashboard/technician/bookings"
    : "/dashboard/customer/bookings";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Messages</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Conversations with {isTechnician ? "your customers" : "technicians"}
      </p>

      {result.threads.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          No messages yet.
        </p>
      ) : (
        <div className="space-y-2">
          {result.threads.map((t) => (
            <Card key={t.threadId}>
              <CardContent className="p-4">
                <Link
                  href={`/dashboard/messages/${encodeURIComponent(t.threadId)}`}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{t.otherPartyName}</p>
                      {t.unreadCount > 0 && (
                        <Badge className="shrink-0">{t.unreadCount}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {t.lastMessage}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(new Date(t.lastMessageAt), "MMM d, h:mm a")}
                  </span>
                </Link>
                {t.bookingId && (
                  <Link
                    href={`${bookingBase}/${t.bookingId}`}
                    className="mt-2 inline-block text-xs text-primary hover:underline"
                  >
                    View booking →
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
