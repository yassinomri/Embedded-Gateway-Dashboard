import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const [changeData, setChangeData] = useState({
    username: "admin",
    newPassword: "",
    retypeNewPassword: "",
  });
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(false);

    if (changeData.newPassword !== changeData.retypeNewPassword) {
      setChangeError("New passwords do not match.");
      return;
    }

    // Show confirmation popup
    setShowConfirmPopup(true);
    setCurrentPassword("");
    setConfirmError(null);
  };

  const handleConfirmChange = async () => {
    setConfirmError(null);

    if (!currentPassword) {
      setConfirmError("Please enter your current password.");
      return;
    }

    try {
      // Call backend API to change credentials
      const response = await fetch('/cgi-bin/credentials.cgi?action=change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: changeData.username,
          currentPassword: currentPassword,
          newPassword: changeData.newPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update stored credentials with new password
        sessionStorage.setItem('currentCredentials', JSON.stringify({
          username: changeData.username,
          password: changeData.newPassword
        }));

        setChangeSuccess(true);
        setChangeData({ username: "admin", newPassword: "", retypeNewPassword: "" });
        setShowConfirmPopup(false);
        setCurrentPassword("");
      } else {
        setConfirmError(result.error || "Failed to update credentials.");
      }
    } catch (err) {
      setConfirmError("Network error. Please try again.");
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmPopup(false);
    setCurrentPassword("");
    setConfirmError(null);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Account Settings</h1>
        <h2 className="text-lg font-semibold mb-2">Change Credentials</h2>
        {changeSuccess ? (
          <p className="text-green-600">Credentials updated successfully!</p>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              required
              placeholder="Username"
              className="w-full border rounded px-2 py-1"
              value={changeData.username}
              onChange={e => setChangeData({ ...changeData, username: e.target.value })}
            />
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                placeholder="New Password"
                autoComplete="new-password"
                className="w-full border rounded px-2 py-1 pr-10"
                value={changeData.newPassword}
                onChange={e => setChangeData({ ...changeData, newPassword: e.target.value })}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowNewPassword(v => !v)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showRetypePassword ? "text" : "password"}
                required
                placeholder="Retype New Password"
                autoComplete="new-password"
                className="w-full border rounded px-2 py-1 pr-10"
                value={changeData.retypeNewPassword}
                onChange={e => setChangeData({ ...changeData, retypeNewPassword: e.target.value })}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowRetypePassword(v => !v)}
                aria-label={showRetypePassword ? "Hide password" : "Show password"}
              >
                {showRetypePassword ? "🙈" : "👁️"}
              </button>
            </div>
            {changeError && <div className="text-red-600 text-xs">{changeError}</div>}
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" onClick={handleChange}>Change</Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl relative">
            {/* Exit X button */}
            <button
              type="button"
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
              aria-label="Close"
              onClick={handleCancelConfirm}
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">Confirm Password Change</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please enter your current password to confirm the changes.
            </p>
            <div className="relative mb-4">
              <input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Current Password"
                className="w-full border rounded px-3 py-2 pr-10"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowCurrentPassword(v => !v)}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {confirmError && <div className="text-red-600 text-xs mb-3">{confirmError}</div>}
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleCancelConfirm}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                size="sm" 
                onClick={handleConfirmChange}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}