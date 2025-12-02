// src/Portal.js

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const Portal = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // This runs on the client-side after the component mounts
    setMounted(true);

    // This is a cleanup function that runs when the component unmounts
    return () => setMounted(false);
  }, []);

  // Use the portal only if the component is mounted on the client
  // and render the children into the '#modal-root' div
  return mounted
    ? createPortal(children, document.querySelector("#modal-root"))
    : null;
};

export default Portal;
