/**
 * VRVerse Player — Progress Circle Component
 * SVG circular progress indicator with percentage and stage display.
 */

interface ProgressCircleProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  stage?: string;
  showPercent?: boolean;
}

export function ProgressCircle({
  progress,
  size = 160,
  strokeWidth = 8,
  stage = '',
  showPercent = true,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="progress-circle">
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          className="progress-circle-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          className="progress-circle-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercent && (
          <span className="text-3xl font-bold gradient-text">
            {Math.round(progress)}%
          </span>
        )}
        {stage && (
          <span className="text-xs text-white/50 mt-1 max-w-[80%] text-center truncate">
            {stage}
          </span>
        )}
      </div>
    </div>
  );
}
