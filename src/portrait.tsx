type FaceProps = { id: string; size?: number };

export function Portrait({ id, size = 64 }: FaceProps) {
  return (
    <svg
      className={`portrait portrait-${id}`}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
    >
      {id === "eli" && <Eli />}
      {id === "helen" && <Helen />}
      {id === "sam" && <Sam />}
      {id !== "eli" && id !== "helen" && id !== "sam" && <Maya />}
    </svg>
  );
}

function Maya() {
  return (
    <>
      <circle cx="40" cy="40" r="40" fill="#c46a4a" />
      <circle cx="40" cy="48" r="20" fill="#f4d0c0" />
      <path
        d="M16 44c1-18 12-30 24-30s23 12 24 30c-4-10-12-14-24-14S20 34 16 44z"
        fill="#3a241c"
      />
      <path
        d="M18 42c8 6 12 4 16-1 3 7 8 10 14 8 2-8 8-12 14-10-2 12-10 22-22 24-14-1-20-12-22-21z"
        fill="#3a241c"
      />
      <circle cx="33" cy="50" r="1.7" fill="#2a211c" />
      <circle cx="48" cy="50" r="1.7" fill="#2a211c" />
      <path
        d="M34 58c2.4 2.4 9 2.4 12 0"
        fill="none"
        stroke="#a85a4a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="27" cy="55" r="2.2" fill="#e7a090" opacity="0.7" />
      <circle cx="54" cy="55" r="2.2" fill="#e7a090" opacity="0.7" />
    </>
  );
}

function Eli() {
  return (
    <>
      <circle cx="40" cy="40" r="40" fill="#3f5c4e" />
      <circle cx="40" cy="48" r="20" fill="#e7c6aa" />
      <path d="M18 36c4-16 14-22 22-22s18 6 22 22c-8-6-14-8-22-8s-14 2-22 8z" fill="#241c16" />
      <path d="M20 34c6 2 10 1 14-2 4 3 10 4 16 1 0 4-1 8-2 10H22c-1-3-2-7-2-9z" fill="#241c16" />
      <path d="M30 46h6" stroke="#241c16" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M45 46h6" stroke="#241c16" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="33" cy="50" r="1.5" fill="#241c16" />
      <circle cx="48" cy="50" r="1.5" fill="#241c16" />
      <path
        d="M35 58c2 1.6 8 1.6 10 0"
        fill="none"
        stroke="#8d5a42"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M24 70h32v6H24z" fill="#1e2c26" />
      <path d="M36 64h8v8h-8z" fill="#e7c6aa" />
    </>
  );
}

function Helen() {
  return (
    <>
      <circle cx="40" cy="40" r="40" fill="#4d6d82" />
      <circle cx="40" cy="50" r="19" fill="#f0d2bc" />
      <path
        d="M22 42c2-8 8-16 18-18 10 2 16 10 18 18-6-2-10 2-18 2s-12-4-18-2z"
        fill="#6d5346"
      />
      <circle cx="40" cy="22" r="8" fill="#6d5346" />
      <path d="M30 24c2-8 6-12 10-12s8 4 10 12" fill="none" stroke="#6d5346" strokeWidth="4" />
      <circle cx="32.5" cy="50" r="5.5" fill="none" stroke="#24323c" strokeWidth="1.3" />
      <circle cx="47.5" cy="50" r="5.5" fill="none" stroke="#24323c" strokeWidth="1.3" />
      <path d="M38 50h4" stroke="#24323c" strokeWidth="1.3" />
      <circle cx="32.5" cy="50" r="1.3" fill="#24323c" />
      <circle cx="47.5" cy="50" r="1.3" fill="#24323c" />
      <path
        d="M35 60c2 2 8 2 10 0"
        fill="none"
        stroke="#a06a58"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="58" cy="54" r="1.6" fill="#f4efe6" />
    </>
  );
}

function Sam() {
  return (
    <>
      <circle cx="40" cy="40" r="40" fill="#7a4e6a" />
      <circle cx="40" cy="50" r="19" fill="#f0cbb8" />
      <circle cx="24" cy="36" r="8" fill="#2c221c" />
      <circle cx="34" cy="28" r="9" fill="#2c221c" />
      <circle cx="46" cy="27" r="9" fill="#2c221c" />
      <circle cx="57" cy="35" r="8" fill="#2c221c" />
      <path d="M20 46c4-8 12-12 20-12s16 4 20 12c-6 2-12 1-20 1s-14 1-20-1z" fill="#2c221c" />
      <path d="M31 49c1.2 1.2 2 1.2 3.2 0" fill="none" stroke="#2c221c" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M46 49c1.2 1.2 2 1.2 3.2 0" fill="none" stroke="#2c221c" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M34 58c2.2 3 9.5 3 12 0"
        fill="none"
        stroke="#9a5b58"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="26" cy="56" r="2" fill="#e7a090" opacity="0.75" />
      <circle cx="54" cy="56" r="2" fill="#e7a090" opacity="0.75" />
    </>
  );
}
