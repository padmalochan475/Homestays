import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import AddressLink from "../Components/AddressLink";
import PlaceGallery from "../Components/PlaceGallery";
import PerksOffers from "../Components/PerksOffers";
import { UserContext } from "../Context/userContext";
import BookingWidget from "../Components/BookingWidget";
import Spinner from "../Components/Spinner";

const SinglePlacePage = () => {
  const [place, setPlace] = useState(null);
  const [alreadyBooked, setAlreadyBooked] = useState(false);
  const [showFullExtraInfo, setShowFullExtraInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const { user } = useContext(UserContext);

  useEffect(() => {
    const fetchPlaceDetails = async () => {
      try {
        const { data } = await axios.get(`/place/${id}`);
        setPlace(data);
      } catch (err) {
        console.error("Error fetching place:", err);
      } finally {
        setLoading(false);
      }
    };

    // function to check whether current place is already booked by user
    const fetchUserDetails = async () => {
      try {
        const { data } = await axios.get("/user");
        if (data?.bookedPlaces && Array.isArray(data.bookedPlaces) && data.bookedPlaces.includes(id)) {
          setAlreadyBooked(true);
        }
      } catch (err) {
        console.warn("Error checking booked places:", err);
      }
    };

    fetchPlaceDetails();
    if (user) fetchUserDetails();
  }, [id, user]);

  if (!loading && !place) {
    return <p className="mt-8 text-center text-gray-600">Place not found.</p>;
  }

  return (
    <>
      {loading ? (
        <Spinner height={200} width={200} />
      ) : (
        <div className="mt-4 bg-gray-200 px-4 pt-3 rounded-3xl xs:px-8 xs:pt-8">
          <h1 className="text-3xl font-bold">{place.title}</h1>
          <AddressLink address={place.address} />
          <PlaceGallery title={place.title} photos={place.photos || []} />
          <div className="mt-8 mb-8 grid gap-8 grid-cols-1 md:grid-cols-[2fr_1fr]">
            <div>
              <div>
                <h2 className="font-semibold text-2xl mb-1">Description</h2>
                <p className="whitespace-pre-line text-gray-700">{place.description}</p>
              </div>
              <h2 className="font-semibold text-[17px] mt-4">
                Maximum number of guests allowed: {place.maxGuests}
              </h2>
              <div className="mt-6">
                <h2 className="text-2xl font-semibold mb-2">What this place offers:</h2>
                <PerksOffers perks={place.perks || []} />
              </div>
            </div>
            <div className="mt-2 h-fit">
              {(() => {
                const currentUserId = String(user?.id || user?._id || "");
                const placeOwnerId = String(place?.owner?._id || place?.owner || "");
                const isOwner = Boolean(currentUserId && currentUserId === placeOwnerId);

                if (isOwner) {
                  return (
                    <div className="bg-white p-6 rounded-2xl border text-center shadow-md">
                      <div className="text-pink text-3xl mb-2">🏡</div>
                      <h3 className="text-lg font-bold text-gray-800">Your Property Listing</h3>
                      <p className="text-sm text-gray-500 mt-1 mb-4">You are the registered host of this homestay.</p>
                      <Link
                        to={`/account/places/${place._id}`}
                        className="inline-block bg-pink text-white font-semibold px-6 py-2 rounded-xl text-sm hover:scale-105 transition-all shadow-sm"
                      >
                        Edit Accommodation
                      </Link>
                    </div>
                  );
                }

                return <BookingWidget place={place} alreadyBooked={alreadyBooked} />;
              })()}
            </div>
          </div>
          {place.extraInfo && (
            <div className="bg-white -mx-8 px-8 py-8 border-t rounded-b-3xl">
              <div>
                <h2 className="font-semibold text-2xl">Extra info</h2>
              </div>
              <div className="mb-4 mt-2 text-[14px] text-gray-700 leading-5">
                {showFullExtraInfo ? (
                  <p>
                    {place.extraInfo}{" "}
                    <span
                      className="text-pink cursor-pointer font-semibold ml-1"
                      onClick={() => setShowFullExtraInfo(false)}
                    >
                      ...show less
                    </span>
                  </p>
                ) : (
                  <p>
                    {place.extraInfo.substring(0, 600)}
                    {place.extraInfo.length > 600 && (
                      <span
                        className="text-pink cursor-pointer font-semibold ml-1"
                        onClick={() => setShowFullExtraInfo(true)}
                      >
                        ..show more
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SinglePlacePage;
