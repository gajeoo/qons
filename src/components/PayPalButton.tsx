import {
  PayPalScriptProvider,
  PayPalButtons,
} from "@paypal/react-paypal-js";
import { useAction } from "convex/react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

interface PayPalButtonProps {
  billingCycle: "monthly" | "annual";
  clientId: string;
  onSuccess: () => void;
}

export function PayPalCheckoutButton({
  billingCycle,
  clientId,
  onSuccess,
}: PayPalButtonProps) {
  const createSubscription = useAction(api.paypal.createSubscription);
  const confirmSubscription = useAction(api.paypal.confirmSubscription);
  const [processing, setProcessing] = useState(false);

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "USD",
        intent: "subscription",
        vault: true,
        components: "buttons",
      }}
    >
      <div className="space-y-4">
        {processing ? (
          <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" />
            Processing subscription...
          </div>
        ) : (
          <PayPalButtons
            style={{
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "subscribe",
              height: 48,
              tagline: false,
            }}
            createSubscription={async () => {
              const result = await createSubscription({ billingCycle });
              if (!result.subscriptionId) {
                const errorMsg = result.error || "Failed to create subscription";
                toast.error(errorMsg);
                throw new Error(errorMsg);
              }
              return result.subscriptionId;
            }}
            onApprove={async (data) => {
              setProcessing(true);
              try {
                if (!data.subscriptionID) {
                  toast.error("Subscription ID missing from PayPal approval");
                  return;
                }
                const result = await confirmSubscription({
                  subscriptionId: data.subscriptionID,
                  billingCycle,
                });
                if (result.success) {
                  toast.success("Subscription activated successfully.");
                  onSuccess();
                } else {
                  toast.error(result.error || "Subscription confirmation failed");
                }
              } catch (err: any) {
                console.error("[PayPal] confirm subscription error:", err);
                toast.error("Failed to activate subscription");
              } finally {
                setProcessing(false);
              }
            }}
            onError={(err) => {
              console.error("[PayPal] onError:", err);
              toast.error("PayPal error. Please try again.");
            }}
            onCancel={() => {
              toast.info("Subscription checkout cancelled");
            }}
          />
        )}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-green-500" />
          <span>
            Auto-renews {billingCycle === "annual" ? "yearly" : "monthly"} until
            cancellation.
          </span>
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
