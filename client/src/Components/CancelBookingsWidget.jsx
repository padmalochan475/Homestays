import React, { useState } from "react";
import axios from "axios";
import { differenceInCalendarDays, parse } from "date-fns";
import { toast } from "react-toastify";

const calculateNumberOfNights = (checkIn, checkOut) => {
  try {
    const date1 = parse(checkIn.toString(), "dd/MM/yyyy", new Date());
    const date2 = parse(checkOut.toString(), "dd/MM/yyyy", new Date());
    return differenceInCalendarDays(date2, date1) + 1;
  } catch (e) {
    return 1;
  }
};

const CancelBookingsWidget = ({ placeId, bookingDetails, setBookingDetails }) => {
  const { checkIn, checkOut, name, price, phone } = bookingDetails;
  const bookingId = bookingDetails._id;
  const nights = calculateNumberOfNights(checkIn, checkOut);
  const pricePerNight = Math.round(price / (nights || 1)).toLocaleString("en-IN");
  const [canceling, setCanceling] = useState(false);

  const cancelBooking = async () => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      setCanceling(true);
      await axios.delete(`/place/${placeId}`, { data: { checkIn, checkOut } });
      await axios.delete("/user/bookings", { data: { placeId, bookingId } });
      await axios.delete("/booking", { data: { bookingId } });
      toast.success("Booking cancelled successfully!");
      setBookingDetails(null);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to cancel booking. Please try again.");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="bg-white shadow p-6 rounded-2xl flex flex-col justify-center items-center gap-3 text-base max-w-[400px]">
      <h2 className="font-semibold pb-1 text-center text-gray-800 text-lg">
        You have an active reservation for this place:
      </h2>
      <div className="w-full bg-gray-50 p-3 rounded-xl flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium">Guest:</span>
          <span className="font-bold text-gray-800">{name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium">Duration:</span>
          <span className="font-bold text-pink">{nights} Night{nights > 1 ? "s" : ""}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium">Total Paid:</span>
          <span className="font-bold text-pink">₹{price?.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className="flex flex-col justify-center items-center gap-1 w-full my-1">
        <p className="font-medium text-xs text-gray-500">Reserved Dates</p>
        <div className="flex items-center justify-center gap-2">
          <span className="font-bold text-pink">{checkIn}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
            />
          </svg>
          <span className="font-bold text-pink">{checkOut}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={canceling}
        className="bg-red-500 hover:bg-red-600 text-white rounded-3xl my-2 px-6 py-2.5 font-semibold transition-all w-full disabled:opacity-50"
        onClick={cancelBooking}
      >
        {canceling ? "Cancelling..." : "Cancel Reservation"}
      </button>

      {phone && (
        <p className="text-xs text-gray-400 text-center">
          Booking notifications sent to <span className="text-gray-600 font-medium">{phone}</span>
        </p>
      )}
    </div>
  );
};

export default CancelBookingsWidget;
