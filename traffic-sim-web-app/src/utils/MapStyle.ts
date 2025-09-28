export const NAV_MINIMAL_STYLE: google.maps.MapTypeStyle[] = [
  // Base tones
  {elementType: "geometry", stylers: [{color: "#0b111b"}]},
  {elementType: "labels.text.fill", stylers: [{color: "#ffffffff"}]},
  {elementType: "labels.text.stroke", stylers: [{color: "#000000ff"}]},

  // Hide clutter
  {featureType: "poi", stylers: [{visibility: "off"}]},
  {featureType: "transit", stylers: [{visibility: "off"}]},
  {featureType: "administrative", stylers: [{visibility: "off"}]},
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{visibility: "off"}],
  },
  {
    featureType: "road.local",
    elementType: "labels.text",
    stylers: [{visibility: "off"}],
  },

  // Roads—simle but distinct
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#ffffff",
      },
    ],
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#000000",
      },
      {
        lightness: 13,
      },
    ],
  },
  {
    featureType: "administrative",
    elementType: "geometry.fill",
    stylers: [
      {
        color: "#000000",
      },
    ],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#144b53",
      },
      {
        lightness: 14,
      },
      {
        weight: 1.4,
      },
    ],
  },
  {
    featureType: "landscape",
    elementType: "all",
    stylers: [
      {
        color: "#08304b",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [
      {
        color: "#0c4152",
      },
      {
        lightness: 5,
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [
      {
        color: "#000000",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#0b434f",
      },
      {
        lightness: 10,
      },
    ],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.fill",
    stylers: [
      {
        color: "#000000",
      },
    ],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#0b3d51",
      },
      {
        lightness: 16,
      },
    ],
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [
      {
        color: "#000000",
      },
    ],
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [
      {
        color: "#146474",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "all",
    stylers: [
      {
        color: "#021019",
      },
    ],
  },
];