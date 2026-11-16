import React, { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { suggestEntityAddresses } from "../services/api";

export default function AddressAutocomplete({
  label,
  name,
  required = false,
  hint,
  countryCode = "",
  value,
  defaultValue = "",
  onChange,
  rows = 3,
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const currentValue = controlled ? value : internalValue;
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const sessionToken = useRef(crypto.randomUUID());
  const requestNumber = useRef(0);

  useEffect(() => {
    const query = String(currentValue || "").trim();
    if (query.length < 3 || !open) {
      setSuggestions([]);
      return undefined;
    }
    const currentRequest = ++requestNumber.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await suggestEntityAddresses(query, {
          countryCode,
          sessionToken: sessionToken.current,
        });
        if (currentRequest === requestNumber.current) setSuggestions(result.suggestions || []);
      } catch {
        if (currentRequest === requestNumber.current) setSuggestions([]);
      } finally {
        if (currentRequest === requestNumber.current) setLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [currentValue, countryCode, open]);

  const update = (nextValue) => {
    if (!controlled) setInternalValue(nextValue);
    onChange?.({ target: { name, value: nextValue } });
  };

  const choose = (suggestion) => {
    update(suggestion.address);
    setSuggestions([]);
    setOpen(false);
    sessionToken.current = crypto.randomUUID();
  };

  return (
    <label className="entity-field entity-field-wide entity-address-field">
      <span>{label}{required && <em>Required</em>}</span>
      <div className="entity-address-control">
        <MapPin size={15} aria-hidden="true" />
        <textarea
          name={name}
          required={required}
          rows={rows}
          value={currentValue}
          autoComplete="street-address"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          onChange={(event) => {
            update(event.target.value);
            setOpen(true);
          }}
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
        />
        {loading && <Loader2 size={14} className="spin entity-address-loader" aria-label="Loading address suggestions" />}
      </div>
      {open && suggestions.length > 0 && (
        <div className="entity-address-suggestions" role="listbox">
          {suggestions.map((suggestion) => (
            <button key={suggestion.place_id} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(suggestion)}>
              <MapPin size={14} />
              <span><strong>{suggestion.primary_text}</strong><small>{suggestion.secondary_text}</small></span>
            </button>
          ))}
          <p>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
            <span> · </span>
            <a href="https://photon.komoot.io" target="_blank" rel="noreferrer">Photon</a>
          </p>
        </div>
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
