import React, { useState } from "react";
import Image from "./Image";

const PlaceGallery = ({ title, photos }) => {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const photoList = Array.isArray(photos) ? photos : [];

  if (showAllPhotos) {
    return (
      <div className="fixed inset-0 z-50 overflow-auto bg-white text-black font-semibold">
        <div className="bg-white p-6 max-w-4xl mx-auto flex flex-col gap-6">
          <div className="flex justify-between items-center sticky top-0 bg-white py-4 z-10 border-b">
            <h2 className="text-2xl font-bold">Photos of {title}</h2>
            <button
              type="button"
              onClick={() => setShowAllPhotos(false)}
              className="flex items-center gap-1.5 py-2 px-4 rounded-2xl shadow-md bg-gray-100 hover:bg-gray-200 text-black transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                />
              </svg>
              Close
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {photoList.map((photo, index) => (
              <div key={index} className="overflow-hidden rounded-2xl shadow-sm">
                <Image src={photo} alt={`${title}-photo-${index}`} className="w-full object-cover max-h-[700px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (photoList.length === 0) {
    return (
      <div className="h-64 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-500 font-medium">
        No photos uploaded for this accommodation.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="grid gap-2 grid-cols-1 overflow-hidden h-[300px] max-h-[600px] md:grid-cols-3 sm:h-[400px] md:h-[460px] rounded-2xl">
        <div className="col-span-2 overflow-hidden h-full">
          {photoList[0] && (
            <div className="w-full h-full overflow-hidden">
              <Image
                onClick={() => setShowAllPhotos(true)}
                className="cursor-pointer object-cover rounded-xl h-full w-full hover:opacity-95 transition-all"
                src={photoList[0]}
                alt="place-main-photo"
              />
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-col gap-2 h-full">
          {photoList[1] && (
            <div className="h-1/2 overflow-hidden rounded-xl">
              <Image
                onClick={() => setShowAllPhotos(true)}
                className="cursor-pointer object-cover w-full h-full hover:opacity-95 transition-all"
                src={photoList[1]}
                alt="place-second-photo"
              />
            </div>
          )}
          {photoList[2] ? (
            <div className="h-1/2 overflow-hidden rounded-xl">
              <Image
                onClick={() => setShowAllPhotos(true)}
                className="cursor-pointer object-cover h-full w-full hover:opacity-95 transition-all"
                src={photoList[2]}
                alt="place-third-photo"
              />
            </div>
          ) : (
            photoList[1] && <div className="h-1/2 bg-gray-200 rounded-xl"></div>
          )}
        </div>
      </div>

      {photoList.length > 1 && (
        <button
          type="button"
          onClick={() => setShowAllPhotos(true)}
          className="flex items-center gap-1.5 absolute bottom-4 right-4 py-2 px-4 bg-white/90 backdrop-blur rounded-2xl shadow-md hover:scale-105 transition-all text-sm font-semibold text-gray-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
              clipRule="evenodd"
            />
          </svg>
          Show all {photoList.length} photos
        </button>
      )}
    </div>
  );
};

export default PlaceGallery;
