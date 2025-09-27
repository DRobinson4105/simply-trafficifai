import React from "react";

type Props = {
  src?: string;
  style?: React.CSSProperties;
};

export default function MjpegView({ src, style }: Props) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt="MJPEG Stream"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: 10,
        ...style,
      }}
      draggable={false}
    />
  );
}
