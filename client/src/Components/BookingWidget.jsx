import { useContext, useEffect, useState } from "react";
import { differenceInCalendarDays, parse, format } from "date-fns";
import axios from "axios";
import { useNavigate, Navigate } from "react-router-dom";
import { UserContext } from "../Context/userContext";
import DatePickerRange from "./DatePicker";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CancelBookingsWidget from "./CancelBookingsWidget";

export default function BookingWidget({ place }) {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [redirect, setRedirect] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
    const fetchBookingDetails = async () => {
      try {
        const { data } = await axios.get(`/booking/${place._id}`);
        setBookingDetails(data);
      } catch (err) {
        // No booking found or not logged in
      }
    };
    if (user && place?._id) {
      fetchBookingDetails();
    }
  }, [user, place?._id]);

  let numberOfNights = 0;
  if (checkIn && checkOut) {
    try {
      const date1 = parse(checkIn.toString(), "dd/MM/yyyy", new Date());
      const date2 = parse(checkOut.toString(), "dd/MM/yyyy", new Date());
      numberOfNights = differenceInCalendarDays(date2, date1) + 1;
    } catch (e) {
      numberOfNights = 0;
    }
  }

  const formattedDate = (date) => {
    return format(
      parse(date.toString(), "dd/MM/yyyy", new Date()),
      "dd/MM/yyyy"
    );
  };

  async function bookThisPlace() {
    if (!user) {
      toast.warning("Please log in to book this accommodation");
      return setRedirect("/login");
    }
    if (!checkIn || !checkOut) {
      return toast.warn("Please select check-in and check-out dates");
    }
    if (!name.trim()) {
      return toast.warn("Please enter your full name");
    }
    if (!phone.trim()) {
      return toast.warn("Please enter your contact phone number");
    }
    if (numberOfGuests > place.maxGuests) {
      return toast.warn(`Maximum guests allowed for this accommodation is ${place.maxGuests}`);
    }
    if (numberOfGuests < 1) {
      return toast.warn("Please select at least 1 guest");
    }

    try {
      setIsSubmitting(true);
      const { data } = await axios.post("/booking", {
        checkIn: formattedDate(checkIn),
        checkOut: formattedDate(checkOut),
        numberOfGuests: Number(numberOfGuests),
        name: name.trim(),
        phone: phone.trim(),
        place: place._id,
        price: numberOfNights * place.price,
      });

      await axios.put("/user/bookings", {
        bookingId: data._id,
        bookedPlace: place._id,
      });

      await axios.put(`/place/${place._id}`, {
        checkIn: formattedDate(checkIn),
        checkOut: formattedDate(checkOut),
      });

      toast.success("Place Booked Successfully!");
      navigate("/account/bookings");
    } catch (err) {
      toast.error(err.response?.data?.error || "Booking failed. Please check the dates and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (redirect) {
    return <Navigate to={redirect} state={{ prevPath: `/place/${place._id}` }} />;
  }

  return (
    <>
      {bookingDetails ? (
        <CancelBookingsWidget
          placeId={place._id}
          bookingDetails={bookingDetails}
          setBookingDetails={setBookingDetails}
        />
      ) : (
        <div className="bg-white shadow py-4 rounded-2xl flex flex-col justify-center items-center min-w-[280px]">
          <div className="text-2xl text-center font-bold text-gray-800">
            Price: {`₹${place.price?.toLocaleString("en-IN")}`} <span className="text-sm font-normal text-gray-500">per night</span>
          </div>
          <div className="border rounded-md mt-4 w-[90%] max-w-[320px]">
            <div className="flex justify-center py-1">
              <DatePickerRange
                setCheckIn={setCheckIn}
                setCheckOut={setCheckOut}
                disabledDates={place.bookedDates || []}
              />
            </div>
            <div className="p-3 border-t flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">Number of guests:</label>
              <input
                type="number"
                min="1"
                max={place.maxGuests || 10}
                value={numberOfGuests}
                className="py-1 px-2 outline-none border rounded-md border-gray-300"
                onChange={(ev) => setNumberOfGuests(ev.target.value)}
              />
            </div>
            {numberOfNights > 0 && (
              <div className="p-3 border-t flex flex-col gap-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Your full name:</label>
                  <input
                    type="text"
                    value={name}
                    placeholder="John Doe"
                    className="w-full py-1 px-2 outline-none border rounded-md border-gray-300"
                    onChange={(ev) => setName(ev.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Phone number:</label>
                  <input
                    type="tel"
                    value={phone}
                    placeholder="+91 9876543210"
                    className="w-full px-2 py-1 outline-none border rounded-md border-gray-300"
                    onChange={(ev) => setPhone(ev.target.value)}
                    required
                  />
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={bookThisPlace}
            className="px-6 py-2.5 bg-pink text-white font-semibold rounded-3xl hover:scale-105 transition-all my-5 disabled:opacity-50"
          >
            {isSubmitting ? "Processing..." : "Book this place"}
            {numberOfNights > 0 && (
              <span>
                {" "}
                {`for ₹${(numberOfNights * place.price).toLocaleString("en-IN")}`}
              </span>
            )}
          </button>
        </div>
      )}
    </>
  );
}
