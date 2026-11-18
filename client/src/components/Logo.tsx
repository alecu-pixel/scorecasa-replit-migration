interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-10" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 200 40"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* House icon - golden yellow */}
      <g transform="translate(8, 4)">
        {/* House body */}
        <path
          d="M16 8 L4 18 L4 30 L28 30 L28 18 L16 8 Z"
          fill="#E2B061"
        />
        {/* Roof peak */}
        <path
          d="M16 4 L0 18 L4 18 L16 8 L28 18 L32 18 L16 4 Z"
          fill="#E2B061"
        />
      </g>
      
      {/* Arrow - cyan */}
      <g transform="translate(8, 4)">
        <path
          d="M22 6 L30 2 L28 10"
          fill="none"
          stroke="#8EC8B6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 14 L26 6"
          fill="none"
          stroke="#8EC8B6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      
      <text x="48" y="27" fontFamily="Fraunces, Georgia, serif" fontSize="19" fontWeight="600">
        <tspan fill="#F3EEE3">Score</tspan><tspan fill="#8EC8B6">Casa</tspan>
      </text>
    </svg>
  );
}
