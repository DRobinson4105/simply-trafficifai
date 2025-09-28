import React, { useEffect, useMemo, useState } from "react";
import { Lane, laneArrowDataUrl } from "./Lane";

export type LatLng = { latitude: number; longitude: number };

type Props = {
	currentPosition: LatLng;
	steps: google.maps.DirectionsStep[] | undefined;
	className?: string;
	style?: React.CSSProperties;
};

function toRad(d: number) {
	return (d * Math.PI) / 180;
}

function haversineMeters(
	a: { latitude: number; longitude: number },
	b: { latitude: number; longitude: number }
) {
	const R = 6371000;
	const dLat = toRad(b.latitude - a.latitude);
	const dLon = toRad(b.longitude - a.longitude);
	const lat1 = toRad(a.latitude);
	const lat2 = toRad(b.latitude);
	const sinDLat = Math.sin(dLat / 2);
	const sinDLon = Math.sin(dLon / 2);
	const h =
		sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function metersToMiles(m: number) {
	return m / 1609.344;
}

function projectOntoSegment(pos: LatLng, a: LatLng, b: LatLng) {
	const mPerDegLat = 111320;
	const mPerDegLon = 111320 * Math.cos(toRad(pos.latitude));

	const ax = (a.longitude - pos.longitude) * mPerDegLon;
	const ay = (a.latitude - pos.latitude) * mPerDegLat;
	const bx = (b.longitude - pos.longitude) * mPerDegLon;
	const by = (b.latitude - pos.latitude) * mPerDegLat;

	const vx = bx - ax;
	const vy = by - ay;
	const wx = -ax;
	const wy = -ay;

	const vv = vx * vx + vy * vy;
	let t = vv === 0 ? 0 : (wx * vx + wy * vy) / vv;
	t = Math.max(0, Math.min(1, t));

	const projX = ax + t * vx;
	const projY = ay + t * vy;

	const projLon = projX / mPerDegLon + pos.longitude;
	const projLat = projY / mPerDegLat + pos.latitude;

	return { t, lat: projLat, lng: projLon };
}

function remainingMetersOnStep(
	step: google.maps.DirectionsStep,
	currentPosition: LatLng
) {
	const path = (step as unknown as { path?: google.maps.LatLng[] }).path || [];
	const end = step.end_location;

	if (!path.length && end) {
		return haversineMeters(currentPosition, {
			latitude: end.lat(),
			longitude: end.lng(),
		});
	}
	if (path.length <= 1) return 0;

	let best = {
		distToProj: Number.POSITIVE_INFINITY,
		seg: 0,
		proj: { lat: path[0].lat(), lng: path[0].lng() },
	};

	for (let i = 0; i < path.length - 1; i++) {
		const a = { latitude: path[i].lat(), longitude: path[i].lng() };
		const b = { latitude: path[i + 1].lat(), longitude: path[i + 1].lng() };
		const proj = projectOntoSegment(currentPosition, a, b);
		const d = haversineMeters(currentPosition, {
			latitude: proj.lat,
			longitude: proj.lng,
		});
		if (d < best.distToProj) {
			best = { distToProj: d, seg: i, proj: { lat: proj.lat, lng: proj.lng } };
		}
	}

	let remaining = 0;

	const nextIdx = best.seg + 1;
	if (nextIdx >= path.length) return 0;
	const firstNext = {
		latitude: path[nextIdx].lat(),
		longitude: path[nextIdx].lng(),
	};
	remaining += haversineMeters(
		{ latitude: best.proj.lat, longitude: best.proj.lng },
		firstNext
	);

	for (let j = nextIdx; j < path.length - 1; j++) {
		const u = { latitude: path[j].lat(), longitude: path[j].lng() };
		const v = { latitude: path[j + 1].lat(), longitude: path[j + 1].lng() };
		remaining += haversineMeters(u, v);
	}

	return remaining;
}

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
			// try {
			// const res = await fetch("/api/get-optimal-lanes", { method: "GET" });
			// const json = await res.json();

			// const arr = Array.isArray(json) ? json : (json?.lanes ?? json?.laneBooleans);
			// if (Array.isArray(arr)) {
			//   setLanes(arr.map(Boolean));
			// }
			// } catch {
			// console.error("Error fetching lane data\n");
			// }
			let ARRAY: Array<boolean> = Array(true, true, true, true);
			setLanes(ARRAY);
		}

		fetchLanes();
	}, []);

	const didMountRef = React.useRef(false);

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
		if (advanced) {
			if (didMountRef.current) {
				const qs = new URLSearchParams({
					lat: currentPosition.latitude.toFixed(6),
					lng: currentPosition.longitude.toFixed(6),
				});
				console.log('update')
				fetch(`http://localhost:5001/api/api/update?${qs.toString()}`, {
					method: "PUT",
					keepalive: true,
				}).catch(() => {});
			} else {
				didMountRef.current = true;
			}

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
