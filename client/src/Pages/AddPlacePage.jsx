import React, { useContext, useEffect, useState } from "react";
import Perks from "../Components/Perks";
import axios from "axios";
import { Navigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { UserContext } from "../Context/userContext";
import Image from "../Components/Image";
import Spinner from "../Components/Spinner";

const InputHeading = ({ text }) => {
  return (
    <label className="font-semibold text-2xl">
      {text}
    </label>
  );
};

const InputDesc = ({ text, isRequired }) => {
  return (
    <p className="text-gray-500 text-sm font-semibold mb-1">
      {text}
      {isRequired && (
        <sup className="text-red-500 font-bold ml-0.5">*</sup>
      )}
    </p>
  );
};

const AddPlacePage = () => {
  const { user, ready } = useContext(UserContext);
  const { id } = useParams();
  const [redirect, setRedirect] = useState(false);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [photoLink, setPhotoLink] = useState("");
  const [addedPhotos, setAddedPhotos] = useState([]);
  const [description, setDescription] = useState("");
  const [perks, setPerks] = useState([]);
  const [extraInfo, setExtraInfo] = useState("");
  const [maxGuests, setMaxGuests] = useState(1);
  const [price, setPrice] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) {
      axios.get(`/place/${id}`).then(({ data }) => {
        setTitle(data.title || "");
        setAddress(data.address || "");
        setDescription(data.description || "");
        setAddedPhotos(data.photos || []);
        setPerks(data.perks || []);
        setExtraInfo(data.extraInfo || "");
        setMaxGuests(data.maxGuests || 1);
        setPrice(data.price || "");
      }).catch((err) => {
        console.error("Error loading place:", err);
      });
    }
  }, [id]);

  const addPhotoByLink = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!photoLink.trim()) {
      return toast.warn("Please enter a photo link");
    }

    try {
      setUploading(true);
      const { data } = await axios.post("/upload_by_link", { imgLink: photoLink.trim() });
      const photoUrl = typeof data === "string" ? data : photoLink.trim();

      if (addedPhotos.includes(photoUrl)) {
        toast.info("This photo is already added");
      } else {
        setAddedPhotos((prev) => [...prev, photoUrl]);
        toast.success("Photo added successfully!");
        setPhotoLink("");
      }
    } catch (err) {
      // Fallback: direct external link
      setAddedPhotos((prev) => [...prev, photoLink.trim()]);
      toast.success("Photo link added!");
      setPhotoLink("");
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const data = new FormData();
    for (let i = 0; i < files.length; i++) {
      data.append("photos", files[i]);
    }

    try {
      setUploading(true);
      const res = await axios.post("/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (Array.isArray(res.data)) {
        setAddedPhotos((prev) => [...prev, ...res.data]);
        toast.success("Photos uploaded successfully!");
      }
    } catch (err) {
      toast.error("Failed to upload photos. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url) => {
    setAddedPhotos(addedPhotos.filter((photo) => photo !== url));
  };

  const addNewPlace = async (e) => {
    e.preventDefault();
    try {
      const data = {
        title,
        address,
        addedPhotos,
        description,
        perks,
        extraInfo,
        maxGuests: Number(maxGuests),
        price: Number(price),
      };

      if (id) {
        await axios.put("/place", { id, ...data });
        toast.success("Place Updated Successfully!");
      } else {
        await axios.post("/place", data);
        toast.success("Place Added Successfully!");
      }
      setRedirect(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Something went wrong while saving the place.");
    }
  };

  if (redirect) return <Navigate to={"/account/places"} />;

  if (!ready) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner width={120} height={120} />
      </div>
    );
  }

  if (ready && !user) {
    return <Navigate to={"/login"} />;
  }

  return (
    <form onSubmit={addNewPlace} className="px-2 md:px-8 max-w-4xl mx-auto">
      <InputHeading text="Title" />
      <InputDesc
        text="Title for your place, should be short and catchy as in advertisement"
        isRequired={true}
      />
      <input
        type="text"
        placeholder="Title, for example: My Lovely Sea View Villa"
        className="w-full rounded-xl py-2 px-4 border border-gray-300 mb-4"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <InputHeading text="Address" />
      <InputDesc text="Address or location of this place" isRequired={true} />
      <input
        type="text"
        placeholder="Address (City, State, Country)"
        className="w-full rounded-xl py-2 px-4 border border-gray-300 mb-4"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        required
      />

      <InputHeading text="Photos" />
      <InputDesc text="Add photos using a URL or upload from your device" isRequired={addedPhotos.length === 0} />
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Paste an image URL (e.g. https://images.unsplash.com/...)"
          className="flex-1 rounded-xl py-2 px-4 border border-gray-300"
          value={photoLink}
          onChange={(e) => setPhotoLink(e.target.value)}
        />
        <button
          type="button"
          disabled={uploading}
          className="bg-pink text-white px-5 py-2 rounded-xl font-semibold hover:opacity-90 transition-all shrink-0"
          onClick={addPhotoByLink}
        >
          {uploading ? "Adding..." : "Add Photo"}
        </button>
      </div>

      <div className="mb-4">
        <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={uploadFile}
            accept="image/*"
          />
          <span className="text-gray-600 font-medium">📁 Upload from your computer</span>
          <span className="text-gray-400 text-xs mt-1">PNG, JPG, WEBP accepted</span>
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        {addedPhotos.map((url, index) => (
          <div key={index} className="relative h-28 rounded-xl overflow-hidden group border">
            <Image src={url} alt={`photo-${index}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(url)}
              className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-all"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <InputHeading text="Description" />
      <InputDesc text="Detailed description of the homestay and amenities" isRequired={true} />
      <textarea
        rows={5}
        className="w-full rounded-xl py-2 px-4 border border-gray-300 mb-4"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      <label className="font-semibold text-2xl">Perks</label>
      <InputDesc text="Select all the perks offered at your place" />
      <Perks perks={perks} setPerks={setPerks} />

      <InputHeading text="Extra Info" />
      <InputDesc text="House rules, check-in instructions, surrounding area, etc." />
      <textarea
        rows={4}
        className="w-full rounded-xl py-2 px-4 border border-gray-300 mb-4"
        value={extraInfo}
        onChange={(e) => setExtraInfo(e.target.value)}
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">Maximum Guests</h3>
          <input
            type="number"
            min="1"
            className="w-full rounded-xl py-2 px-4 border border-gray-300"
            value={maxGuests}
            onChange={(e) => setMaxGuests(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">Price Per Night (₹)</h3>
          <input
            type="number"
            min="0"
            className="w-full rounded-xl py-2 px-4 border border-gray-300"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="bg-pink w-full rounded-2xl text-white py-3 font-semibold text-xl mb-8 hover:opacity-90 transition-all shadow-md"
      >
        Save Your Place
      </button>
    </form>
  );
};

export default AddPlacePage;
