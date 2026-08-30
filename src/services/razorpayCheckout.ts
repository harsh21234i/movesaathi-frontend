import type { Payment, User } from "../types";

type RazorpayResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

async function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay Checkout.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(payment: Payment, user: User) {
  if (!payment.checkout_key_id) {
    throw new Error("Razorpay checkout key is unavailable.");
  }
  await loadRazorpayCheckout();

  return new Promise<RazorpayResult>((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: payment.checkout_key_id,
      amount: payment.amount_minor,
      currency: payment.currency,
      order_id: payment.provider_order_id,
      name: "MooveSaathi",
      description: `Ride booking #${payment.booking_id}`,
      prefill: {
        name: user.full_name,
        email: user.email,
        contact: user.phone_number ?? undefined,
      },
      theme: { color: "#0b6b4f" },
      handler: (result: RazorpayResult) => resolve(result),
      modal: {
        ondismiss: () => reject(new Error("Payment checkout was closed.")),
      },
    });
    checkout.on("payment.failed", (response) => {
      reject(new Error(response.error?.description ?? "Payment failed."));
    });
    checkout.open();
  });
}
