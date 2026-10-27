import OtpInput from "react-otp-input";
import { toast } from "react-toastify";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Modal = ({ setPopup }) => {
  const navigate = useNavigate();
  const rawUserData = localStorage.getItem("user");
  const storedUser = rawUserData ? JSON.parse(rawUserData) : {};
  const [otp, setOtp] = useState(storedUser.demoOtp ? String(storedUser.demoOtp) : "");

  const handleOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!otp) {
      return toast.warn("Please enter the OTP");
    }

    const { email, name, password } = storedUser;
    try {
      const response = await axios.post("/otp/verifyOtp", { email, otp: Number(otp) });
      toast.success(response.data.message || "OTP verified successfully!");

      const regResponse = await axios.post("/user/register", { email, name, password });
      toast.success(`${name} Registered Successfully!`);

      if (regResponse.data?.token) {
        localStorage.setItem("token", regResponse.data.token);
      }

      setPopup(false);
      localStorage.removeItem("user");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.error || "OTP verification failed. Please try again.");
    }
  };

  return (
    <div className="w-screen h-screen bg-black bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-[90%] max-w-[420px] flex flex-col items-center">
        <h1 className="font-bold text-center text-2xl mb-2 text-gray-800">Verify OTP</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Enter the 4-digit verification code sent to <br />
          <span className="font-semibold text-gray-700">{storedUser.email}</span>
        </p>

        <div className="flex justify-center items-center my-3">
          <OtpInput
            inputType="number"
            inputStyle={{
              height: "3.2rem",
              width: "3.2rem",
              margin: "0 0.3rem",
              fontSize: "1.5rem",
              borderRadius: "0.75rem",
              border: "1.5px solid #d1d5db",
              textAlign: "center",
            }}
            value={otp}
            onChange={setOtp}
            numInputs={4}
            renderSeparator={<span className="text-gray-400 font-bold">-</span>}
            renderInput={(props) => <input {...props} />}
          />
        </div>

        <div className="flex justify-between gap-4 w-full mt-6">
          <button
            type="button"
            className="flex-1 border border-gray-400 text-gray-700 py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-all font-semibold"
            onClick={() => setPopup(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 bg-pink text-white py-2.5 px-4 rounded-xl hover:opacity-90 transition-all font-semibold"
            onClick={handleOtp}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
