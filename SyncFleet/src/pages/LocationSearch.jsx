// components/LocationSearch.jsx
import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const LocationSearch = ({ onSelect }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 2) {
      try {
        const response = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: {
            q: value,
            format: "json",
            addressdetails: 1,
            limit: 5,
          },
        });

        const results = response.data.map((place) => ({
          displayName: place.display_name,
          lat: place.lat,
          lon: place.lon,
        }));

        setSuggestions(results);
      } catch (err) {
        console.error("Geocoding error:", err);
        toast.error("Location search failed");
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (place) => {
    setQuery(place.displayName);
    setSuggestions([]);
    onSelect(place); // send back to parent (lat/lon + name)
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Enter location..."
        className="w-full rounded border border-gray-300 py-2 px-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition"
      />

      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded shadow max-h-60 overflow-y-auto">
          {suggestions.map((place, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(place)}
              className="p-2 cursor-pointer hover:bg-gray-200"
            >
              {place.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationSearch;
