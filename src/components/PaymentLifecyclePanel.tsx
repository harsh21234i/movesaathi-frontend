import type { BookingDetail, Payment, User } from "../types";

type PaymentLifecyclePanelProps = {
  booking: BookingDetail;
  payment: Payment | null;
  paymentError: string | null;
  user: User | null;
  isCreatingPayment: boolean;
  isConfirmingPayment: boolean;
  onCreatePayment: () => Promise<void>;
  onConfirmPayment: () => Promise<void>;
  onRefreshPayment: () => Promise<void>;
};

type StepState = "complete" | "current" | "upcoming" | "blocked";

const paymentStepRank = {
  pending: 0,
  authorized: 1,
  captured: 2,
  refunded: 2,
  failed: 2,
  cancelled: 2,
};

function formatMoney(payment: Payment | null, booking: BookingDetail) {
  if (payment) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: payment.currency,
      maximumFractionDigits: 0,
    }).format(payment.amount);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(booking.ride.price_per_seat);
}

function getPaymentTone(payment: Payment | null) {
  if (!payment) {
    return "neutral-dark";
  }

  if (["authorized", "captured"].includes(payment.status)) {
    return "success";
  }

  if (["failed", "cancelled"].includes(payment.status)) {
    return "warning";
  }

  return "neutral-dark";
}

function getStepState(payment: Payment | null, rank: number): StepState {
  if (!payment) {
    return rank === 0 ? "current" : "upcoming";
  }

  if (["failed", "cancelled"].includes(payment.status) && rank === 2) {
    return "blocked";
  }

  const currentRank = paymentStepRank[payment.status] ?? 0;
  if (rank < currentRank) {
    return "complete";
  }
  if (rank === currentRank) {
    return ["captured", "refunded"].includes(payment.status) ? "complete" : "current";
  }
  return "upcoming";
}

function getRoleCopy(booking: BookingDetail, payment: Payment | null, role?: string) {
  if (!payment) {
    if (booking.status === "rejected") {
      return "This booking was rejected, so no payment flow is available.";
    }
    return role === "driver"
      ? "No passenger payment is visible yet. Ask the passenger to create and authorize payment before you accept the booking."
      : "Secure your seat by creating a payment order. The amount is only captured after the driver accepts.";
  }

  if (payment.status === "pending") {
    return role === "driver"
      ? "Waiting for the passenger to authorize payment before you accept this booking."
      : "Payment order is ready. Complete checkout now so the driver can safely accept the request.";
  }

  if (payment.status === "authorized") {
    if (role === "driver") {
      return booking.status === "pending"
        ? "The passenger authorized payment. Accepting the booking will capture the amount."
        : "Payment is authorized and capture is being finalized by the backend.";
    }
    return booking.status === "pending"
      ? "Payment authorized. The amount will be captured when the driver accepts your booking."
      : "Payment authorized. Refresh status after driver acceptance; the backend will show captured once finalization completes.";
  }

  if (payment.status === "captured") {
    return role === "driver" ? "Passenger payment has been captured successfully." : "Your payment was completed successfully.";
  }

  if (payment.status === "refunded") {
    return role === "driver" ? "The passenger payment was refunded." : "Your payment was refunded.";
  }

  if (payment.status === "cancelled") {
    return "This payment was cancelled. Create a new booking if the trip still needs payment.";
  }

  return role === "driver" ? "Passenger payment failed." : "Your payment failed. Contact support before trying again.";
}

export function PaymentLifecyclePanel({
  booking,
  payment,
  paymentError,
  user,
  isCreatingPayment,
  isConfirmingPayment,
  onCreatePayment,
  onConfirmPayment,
  onRefreshPayment,
}: PaymentLifecyclePanelProps) {
  const role = user?.role;
  const canCreatePayment = !payment && booking.status !== "rejected" && role === "passenger";
  const canConfirmPayment = payment?.status === "pending" && role === "passenger";
  const showRefresh = Boolean(payment) || ["pending", "accepted"].includes(booking.status);
  const statusLabel = payment ? payment.status : booking.status === "rejected" ? "not available" : "not started";
  const lifecycleCopy = getRoleCopy(booking, payment, role);
  const isPositiveStatus = payment?.status === "authorized" || payment?.status === "captured";
  const isProblemStatus = payment?.status === "failed" || payment?.status === "cancelled";

  return (
    <div className="panel detail-info-card payment-lifecycle-card">
      <div className="payment-summary-strip">
        <div>
          <span className="eyebrow">Payment</span>
          <h3>{formatMoney(payment, booking)}</h3>
          <p>{lifecycleCopy}</p>
        </div>
        <span className={`status-pill ${getPaymentTone(payment)}`}>{statusLabel}</span>
      </div>

      {paymentError ? (
        <div className="form-alert error" role="alert">
          {paymentError}
        </div>
      ) : null}

      <div className="payment-steps" aria-label="Payment lifecycle">
        {[
          { label: "Order created", rank: 0, helper: "Passenger starts checkout" },
          { label: "Authorized", rank: 1, helper: "Amount reserved safely" },
          {
            label: payment?.status === "refunded" ? "Refunded" : payment?.status === "failed" || payment?.status === "cancelled" ? "Closed" : "Captured",
            rank: 2,
            helper: "Final backend state",
          },
        ].map((step) => {
          const state = getStepState(payment, step.rank);
          return (
            <div className={`payment-step ${state}`} key={step.label}>
              <span className="payment-step-marker" aria-hidden="true" />
              <div>
                <strong>{step.label}</strong>
                <small>{step.helper}</small>
              </div>
            </div>
          );
        })}
      </div>

      {payment ? (
        <div className="payment-reference-grid">
          <div>
            <small>Provider</small>
            <strong>{payment.provider}</strong>
          </div>
          <div>
            <small>Provider order</small>
            <strong>{payment.provider_order_id}</strong>
          </div>
          <div>
            <small>Provider payment</small>
            <strong>{payment.provider_payment_id ?? "Pending"}</strong>
          </div>
          <div>
            <small>Updated</small>
            <strong>{new Date(payment.updated_at).toLocaleString()}</strong>
          </div>
        </div>
      ) : null}

      {payment?.failure_reason ? <p className="payment-failure-note">Failure reason: {payment.failure_reason}</p> : null}

      <div className={`payment-action-panel ${isPositiveStatus ? "success" : ""} ${isProblemStatus ? "warning" : ""}`}>
        <div>
          <strong>{payment ? "Current payment state" : "Next payment step"}</strong>
          <p>
            {canConfirmPayment
              ? payment.provider === "razorpay"
                ? "Open Razorpay Checkout and return here after authorization."
                : "Confirm the mock payment to authorize this booking."
              : lifecycleCopy}
          </p>
        </div>
        <div className="payment-actions">
          {canCreatePayment ? (
            <button className="primary-button" type="button" disabled={isCreatingPayment} onClick={() => void onCreatePayment()}>
              {isCreatingPayment ? "Creating..." : "Create payment"}
            </button>
          ) : null}
          {canConfirmPayment ? (
            <button className="primary-button" type="button" disabled={isConfirmingPayment} onClick={() => void onConfirmPayment()}>
              {isConfirmingPayment ? "Opening secure checkout..." : payment.provider === "razorpay" ? "Pay securely" : "Confirm payment"}
            </button>
          ) : null}
          {showRefresh ? (
            <button className="ghost-button" type="button" onClick={() => void onRefreshPayment()}>
              Refresh payment status
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
