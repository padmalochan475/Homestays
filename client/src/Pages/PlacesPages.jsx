import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import AddPlacePage from "./AddPlacePage";
import axios from "axios";
import Spinner from "../Components/Spinner";
import Image from "../Components/Image";
import { toast } from "react-toastify";

const PlacesPages = () => {
  const { action } = useParams();
  const [redirect, setRedirect] = useState("");
  const [places, setPlaces] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/place/account")
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setPlaces(data);
        } else {
          setPlaces([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching places:", err);
        setPlaces([]);
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const removePlace = async (placeId) => {
    try {
      await axios.delete("/place", { data: { placeId } });
      toast.success("Place deleted successfully");
      setRefresh(!refresh);
    } catch (err) {
      toast.error("Failed to delete place");
      console.error(err.message);
    }
  };

  if (redirect) return <Navigate to={redirect} />;

  return (
    <div>
      {action !== "new" && (
        <div className="text-center">
          <Link
            className="bg-pink text-white rounded-full inline-flex py-2 px-6 mb-4 border-gray-100 
            font-semibold text-xl items-center hover:scale-105 transition-all"
            to={"/account/places/new"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Add new place
          </Link>
        </div>
      )}
      {action === "new" && <AddPlacePage />}
      {loading && <Spinner width={150} height={150} />}
      {!loading &&
        places.length > 0 &&
        places.map((place) => {
          const mainPhoto = place.photos && place.photos.length > 0 ? place.photos[0] : "";
          return (
            <div
              className="w-full bg-gray-100 rounded-xl p-4 mt-5 flex-col max-w-[750px] mx-auto shadow-sm"
              key={place._id}
            >
              <div className="flex flex-col gap-2 cursor-pointer sm:flex-row sm:gap-5 items-center">
                <div className="h-36 w-[270px] bg-gray-200 rounded-xl mx-auto grow shrink-0 sm:w-[200px] md:h-32 overflow-hidden">
                  <Image
                    src={mainPhoto}
                    alt={place.title || "preview-photo"}
                    className="w-full rounded-xl h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-[18px] text-center sm:text-left mb-2">
                    {place.title}
                  </h2>
                  <p className="text-sm text-gray-600 hidden sm:inline-block">
                    {place.description ? place.description.substring(0, 300) : ""}
                    {place.description && place.description.length > 300 ? "......" : ""}
                  </p>
                </div>
              </div>
              <div className="flex justify-center gap-x-8 gap-y-2 mt-2 sm:gap-12 flex-wrap sm:mt-4">
                <Link
                  to={`/place/${place._id}`}
                  className="px-4 py-2 bg-pink text-white font-semibold rounded-3xl hover:scale-105 transition-all text-sm"
                >
                  Preview Place
                </Link>
                <Link
                  to={`/account/places/${place._id}`}
                  className="px-4 py-2 bg-pink text-white font-semibold rounded-3xl hover:scale-105 transition-all text-sm"
                >
                  Edit Place
                </Link>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 text-white font-semibold rounded-3xl hover:scale-105 transition-all text-sm"
                  onClick={() => removePlace(place._id)}
                >
                  Delete Place
                </button>
              </div>
            </div>
          );
        })}
      {!loading && places.length === 0 && action !== "new" && (
        <p className="text-center text-gray-500 mt-8">No accommodations listed yet. Click "Add new place" to create one!</p>
      )}
    </div>
  );
};

export default PlacesPages;
