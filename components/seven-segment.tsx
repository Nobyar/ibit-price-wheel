const SEGMENTS = {
  a: "3,1.2 17,1.2 19,3.2 16.2,5.2 3.8,5.2 1,3.2",
  b: "17.2,4.2 19.2,6.2 19.2,15.2 17.2,17.2 15.2,15.2 15.2,6.2",
  c: "17.2,18.8 19.2,20.8 19.2,29.8 17.2,31.8 15.2,29.8 15.2,20.8",
  d: "3,30.8 17,30.8 19,32.8 16.2,34.8 3.8,34.8 1,32.8",
  e: "2.8,18.8 4.8,20.8 4.8,29.8 2.8,31.8 0.8,29.8 0.8,20.8",
  f: "2.8,4.2 4.8,6.2 4.8,15.2 2.8,17.2 0.8,15.2 0.8,6.2",
  g: "3.2,16.4 16.8,16.4 18.6,18 16.8,19.6 3.2,19.6 1.4,18",
} as const;

const MASK: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};

function Digit({ char }: { char: string }) {
  const on = MASK[char] ?? "";
  return (
    <svg viewBox="0 0 20 36" className="h-[1em] w-[0.62em]" aria-hidden="true">
      {(Object.keys(SEGMENTS) as (keyof typeof SEGMENTS)[]).map((key) => (
        <polygon
          key={key}
          points={SEGMENTS[key]}
          className={on.includes(key) ? "segment-on" : "segment-off"}
        />
      ))}
    </svg>
  );
}

function Glyph({ char }: { char: string }) {
  if (char === "," || char === " ") {
    return (
      <svg viewBox="0 0 10 36" className="h-[1em] w-[0.28em]" aria-hidden="true">
        <circle cx="5" cy="30" r="2.1" className="segment-on" />
        <circle cx="7.2" cy="33.2" r="1.3" className="segment-on" />
      </svg>
    );
  }
  if (char === ".") {
    return (
      <svg viewBox="0 0 10 36" className="h-[1em] w-[0.28em]" aria-hidden="true">
        <circle cx="5" cy="31.5" r="2.3" className="segment-on" />
      </svg>
    );
  }
  return <Digit char={char} />;
}

export function SegmentValue({ value }: { value: string }) {
  return (
    <div className="flex items-end justify-center text-phosphor">
      {value.split("").map((char, index) => (
        <Glyph key={`${index}-${char}`} char={char} />
      ))}
    </div>
  );
}
