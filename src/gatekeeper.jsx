import React, { useState, useEffect } from "react";
import { supabase } from "./creatclient";

// This is the new, stylish banner component
const GeoBlockBanner = ({ country }) => {
  return (
    <div className="geoblock-banner">
      <p>
        <strong>Notice:</strong> Due to regulatory restrictions, trading
        services are not available in your region ({country}).
      </p>
    </div>
  );
};

// This component now acts as a "wrapper" that adds the banner if needed
const GeoGatekeeper = ({ children }) => {
  const [isBlocked, setIsBlocked] = useState(null); // null = checking, true = blocked, false = not blocked
  const [country, setCountry] = useState("...");

  useEffect(() => {
    const checkUserLocation = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "check-location"
        );
        if (error) throw error;

        // We set 'isBlocked' to the opposite of 'isAllowed'
        setIsBlocked(!data.isAllowed);
        setCountry(data.country);
      } catch (err) {
        console.error("Geo-blocking check failed:", err.message);
        // Default to blocked for safety
        setIsBlocked(true);
        setCountry("Error");
      }
    };

    checkUserLocation();
  }, []);

  // While checking, we can just render the app without the banner yet.
  // Or you could return a loading spinner if you prefer.
  if (isBlocked === null) {
    return children;
  }

  return (
    <>
      {/* If the user is blocked, render the banner */}
      {isBlocked && <GeoBlockBanner country={country} />}

      {/* Always render the main application */}
      {children}
    </>
  );
};

export default GeoGatekeeper;
