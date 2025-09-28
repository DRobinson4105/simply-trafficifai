import React, { useEffect, useMemo, useState } from "react";
import { Lane, laneArrowDataUrl } from "./Lane";
import { Props, metersToMiles, remainingMetersOnStep } from "../utils/MathUtils"

function ManeuverIcon({ maneuver }: { maneuver?: string | null }) {
	const map: Record<string, number> = {
		"turn-left": -90,
		"turn-right": 90,
		"keep-left": -45,
		"keep-right": 45,
		straight: 0,
	};
	const rotate = map[maneuver ?? ""] ?? 0;

	return (
		<span
			style={{
				width: 22,
				height: 22,
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				lineHeight: 0,
				pointerEvents: "none",
			}}
			aria-hidden
			title={maneuver ?? "instruction"}
		>
			<svg width="22" height="22" viewBox="0 0 24 24">
				<path
					d="M12 3l5 5h-3v9h-4V8H7l5-5z"
					transform={`rotate(${rotate} 12 12)`}
					fill="currentColor"
				/>
			</svg>
		</span>
	);
}

export default function Header({
	currentPosition,
	steps,
	className,
	style,
}: Props) {
	const [stepIdx, setStepIdx] = useState(0);
	const [lanes, setLanes] = useState<boolean[]>([]);

	useEffect(() => {
		setStepIdx(0);
	}, [steps]);

	useEffect(() => {
		async function fetchLanes() {
			try {
			const res = await fetch("http://localhost:5001/api/get-optimal-lanes", { method: "GET" });
			const json = await res.json();

			const arr = Array.isArray(json) ? json : (json?.lanes ?? json?.laneBooleans);
			if (Array.isArray(arr)) {
			  setLanes(arr.map(Boolean));
			}
			} catch {
			console.error("Error fetching lane data\n");
			}
		}

		fetchLanes();
	}, []);

	useEffect(() => {
		if (!steps?.length) return;

		const SWITCH_AT_M = 12;

		let nextIdx = Math.min(stepIdx, steps.length - 1);
		let rem = remainingMetersOnStep(steps[nextIdx], currentPosition);
		while (rem < SWITCH_AT_M && nextIdx < steps.length - 1) {
			nextIdx += 1;
			rem = remainingMetersOnStep(steps[nextIdx], currentPosition);
		}

		const advanced = nextIdx !== stepIdx;
	
        fetch('http://localhost:5001/api/update', {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({"latitude": currentPosition.latitude.toFixed(6), "longitude": currentPosition.longitude.toFixed(6)})
        });
		if (advanced) {
			setStepIdx(nextIdx);
		}
	}, [currentPosition, steps, stepIdx]);

	const currentStep =
		steps?.[Math.min(stepIdx, Math.max(0, (steps?.length ?? 1) - 1))] ?? null;

	const milesLeft = useMemo(() => {
		if (!currentStep) return null;
		try {
			const meters = remainingMetersOnStep(currentStep, currentPosition);
			return metersToMiles(meters);
		} catch {
			const m = currentStep.distance?.value ?? 0;
			return metersToMiles(m);
		}
	}, [currentStep, currentPosition]);

	if (!currentStep) return null;

	return (
		<div
			className={className}
			style={{
				position: "absolute",
				top: 12,
				left: 12,
				right: 12,
				display: "flex",
				alignItems: "center",
				gap: 20,
				padding: "12px 14px",
				borderRadius: 12,
				backdropFilter: "blur(8px)",
				background: "rgba(12, 18, 28, 0.65)",
				border: "1px solid rgba(142, 195, 255, 0.18)",
				color: "#E8F1F8",
				fontWeight: 700,
				justifyContent: "space-between",
				fontSize: 15,
				pointerEvents: "none",
				boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
				...(style || {}),
			}}
			aria-live="polite"
		>
			<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
				<ManeuverIcon maneuver={currentStep.maneuver} />

				<span
					dangerouslySetInnerHTML={{
						__html: currentStep.instructions ?? "",
					}}
				/>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: -1 }}>
				{!!lanes.length && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
              marginBottom: 4,
							pointerEvents: "none",
						}}
						aria-label="Lane status"
					>
						{lanes.map((blocked, i) => (
							<img
								key={i}
								src={laneArrowDataUrl(blocked, 18)}
								width={18}
								height={18}
								alt={blocked ? "Lane blocked" : "Lane open"}
								style={{ display: "block" }}
							/>
						))}
					</div>
				)}

				{typeof milesLeft === "number" && (
					<span
						style={{
							padding: "4px 8px",
							borderRadius: 999,
							background: "rgba(24, 118, 211, 0.25)",
							border: "1px solid rgba(24,118,211,0.5)",
							fontWeight: 800,
						}}
					>
						{milesLeft < 0.1
							? `${Math.max(0, milesLeft * 5280).toFixed(0)} ft`
							: `${milesLeft.toFixed(1)} mi`}
					</span>
				)}
			</div>
		</div>
	);
}
