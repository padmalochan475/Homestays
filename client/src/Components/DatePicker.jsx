import React from "react";
import { DatePicker } from "antd";
import moment from "moment";
import { parse, format } from "date-fns";
import "../utils/dayPicker.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const { RangePicker } = DatePicker;

const footer = () => {
  return (
    <div className="text-gray-500 font-semibold py-1">
      <p className="md:inline leading-[3px] mt-2">
        <span className="text-pink">** </span>Dates which are disabled are already booked by{" "}
      </p>
      <p className="inline"> others for this place.</p>
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
      const d1 = dates[0].$d || dates[0].toDate ? (dates[0].toDate ? dates[0].toDate() : dates[0].$d) : new Date(dates[0]);
      const d2 = dates[1].$d || dates[1].toDate ? (dates[1].toDate ? dates[1].toDate() : dates[1].$d) : new Date(dates[1]);

      const checkin = format(d1, "dd/MM/yyyy");
      const checkout = format(d2, "dd/MM/yyyy");

      const hasConflict = safeDisabledDates.some((date) =>
        moment(date, "DD/MM/YYYY").isBetween(
          moment(checkin, "DD/MM/YYYY"),
          moment(checkout, "DD/MM/YYYY"),
          null,
          "[]"
        )
      );

      if (hasConflict) {
        toast.error("Place is already booked for part of that selected period");
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
    const today = moment().startOf("day");
    if (moment(current).isBefore(today, "day")) {
      return true;
    }
    if (safeDisabledDates.length > 0) {
      return safeDisabledDates.some((date) =>
        moment(current).isSame(moment(date, "DD/MM/YYYY"), "day")
      );
    }
    return false;
  };

  return (
    <>
      <RangePicker
        placeholder={["CheckIn", "CheckOut"]}
        onChange={(dates) => updateDates(dates)}
        className="border-none cursor-pointer bg-white text-black font-medium"
        disabledDate={disabledDate}
        renderExtraFooter={footer}
        inputReadOnly
      />
    </>
  );
};

export default DatePickerRange;
