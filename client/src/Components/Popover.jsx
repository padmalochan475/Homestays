import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-toastify";
import axios from "axios";

const Popover = ({ name, email, setUser, setRedirect }) => {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(name || "");
  const [newEmail, setNewEmail] = useState(email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (name) setNewName(name);
    if (email) setNewEmail(email);
  }, [name, email]);

  const saveChanges = async () => {
    const trimmedName = newName?.trim();
    const trimmedEmail = newEmail?.trim();

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return toast.error("Please enter a valid email address.");
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return toast.error("Password must be at least 6 characters long.");
      }
      if (newPassword !== confirmedPassword) {
        return toast.error("New Password and Confirm Password do not match.");
      }
    }

    const emailChanged = trimmedEmail && trimmedEmail.toLowerCase() !== (email || "").toLowerCase();
    const passwordChanged = Boolean(newPassword);

    try {
      setIsSubmitting(true);
      const payload = {
        newName: trimmedName,
        newEmail: trimmedEmail,
      };
      if (newPassword) {
        payload.newPassword = newPassword;
      }

      const res = await axios.put("/user", payload);

      if (emailChanged || passwordChanged) {
        toast.success("Profile credentials updated successfully!");
        try {
          await axios.post("/user/logout");
        } catch (e) {}

        localStorage.removeItem("token");
        if (setUser) setUser(null);
        setOpen(false);
        toast.info("Please log in again with your updated credentials.");
        setRedirect("/login");
      } else {
        toast.success("Profile name updated successfully!");
        if (setUser && res.data) {
          setUser((prev) => ({ ...prev, name: res.data.name }));
        }
        setOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Unable to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="bg-gray-400 font-medium text-[17px] rounded-3xl px-5 py-2 flex gap-2 items-center justify-center hover:scale-105 transition-all sm:px-6 text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
          Edit Profile
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-overlayShow fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Dialog.Content
          className="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-2xl focus:outline-none flex flex-col gap-4 z-50"
        >
          <div className="flex justify-between items-center border-b pb-3">
            <Dialog.Title className="text-xl font-bold text-gray-900">
              Edit Account Profile
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 rounded-full p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-3 my-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Full Name</label>
              <input
                className="w-full h-10 rounded-xl px-3 text-sm border border-gray-300 focus:outline-none focus:border-pink"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Your Name"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Email Address</label>
              <input
                type="email"
                className="w-full h-10 rounded-xl px-3 text-sm border border-gray-300 focus:outline-none focus:border-pink"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <p className="text-[11px] text-gray-400 mt-0.5">Changing admin or host email/password automatically synchronizes with .env.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">New Password (Optional)</label>
              <input
                type="password"
                className="w-full h-10 rounded-xl px-3 text-sm border border-gray-300 focus:outline-none focus:border-pink"
                placeholder="Leave blank to keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            {newPassword && (
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full h-10 rounded-xl px-3 text-sm border border-gray-300 focus:outline-none focus:border-pink"
                  placeholder="Repeat new password"
                  value={confirmedPassword}
                  onChange={(e) => setConfirmedPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t pt-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={isSubmitting}
              className="bg-pink text-white font-semibold px-5 py-2 rounded-xl text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
              onClick={saveChanges}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Popover;
