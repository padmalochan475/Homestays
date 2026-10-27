import React from "react";

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").trim().replace(/\/+$/, "");
const apiOrigin = /^https?:\/\//i.test(rawApiUrl)
  ? rawApiUrl
  : `https://${rawApiUrl}`;

const Image = ({ src, className, alt, ...rest }) => {
  if (!src) return null;

  const imageSrc =
    src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")
      ? src
      : `${apiOrigin}/${src.replace(/^\/+/, "")}`;

  return <img className={className} src={imageSrc} alt={alt || "homestay-photo"} {...rest} />;
};

export default Image;
