import { NextRequest, NextResponse } from "next/server";
import { sendAllDueReminders } from "@/actions/reminders";
import { secretsMatch } from "@/lib/cron-auth";

/**
 * Cron job to send tune reminder emails.
 * Called via external cron service (e.g., EasyCron, AWS EventBridge).
 * Secured with CRON_SECRET environment variable.
 */
export async function POST(request: NextRequest) {
  // Verify the cron secret for security
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[tune-reminders cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron secret not configured" },
      { status: 500 },
    );
  }

  if (!cronSecret || !secretsMatch(cronSecret, expectedSecret)) {
    console.error("[tune-reminders cron] Invalid cron secret");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const results = await sendAllDueReminders(100);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `[tune-reminders cron] Completed: ${successCount} sent, ${failureCount} failed`,
    );

    return NextResponse.json({
      success: true,
      processed: results.length,
      sent: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
    console.error("[tune-reminders cron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
