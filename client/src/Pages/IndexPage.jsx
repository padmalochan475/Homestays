import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Spinner from "../Components/Spinner";
import Image from "../Components/Image";

const IndexPage = () => {
  const [allPlaces, setAllPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchPlace, setSearchPlace] = useState("");

  const fetchPlaces = (retryCount = 0) => {
    // If request takes longer than 2.5s, signal that server might be cold-starting
    const wakeTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 2500);

    axios
      .get("/places")
      .then(({ data }) => {
        clearTimeout(wakeTimer);
        setIsWakingUp(false);
        if (Array.isArray(data)) {
          setAllPlaces(data);
        } else {
          setAllPlaces([]);
        }
        setLoadError("");
        setLoading(false);
      })
      .catch((error) => {
        clearTimeout(wakeTimer);
        console.warn(`Attempt ${retryCount + 1} to load listings:`, error.message);

        // Auto-retry up to 4 times (Render cold starts typically respond on retry 2 or 3)
        if (retryCount < 4) {
          setIsWakingUp(true);
          setTimeout(() => {
            fetchPlaces(retryCount + 1);
          }, 3000);
        } else {
          setIsWakingUp(false);
          setLoading(false);
          setLoadError("Unable to connect to the backend. Please check that your server and MongoDB are online.");
        }
      });
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const placesList = Array.isArray(allPlaces) ? allPlaces : [];
  const filteredPlaces = placesList.filter((place) =>
    place?.title?.toLowerCase().includes(searchPlace) ||
    place?.address?.toLowerCase().includes(searchPlace)
  );

  return (
    <div>
      {/* Automatic Server Cold-Start Banner */}
      {isWakingUp && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-2xl mx-6 mb-4 flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <p className="font-semibold text-sm">Waking up live cloud backend...</p>
              <p className="text-xs text-amber-700">Free Tier instances spin down after inactivity. Priming database cache now.</p>
            </div>
          </div>
          <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="flex border rounded-full w-56 ml-10 shadow-md shadow-gray-300 p-2">
        <input
          className="focus:outline-none w-full"
          placeholder="Search places..."
          value={searchPlace}
          onChange={(e) => setSearchPlace(e.target.value.toLowerCase())}
        />
        <div className="bg-pink border rounded-full p-1 hidden sm:inline-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-4 h-4 text-white font-bold"
          >
            <circle r="5" transform="translate(26,21)" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
      </div>

      {loading && !allPlaces.length && (
        <div className="flex flex-col items-center justify-center my-16">
          <Spinner width={150} height={150} />
          {isWakingUp && (
            <p className="mt-4 text-gray-500 font-medium text-sm">Connecting to cloud database...</p>
          )}
        </div>
      )}

      {loadError && !loading && (
        <div className="text-center my-12">
          <p className="text-red-600 font-medium mb-3">{loadError}</p>
          <button
            onClick={() => { setLoading(true); fetchPlaces(); }}
            className="bg-pink text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
          >
            Retry Connection
          </button>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 justify-items-center py-4 px-6 gap-y-8 sm:grid-cols-2 sm:gap-x-4 md:grid-cols-2 md:gap-x-4 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
          {filteredPlaces.length > 0 ? (
            filteredPlaces.map((place) => {
              const mainPhoto = place.photos && place.photos.length > 0 ? place.photos[0] : "";
              return (
                <Link to={`/place/${place._id}`} key={place._id} className="w-full max-w-[400px]">
                  <div className="bg-gray-500 mb-2 rounded-2xl flex hover:scale-105 transition-all overflow-hidden">
                    <Image
                      className="rounded-2xl h-[220px] w-[100%] xs:h-[250px] sm:h-[280px] object-cover"
                      src={mainPhoto}
                      alt={place.title || "place-main-photo"}
                    />
                  </div>
                  <h2 className="font-bold">{place.address}</h2>
                  <h3 className="text-sm text-gray-500">
                    {place.title?.length > 44
                      ? `${place.title.substring(0, 44)}....`
                      : place.title}
                  </h3>
                  <div className="font-semibold">
                    <span className="font-bold">₹{place.price?.toLocaleString("en-IN")}</span> per night
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="col-span-full text-center text-gray-500 mt-8">No homestays found matching your search.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default IndexPage;
