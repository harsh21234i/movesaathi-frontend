import axios from "axios";
import { useEffect, useState } from "react";

import { changePassword, fetchAccountSecurity } from "../api/auth";
import { fetchDriverProfile, updateDriverProfile, updateMe } from "../api/users";
import { useAuth } from "../context/AuthContext";
import type { AccountSecurity, DriverVerification } from "../types";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? fallback);
  }
  return error instanceof Error ? error.message : fallback;
}

export function AccountPage() {
  const { user, refreshUser } = useAuth();
  const [security, setSecurity] = useState<AccountSecurity | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverVerification | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [driverError, setDriverError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingDriver, setIsSavingDriver] = useState(false);

  useEffect(() => {
    void fetchAccountSecurity()
      .then(setSecurity)
      .catch((error) => setSecurityError(getErrorMessage(error, "Unable to load account security.")));
  }, []);

  useEffect(() => {
    if (user?.role !== "driver") {
      return;
    }

    void fetchDriverProfile()
      .then(setDriverProfile)
      .catch((error) => setDriverError(getErrorMessage(error, "Unable to load driver verification profile.")));
  }, [user?.role]);

  return (
    <section className="detail-stack" aria-label="Account settings">
      <div className="detail-hero panel">
        <div>
          <span className="eyebrow">Account</span>
          <h2>Profile, security, and driver verification</h2>
          <p>These controls are wired to the backend account APIs, so your dashboard profile and driver eligibility stay current.</p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main-column">
          <form
            className="panel detail-info-card"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              setIsSavingProfile(true);
              setProfileError(null);
              try {
                await updateMe({
                  full_name: String(formData.get("full_name") || "").trim(),
                  phone_number: String(formData.get("phone_number") || "").trim() || null,
                  bio: String(formData.get("bio") || "").trim() || null,
                });
                await refreshUser();
              } catch (error) {
                setProfileError(getErrorMessage(error, "Unable to update profile."));
              } finally {
                setIsSavingProfile(false);
              }
            }}
          >
            <div className="panel-header">
              <div>
                <span className="eyebrow">Profile</span>
                <h3>Public account details</h3>
              </div>
            </div>
            <div className="inline-grid two-column">
              <div className="input-group">
                <label htmlFor="full_name">Full name</label>
                <input id="full_name" name="full_name" defaultValue={user?.full_name ?? ""} required />
              </div>
              <div className="input-group">
                <label htmlFor="phone_number">Phone number</label>
                <input id="phone_number" name="phone_number" defaultValue={user?.phone_number ?? ""} />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" name="bio" defaultValue={user?.bio ?? ""} rows={4} placeholder="Short note about your travel preferences." />
            </div>
            {profileError ? <div className="form-alert error" role="alert">{profileError}</div> : null}
            <button className="primary-button" type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>

          <form
            className="panel detail-info-card"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              setIsSavingPassword(true);
              setPasswordMessage(null);
              setSecurityError(null);
              try {
                await changePassword(
                  String(formData.get("current_password")),
                  String(formData.get("new_password")),
                );
                form.reset();
                setPasswordMessage("Password changed. Use the new password on your next login.");
              } catch (error) {
                setSecurityError(getErrorMessage(error, "Unable to change password."));
              } finally {
                setIsSavingPassword(false);
              }
            }}
          >
            <div className="panel-header">
              <div>
                <span className="eyebrow">Security</span>
                <h3>Password and lockout state</h3>
              </div>
            </div>
            {security ? (
              <div className="detail-metric-grid">
                <div><small>Failed attempts</small><strong>{security.failed_login_attempts}</strong></div>
                <div><small>Locked</small><strong>{security.is_locked ? "yes" : "no"}</strong></div>
                <div><small>Locked until</small><strong>{security.locked_until ? new Date(security.locked_until).toLocaleString() : "Not locked"}</strong></div>
              </div>
            ) : null}
            <div className="inline-grid two-column">
              <div className="input-group">
                <label htmlFor="current_password">Current password</label>
                <input id="current_password" name="current_password" type="password" autoComplete="current-password" required />
              </div>
              <div className="input-group">
                <label htmlFor="new_password">New password</label>
                <input id="new_password" name="new_password" type="password" autoComplete="new-password" minLength={8} required />
              </div>
            </div>
            {securityError ? <div className="form-alert error" role="alert">{securityError}</div> : null}
            {passwordMessage ? <div className="form-alert success" aria-live="polite">{passwordMessage}</div> : null}
            <button className="primary-button" type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? "Updating..." : "Change password"}
            </button>
          </form>
        </div>

        <div className="detail-side-column">
          {user?.role === "driver" ? (
            <form
              className="panel detail-info-card"
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                setIsSavingDriver(true);
                setDriverError(null);
                try {
                  const updated = await updateDriverProfile({
                    vehicle_make: String(formData.get("vehicle_make") || "").trim() || null,
                    vehicle_model: String(formData.get("vehicle_model") || "").trim() || null,
                    vehicle_color: String(formData.get("vehicle_color") || "").trim() || null,
                    vehicle_plate_number: String(formData.get("vehicle_plate_number") || "").trim() || null,
                    driver_license_number: String(formData.get("driver_license_number") || "").trim() || null,
                  });
                  setDriverProfile(updated);
                  await refreshUser();
                } catch (error) {
                  setDriverError(getErrorMessage(error, "Unable to submit driver verification."));
                } finally {
                  setIsSavingDriver(false);
                }
              }}
            >
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Driver verification</span>
                  <h3>Vehicle and license profile</h3>
                </div>
              </div>
              <span className={`status-pill ${driverProfile?.driver_verification_status === "approved" ? "success" : "warning"}`}>
                {driverProfile?.driver_verification_status ?? "not_submitted"}
              </span>
              <div className="input-group">
                <label htmlFor="vehicle_make">Vehicle make</label>
                <input id="vehicle_make" name="vehicle_make" defaultValue={driverProfile?.vehicle_make ?? ""} placeholder="Maruti Suzuki" />
              </div>
              <div className="input-group">
                <label htmlFor="vehicle_model">Vehicle model</label>
                <input id="vehicle_model" name="vehicle_model" defaultValue={driverProfile?.vehicle_model ?? ""} placeholder="Swift Dzire" />
              </div>
              <div className="input-group">
                <label htmlFor="vehicle_color">Vehicle color</label>
                <input id="vehicle_color" name="vehicle_color" defaultValue={driverProfile?.vehicle_color ?? ""} placeholder="White" />
              </div>
              <div className="input-group">
                <label htmlFor="vehicle_plate_number">Plate number</label>
                <input id="vehicle_plate_number" name="vehicle_plate_number" defaultValue={driverProfile?.vehicle_plate_number ?? ""} placeholder="MH31AB1234" />
              </div>
              <div className="input-group">
                <label htmlFor="driver_license_number">License number</label>
                <input id="driver_license_number" name="driver_license_number" defaultValue={driverProfile?.driver_license_number ?? ""} />
              </div>
              {driverProfile?.driver_verification_rejection_reason ? (
                <div className="form-alert error" role="alert">{driverProfile.driver_verification_rejection_reason}</div>
              ) : null}
              {driverError ? <div className="form-alert error" role="alert">{driverError}</div> : null}
              <button className="primary-button" type="submit" disabled={isSavingDriver}>
                {isSavingDriver ? "Submitting..." : "Submit verification"}
              </button>
            </form>
          ) : (
            <div className="panel detail-info-card">
              <span className="eyebrow">Passenger account</span>
              <h3>No driver verification needed</h3>
              <p>Passenger accounts can book rides, request nearby drivers, pay, chat, and report incidents without vehicle verification.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
