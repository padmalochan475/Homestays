import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { toast } from "react-toastify";
import axios from "axios";

const Popover = ({ name, setRedirect }) => {
  const [newName, setNewName] = useState(name);
  const [newPassword, setNewPassword] = useState(null);
  const [confirmedPassword, setConfirmedPassword] = useState(null);

  const saveChanges = async () => {
    if (newPassword !== confirmedPassword) {
      toast.error("New Password and Confirm Password didn't match");
    } else {
      try {
        await axios.put("/user", { newName, newPassword });
        toast.success("Profile Updated Successfully!");
        try {
          await axios.post("/user/logout");
        } catch (e) {}
        localStorage.removeItem("token");
        setRedirect("/login");
      } catch (err) {
        toast.error("Unable to update profile. Please try again.");
      }
    }
  };
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="bg-gray-400 font-medium text-[17px] rounded-3xl px-5 py-2 flex gap-2 items-center justify-center hover:scale-105 transition-all sm:px-6">
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
          Edit profile
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-overlayShow fixed inset-0" />
        <Dialog.Content
          className="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white py-[25px] px-[15px]
      shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none flex flex-col items-center gap-2"
        >
          <Dialog.Title className="text-center text-[21px] font-bold text-pink mb-12 mt-4">
            Edit profile
          </Dialog.Title>
          <fieldset className="flex justify-between items-center w-full gap-5">
            <label className="text-[17px] font-semibold text-center" htmlFor="name">
              Name:
            </label>
            <input
              className="inline-flex h-[35px] w-[70%] items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] focus:shadow-[0_0_0_2px] focus:outline-none border-solid border-2 border-gray-500"
              id="name"
              defaultValue={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </fieldset>
          <fieldset className="flex justify-between items-center w-full gap-5">
            <label className="text-[17px] font-semibold text-center" htmlFor="username">
              Password:
            </label>
            <input
              className="inline-flex h-[35px] w-[70%] items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] focus:shadow-[0_0_0_2px] focus:outline-none border-solid border-2 border-gray-500"
              id="username"
              type="password"
              placeholder="new password"
              defaultValue={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </fieldset>
          <fieldset className="flex justify-between items-center w-full gap-5">
            <label className="text-[17px] font-semibold text-center" htmlFor="username">
              Confirm Password:
            </label>
            <input
              className="inline-flex h-[35px] w-[70%] items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] focus:shadow-[0_0_0_2px] focus:outline-none border-solid border-2 border-gray-500"
              id="username"
              type="password"
              placeholder="confirm password"
              defaultValue={confirmedPassword}
              onChange={(e) => setConfirmedPassword(e.target.value)}
            />
          </fieldset>
          <div className="mt-[25px] flex justify-end">
            <Dialog.Close asChild>
              <button
                className="bg-pink text-white font-semibold hover:scale-105 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] leading-none transition-all"
                onClick={saveChanges}
              >
                Save changes
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Close asChild>
            <button
              className="text-violet11 hover:bg-violet4 focus:shadow-violet7 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
              aria-label="Close"
            >
              <Cross2Icon />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Popover;
