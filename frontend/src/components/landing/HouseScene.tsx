export function HouseScene() {
  return (
    <div className="house-scene pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <svg
        className="house-float h-full w-full"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMax meet"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g transform="translate(200 0)">
        <g className="house-fill">
          <path d="M420 352h360v208H420z" />
          <path d="M388 362 600 220l212 142z" />
        </g>

        <g className="house-window">
          <path d="M568 440h90v84h-90z" />
          <path d="M296 470h64v90h-64z" />
          <path d="M700 484h38v28h-38z" />
        </g>

        <g className="house-draw" stroke="currentColor" strokeWidth="2">
          <path pathLength={1} d="M330 560h900" className="house-ground" />
          <path pathLength={1} d="M420 560V352h360v208" className="house-wall" />
          <path pathLength={1} d="M388 362 600 220l212 142" className="house-roof" />
          <path pathLength={1} d="M690 264v-62h38v96" className="house-chimney" />
          <path pathLength={1} d="M470 560v-74a22 22 0 0 1 22-22h42a22 22 0 0 1 22 22v74" className="house-door" />
          <path pathLength={1} d="M540 506h14" />
          <path pathLength={1} d="M568 440h90v84h-90z" />
          <path pathLength={1} d="M613 440v84M568 482h90" />
          <path pathLength={1} d="M296 470h64v90h-64z" />
          <path pathLength={1} d="M328 470v90M296 515h64" />
          <path pathLength={1} d="M700 484h38v28h-38z" />
          <path pathLength={1} d="M286 560v-34M272 560v-50M258 560v-34M772 560v-34M786 560v-50M800 560v-34" className="house-fence" />
          <path pathLength={1} d="M246 526h70M760 526h80" className="house-fence" />
          <path pathLength={1} d="M600 560c-10 34-16 64-18 90M600 560c10 34 16 64 18 90" className="house-path" />
          <path pathLength={1} d="M236 560v-72M198 506l38-56 38 56M212 466l24-42 24 42" className="house-tree" />
          <path pathLength={1} d="M966 560v-78M920 500l46-68 46 68M936 452l30-50 30 50" className="house-tree" />
        </g>

        <g className="house-sign">
          <rect x="568" y="360" width="92" height="34" rx="10" />
          <text x="614" y="383" textAnchor="middle" fontSize="16" fontWeight="700" className="house-sign-text">B&amp;B</text>
        </g>

        <g className="house-smoke">
          <circle cx="709" cy="186" r="10" style={{ animationDelay: "0s" }} />
          <circle cx="722" cy="166" r="13" style={{ animationDelay: "1.1s" }} />
          <circle cx="706" cy="140" r="16" style={{ animationDelay: "2.2s" }} />
        </g>

        <g className="house-stars">
          <circle cx="164" cy="150" r="2.5" style={{ animationDelay: "0s" }} />
          <circle cx="258" cy="212" r="2" style={{ animationDelay: "1.4s" }} />
          <circle cx="1008" cy="176" r="2.5" style={{ animationDelay: ".6s" }} />
          <circle cx="1094" cy="250" r="2" style={{ animationDelay: "2s" }} />
          <circle cx="862" cy="120" r="2" style={{ animationDelay: "2.8s" }} />
        </g>

        <g className="house-cloud">
          <path d="M120 230c0-16 13-28 29-28 6 0 11 2 16 5 6-10 17-16 29-16 20 0 36 16 36 36 0 2 0 4-1 6" />
          <path d="M120 230h96" />
        </g>

        <g className="house-cloud house-cloud-slow">
          <path d="M980 320c0-12 10-22 22-22 5 0 9 1 12 4 5-8 13-12 22-12 16 0 28 12 28 28 0 2 0 3-1 5" />
          <path d="M980 320h74" />
        </g>
        </g>
      </svg>
    </div>
  );
}
