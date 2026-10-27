import React from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import "../utils/dayPicker.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

const { RangePicker } = DatePicker;

const footer = () => {
  return (
    <div className="text-gray-500 font-semibold py-1">
      <p className="md:inline leading-[3px] mt-2">
        <span className="text-pink">** </span>Dates which are disabled are in the past or already booked by others.
      </p>
    </div>
  );
};

const DatePickerRange = ({ setCheckIn, setCheckOut, disabledDates }) => {
  const safeDisabledDates = Array.isArray(disabledDates) ? disabledDates : [];

  const updateDates = (dates) => {
    // Handle clearing dates (when user clicks clear X button)
    if (!dates || !dates[0] || !dates[1]) {
      setCheckIn(null);
      setCheckOut(null);
      return;
    }

    try {
      const d1 = dayjs(dates[0]);
      const d2 = dayjs(dates[1]);
      const today = dayjs().startOf("day");

      // Strict client-side check: past dates cannot be selected
      if (d1.isBefore(today)) {
        toast.error("Check-in date cannot be in the past.");
        setCheckIn(null);
        setCheckOut(null);
        return;
      }

      if (d2.isBefore(d1)) {
        toast.error("Check-out date must be on or after check-in date.");
        setCheckIn(null);
        setCheckOut(null);
        return;
      }

      const checkin = d1.format("DD/MM/YYYY");
      const checkout = d2.format("DD/MM/YYYY");

      // Check conflict with already booked dates
      const hasConflict = safeDisabledDates.some((dateStr) => {
        const booked = dayjs(dateStr, "DD/MM/YYYY");
        return (
          booked.isSame(d1, "day") ||
          booked.isSame(d2, "day") ||
          (booked.isAfter(d1.startOf("day")) && booked.isBefore(d2.endOf("day")))
        );
      });

      if (hasConflict) {
        toast.error("Accommodation is already reserved for part of that selected period.");
        setCheckIn(null);
        setCheckOut(null);
      } else {
        setCheckIn(checkin);
        setCheckOut(checkout);
      }
    } catch (err) {
      console.error("Error setting dates:", err);
      setCheckIn(null);
      setCheckOut(null);
    }
  };

  const disabledDate = (current) => {
    if (!current) return false;
    // 1. Disable all dates before today (past dates are completely unclickable)
    if (current.isBefore(dayjs().startOf("day"))) {
      return true;
    }
    // 2. Disable dates that are already booked
    if (safeDisabledDates.length > 0) {
      const formatted = current.format("DD/MM/YYYY");
      return safeDisabledDates.includes(formatted);
    }
    return false;
  };

  return (
    <RangePicker
      placeholder={["Check-in", "Check-out"]}
      format="YYYY-MM-DD"
      onChange={(dates) => updateDates(dates)}
      className="border-none cursor-pointer bg-white text-black font-medium"
      disabledDate={disabledDate}
      renderExtraFooter={footer}
      inputReadOnly
    />
  );
};

export default DatePickerRange;
