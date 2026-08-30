import axios from "axios";
import { useEffect, useState } from "react";

import { cleanupMyAuditLogs, fetchMyAuditLogs, fetchMyAuditSummary } from "../api/audit";
import { fetchDeploymentChecklist, fetchDeploymentPreflight, fetchDeploymentStatus } from "../api/deployment";
import { fetchJobsStatus } from "../api/jobs";
import { fetchMyPayments } from "../api/payments";
import {
  fetchPendingDriverVerifications,
  fetchSupportBookings,
  fetchSupportIncidents,
  fetchSupportPayments,
  fetchSupportUser,
  reconcileSupportPayment,
  reviewDriverVerification,
  searchSupportUsers,
  updateSupportIncident,
} from "../api/support";
import { EmptyState } from "../components/EmptyState";
import type {
  AuditLogSummary,
  DeploymentChecklist,
  DeploymentPreflight,
  DeploymentStatus,
  DriverBooking,
  Incident,
  JobsStatus,
  Payment,
  SupportUser,
} from "../types";

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? fallback);
  }
  return fallback;
}

export function OperationsPage() {
  const [deployment, setDeployment] = useState<DeploymentStatus | null>(null);
  const [preflight, setPreflight] = useState<DeploymentPreflight | null>(null);
  const [checklist, setChecklist] = useState<DeploymentChecklist | null>(null);
  const [jobs, setJobs] = useState<JobsStatus | null>(null);
  const [auditSummary, setAuditSummary] = useState<AuditLogSummary | null>(null);
  const [auditItems, setAuditItems] = useState<Awaited<ReturnType<typeof fetchMyAuditLogs>>["items"]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [driverVerifications, setDriverVerifications] = useState<SupportUser[]>([]);
  const [supportIncidents, setSupportIncidents] = useState<Incident[]>([]);
  const [supportPayments, setSupportPayments] = useState<Payment[]>([]);
  const [supportBookings, setSupportBookings] = useState<DriverBooking[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [lookupUser, setLookupUser] = useState<SupportUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportNotice, setSupportNotice] = useState<string | null>(null);
  const [busySupportAction, setBusySupportAction] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    setSupportNotice(null);
    try {
      const [status, nextPreflight, nextChecklist, nextJobs, summary, audit, paymentList] = await Promise.all([
        fetchDeploymentStatus(),
        fetchDeploymentPreflight(),
        fetchDeploymentChecklist(),
        fetchJobsStatus(),
        fetchMyAuditSummary(),
        fetchMyAuditLogs({ limit: 10 }),
        fetchMyPayments({ limit: 10 }),
      ]);
      setDeployment(status);
      setPreflight(nextPreflight);
      setChecklist(nextChecklist);
      setJobs(nextJobs);
      setAuditSummary(summary);
      setAuditItems(audit.items);
      setPayments(paymentList.items);

      const [users, verifications, incidents, adminPayments, adminBookings] = await Promise.allSettled([
        searchSupportUsers(),
        fetchPendingDriverVerifications({ limit: 5 }),
        fetchSupportIncidents({ limit: 5 }),
        fetchSupportPayments({ limit: 5 }),
        fetchSupportBookings({ limit: 5 }),
      ]);

      if (users.status === "fulfilled") {
        setSupportUsers(users.value.items);
      }
      if (verifications.status === "fulfilled") {
        setDriverVerifications(verifications.value.items);
      }
      if (incidents.status === "fulfilled") {
        setSupportIncidents(incidents.value.items);
      }
      if (adminPayments.status === "fulfilled") {
        setSupportPayments(adminPayments.value.items);
      }
      if (adminBookings.status === "fulfilled") {
        setSupportBookings(adminBookings.value.items);
      }
      if ([users, verifications, incidents, adminPayments, adminBookings].some((result) => result.status === "rejected")) {
        setSupportNotice("Some support-only data is hidden for this account. Use a support/admin token to operate those queues.");
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load operations data."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <section className="detail-stack">
      <div className="detail-hero panel">
        <div>
          <span className="eyebrow">System operations</span>
          <h2>Deployment, jobs, support, and audit visibility</h2>
          <p>This page mirrors the backend’s production surface so the frontend can inspect readiness, background work, and operational data.</p>
        </div>
      </div>

      {error ? (
        <div className="form-alert error" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading ? <div className="panel">Loading operational data...</div> : null}

      {supportNotice ? (
        <div className="form-alert success" role="status">
          {supportNotice}
        </div>
      ) : null}

      {!isLoading && deployment && preflight && checklist && jobs ? (
        <div className="detail-grid">
          <div className="detail-main-column">
            <div className="panel detail-info-card">
              <span className="eyebrow">Deployment status</span>
              <h3>{deployment.service}</h3>
              <div className="detail-metric-grid">
                <div><small>Environment</small><strong>{deployment.environment}</strong></div>
                <div><small>Release</small><strong>{deployment.release.version}</strong></div>
                <div><small>Build</small><strong>{deployment.release.build_sha}</strong></div>
                <div><small>Safe</small><strong>{deployment.production_safe ? "yes" : "no"}</strong></div>
              </div>
            </div>

            <div className="panel detail-info-card">
              <span className="eyebrow">Preflight</span>
              <div className="profile-tags">
                <span className={`status-pill ${preflight.ready_to_deploy ? "success" : "warning"}`}>
                  {preflight.ready_to_deploy ? "ready" : "blocked"}
                </span>
                <span className="status-pill neutral-dark">Heads: {preflight.migrations.head_count}</span>
              </div>
              {!!preflight.blocking_issues.length && (
                <ul>
                  {preflight.blocking_issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel detail-info-card">
              <span className="eyebrow">Checklist</span>
              <ul>
                {checklist.deploy_steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="panel detail-info-card">
              <span className="eyebrow">Jobs</span>
              <div className="detail-metric-grid">
                <div><small>Queued</small><strong>{jobs.queued_jobs}</strong></div>
                <div><small>Success</small><strong>{jobs.success_total}</strong></div>
                <div><small>Retry</small><strong>{jobs.retry_total}</strong></div>
                <div><small>Failed</small><strong>{jobs.failed_total}</strong></div>
              </div>
              <p>Maintenance jobs: session cleanup {jobs.maintenance_jobs.session_cleanup}, trip reminders {jobs.maintenance_jobs.trip_reminders}, audit retention {jobs.maintenance_jobs.audit_retention}.</p>
            </div>
          </div>

          <div className="detail-side-column">
            <div className="panel detail-info-card">
              <span className="eyebrow">Audit summary</span>
              <h3>{auditSummary?.total ?? 0} records</h3>
              <div className="profile-tags">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={async () => {
                    await cleanupMyAuditLogs();
                    await loadData();
                  }}
                >
                  Cleanup old logs
                </button>
              </div>
            </div>

            <div className="panel detail-info-card">
              <span className="eyebrow">Recent audit logs</span>
              {auditItems.length ? (
                <div className="booking-board">
                  {auditItems.map((item) => (
                    <article key={item.id} className="booking-card">
                      <div>
                        <strong>{item.action}</strong>
                        <p>{item.entity_type || "system"}</p>
                        <p>{formatDate(item.created_at)}</p>
                      </div>
                      <span className="status-pill neutral-dark">{item.severity}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No audit records" description="User actions will appear here once the account starts performing sensitive operations." />
              )}
            </div>

            <div className="panel detail-info-card">
              <span className="eyebrow">Payments</span>
              {payments.length ? (
                <div className="booking-board">
                  {payments.map((payment) => (
                    <article key={payment.id} className="booking-card">
                      <div>
                        <strong>Booking #{payment.booking_id}</strong>
                        <p>{payment.currency} {payment.amount.toFixed(0)}</p>
                        <p>{payment.provider_payment_id}</p>
                      </div>
                      <span className="status-pill neutral-dark">{payment.status}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No payments yet" description="Paid bookings will appear here once the payment workflow is used from the frontend." />
              )}
            </div>

            <div className="panel detail-info-card">
              <span className="eyebrow">Support lookup</span>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setSupportNotice(null);
                  try {
                    const lookup = await searchSupportUsers(searchEmail || undefined);
                    setSupportUsers(lookup.items);
                    if (lookupId.trim()) {
                      setLookupUser(await fetchSupportUser(Number(lookupId)));
                    }
                  } catch (lookupError) {
                    setSupportNotice(getErrorMessage(lookupError, "Support lookup is not available for this account."));
                  }
                }}
              >
                <div className="inline-grid two-column">
                  <div className="input-group">
                    <label htmlFor="support-email">Email search</label>
                    <input id="support-email" value={searchEmail} onChange={(event) => setSearchEmail(event.target.value)} placeholder="user@example.com" />
                  </div>
                  <div className="input-group">
                    <label htmlFor="support-id">User ID</label>
                    <input id="support-id" value={lookupId} onChange={(event) => setLookupId(event.target.value)} placeholder="42" />
                  </div>
                </div>
                <button className="ghost-button" type="submit">Search</button>
              </form>
              {lookupUser ? (
                <div className="profile-tags">
                  <span className="status-pill success">{lookupUser.full_name}</span>
                  <span className="status-pill neutral-dark">{lookupUser.role}</span>
                </div>
              ) : null}
              {supportUsers.length ? (
                <div className="booking-board">
                  {supportUsers.map((user) => (
                    <article key={user.id} className="booking-card">
                      <div>
                        <strong>{user.full_name}</strong>
                        <p>{user.email}</p>
                        <p>Rating {user.rating.toFixed(1)}</p>
                      </div>
                      <span className="status-pill neutral-dark">{user.role}</span>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="panel detail-info-card">
              <span className="eyebrow">Driver verification queue</span>
              {driverVerifications.length ? (
                <div className="booking-board">
                  {driverVerifications.map((driver) => (
                    <article key={driver.id} className="booking-card">
                      <div>
                        <strong>{driver.full_name}</strong>
                        <p>{driver.email}</p>
                        <p>{driver.vehicle_plate_number || "Plate pending"}</p>
                      </div>
                      <div className="booking-actions">
                        <span className="status-pill neutral-dark">{driver.driver_verification_status ?? "not_submitted"}</span>
                        <div className="action-row">
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={busySupportAction === `approve-${driver.id}`}
                            onClick={async () => {
                              setBusySupportAction(`approve-${driver.id}`);
                              setSupportNotice(null);
                              try {
                                await reviewDriverVerification(driver.id, { status: "approved" });
                                await loadData();
                              } catch (actionError) {
                                setSupportNotice(getErrorMessage(actionError, "Unable to approve driver verification."));
                              } finally {
                                setBusySupportAction(null);
                              }
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={busySupportAction === `reject-${driver.id}`}
                            onClick={async () => {
                              setBusySupportAction(`reject-${driver.id}`);
                              setSupportNotice(null);
                              try {
                                await reviewDriverVerification(driver.id, {
                                  status: "rejected",
                                  rejection_reason: "Documents need another review.",
                                });
                                await loadData();
                              } catch (actionError) {
                                setSupportNotice(getErrorMessage(actionError, "Unable to reject driver verification."));
                              } finally {
                                setBusySupportAction(null);
                              }
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No pending drivers" description="Driver verification requests appear here for support accounts." />
              )}
            </div>

            <div className="panel detail-info-card">
              <span className="eyebrow">Support incidents</span>
              {supportIncidents.length ? (
                <div className="booking-board">
                  {supportIncidents.map((incident) => (
                    <article key={incident.id} className="booking-card">
                      <div>
                        <strong>{incident.title}</strong>
                        <p>{incident.severity} severity</p>
                        <p>{formatDate(incident.created_at)}</p>
                      </div>
                      <div className="booking-actions">
                        <span className="status-pill neutral-dark">{incident.status}</span>
                        <div className="action-row">
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={busySupportAction === `incident-${incident.id}`}
                            onClick={async () => {
                              setBusySupportAction(`incident-${incident.id}`);
                              setSupportNotice(null);
                              try {
                                await updateSupportIncident(incident.id, {
                                  status: "investigating",
                                  support_notes: "Support team is reviewing this incident.",
                                });
                                await loadData();
                              } catch (actionError) {
                                setSupportNotice(getErrorMessage(actionError, "Unable to update incident."));
                              } finally {
                                setBusySupportAction(null);
                              }
                            }}
                          >
                            Investigate
                          </button>
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={busySupportAction === `resolve-${incident.id}`}
                            onClick={async () => {
                              setBusySupportAction(`resolve-${incident.id}`);
                              setSupportNotice(null);
                              try {
                                await updateSupportIncident(incident.id, {
                                  status: "resolved",
                                  support_notes: "Resolved from support operations screen.",
                                });
                                await loadData();
                              } catch (actionError) {
                                setSupportNotice(getErrorMessage(actionError, "Unable to resolve incident."));
                              } finally {
                                setBusySupportAction(null);
                              }
                            }}
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No incidents" description="Passenger and driver safety reports will appear here." />
              )}
            </div>

            <div className="panel detail-info-card">
              <span className="eyebrow">Support payments</span>
              {supportPayments.length ? (
                <div className="booking-board">
                  {supportPayments.map((payment) => (
                    <article key={payment.id} className="booking-card">
                      <div>
                        <strong>Payment #{payment.id}</strong>
                        <p>Booking #{payment.booking_id}</p>
                        <p>{payment.currency} {payment.amount.toFixed(0)}</p>
                      </div>
                      <div className="booking-actions">
                        <span className="status-pill neutral-dark">{payment.status}</span>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={busySupportAction === `payment-${payment.id}`}
                          onClick={async () => {
                            setBusySupportAction(`payment-${payment.id}`);
                            setSupportNotice(null);
                            try {
                              await reconcileSupportPayment(payment.id);
                              await loadData();
                            } catch (actionError) {
                              setSupportNotice(getErrorMessage(actionError, "Unable to reconcile payment."));
                            } finally {
                              setBusySupportAction(null);
                            }
                          }}
                        >
                          Reconcile
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No support payments" description="Admin payment records will appear here for authorized accounts." />
              )}
            </div>

            <div className="panel detail-info-card">
              <span className="eyebrow">Support bookings</span>
              {supportBookings.length ? (
                <div className="booking-board">
                  {supportBookings.map((booking) => (
                    <article key={booking.id} className="booking-card">
                      <div>
                        <strong>
                          {booking.ride.origin} to {booking.ride.destination}
                        </strong>
                        <p>Passenger {booking.passenger.full_name}</p>
                        <p>{formatDate(booking.created_at)}</p>
                      </div>
                      <span className="status-pill neutral-dark">{booking.status}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No support bookings" description="Admin booking records will appear here for support accounts." />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
