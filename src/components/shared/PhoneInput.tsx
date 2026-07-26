import { useState } from "react";

export interface CountryCode {
  flag: string;
  name: string;
  code: string;
  digits: number; // expected local digits
}

export const COUNTRY_CODES: CountryCode[] = [
  // Arab countries
  { flag: "🇪🇬", name: "Egypt", code: "+20", digits: 10 },
  { flag: "🇸🇦", name: "Saudi Arabia", code: "+966", digits: 9 },
  { flag: "🇦🇪", name: "UAE", code: "+971", digits: 9 },
  { flag: "🇰🇼", name: "Kuwait", code: "+965", digits: 8 },
  { flag: "🇶🇦", name: "Qatar", code: "+974", digits: 8 },
  { flag: "🇧🇭", name: "Bahrain", code: "+973", digits: 8 },
  { flag: "🇴🇲", name: "Oman", code: "+968", digits: 8 },
  { flag: "🇯🇴", name: "Jordan", code: "+962", digits: 9 },
  { flag: "🇱🇧", name: "Lebanon", code: "+961", digits: 8 },
  { flag: "🇮🇶", name: "Iraq", code: "+964", digits: 10 },
  { flag: "🇸🇾", name: "Syria", code: "+963", digits: 9 },
  { flag: "🇱🇾", name: "Libya", code: "+218", digits: 9 },
  { flag: "🇹🇳", name: "Tunisia", code: "+216", digits: 8 },
  { flag: "🇩🇿", name: "Algeria", code: "+213", digits: 9 },
  { flag: "🇲🇦", name: "Morocco", code: "+212", digits: 9 },
  { flag: "🇾🇪", name: "Yemen", code: "+967", digits: 9 },
  { flag: "🇸🇩", name: "Sudan", code: "+249", digits: 9 },
  { flag: "🇵🇸", name: "Palestine", code: "+970", digits: 9 },
  { flag: "🇩🇯", name: "Djibouti", code: "+253", digits: 8 },
  { flag: "🇲🇷", name: "Mauritania", code: "+222", digits: 8 },
  { flag: "🇸🇴", name: "Somalia", code: "+252", digits: 8 },
  // divider handled by option grouping
  { flag: "🇺🇸", name: "USA / Canada", code: "+1", digits: 10 },
  { flag: "🇬🇧", name: "UK", code: "+44", digits: 10 },
  { flag: "🇩🇪", name: "Germany", code: "+49", digits: 10 },
  { flag: "🇫🇷", name: "France", code: "+33", digits: 9 },
  { flag: "🇹🇷", name: "Turkey", code: "+90", digits: 10 },
  { flag: "🇮🇳", name: "India", code: "+91", digits: 10 },
  { flag: "🇵🇰", name: "Pakistan", code: "+92", digits: 10 },
  { flag: "🇨🇳", name: "China", code: "+86", digits: 11 },
  { flag: "🇷🇺", name: "Russia", code: "+7", digits: 10 },
  { flag: "🇮🇹", name: "Italy", code: "+39", digits: 10 },
  { flag: "🇪🇸", name: "Spain", code: "+34", digits: 9 },
];

const ARAB_CODES = COUNTRY_CODES.slice(0, 21);
const OTHER_CODES = COUNTRY_CODES.slice(21);

interface PhoneInputProps {
  value: string; // full value e.g. "+201007419344"
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

/** Splits a stored full phone into {code, local} */
function split(full: string): { code: string; local: string } {
  const match = COUNTRY_CODES.find((c) => full.startsWith(c.code));
  if (match) return { code: match.code, local: full.slice(match.code.length) };
  return { code: "+20", local: full.replace(/^\+?\d{1,3}/, "") };
}

export function PhoneInput({ value, onChange, className = "", placeholder }: PhoneInputProps) {
  const { code: initCode, local: initLocal } = split(value || "+20");
  const [code, setCode] = useState(initCode);
  const [local, setLocal] = useState(initLocal);

  const country = COUNTRY_CODES.find((c) => c.code === code) ?? COUNTRY_CODES[0];
  const digits = country.digits;
  const localClean = local.replace(/\D/g, "");
  const isValid = localClean.length === digits;
  const isDirty = localClean.length > 0;

  const handleCode = (newCode: string) => {
    setCode(newCode);
    onChange(newCode + localClean);
  };

  const handleLocal = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, digits);
    setLocal(clean);
    onChange(code + clean);
  };

  return (
    <div className={`flex gap-1.5 ${className}`}>
      {/* Country code picker */}
      <select
        value={code}
        onChange={(e) => handleCode(e.target.value)}
        className="h-9 rounded-lg border border-border bg-background px-1.5 text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/40"
        style={{ minWidth: "90px" }}
      >
        <optgroup label="Arab Countries">
          {ARAB_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </optgroup>
        <optgroup label="Other Countries">
          {OTHER_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </optgroup>
      </select>

      {/* Local number */}
      <div className="relative flex-1">
        <input
          type="tel"
          inputMode="numeric"
          value={local}
          onChange={(e) => handleLocal(e.target.value)}
          placeholder={placeholder ?? `${digits} digits`}
          className={[
            "h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2",
            isDirty && !isValid
              ? "border-destructive focus:ring-destructive/40 text-destructive"
              : "border-border focus:ring-primary/40",
          ].join(" ")}
        />
        {isDirty && (
          <span
            className={[
              "absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold",
              isValid ? "text-emerald-500" : "text-destructive",
            ].join(" ")}
          >
            {localClean.length}/{digits}
          </span>
        )}
      </div>
    </div>
  );
}
