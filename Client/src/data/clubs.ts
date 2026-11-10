export type Club = {
  id: string;
  name: string;
  category: string;
  description: string;
};

export const clubs: Club[] = [
  {
    id: "ncc",
    name: "NCC",
    category: "National Service",
    description: "National Cadet Corps and campus cadet activities."
  },
  {
    id: "iste",
    name: "ISTE",
    category: "Professional Society",
    description: "Technology, engineering and professional development."
  },
  {
    id: "tsdw",
    name: "TSDW",
    category: "Student Development",
    description: "Student development and welfare activities."
  },
  {
    id: "rotaract",
    name: "Rotaract",
    category: "Social Service",
    description: "Community service, leadership and social initiatives."
  },
  {
    id: "nss",
    name: "NSS",
    category: "Social Service",
    description: "National Service Scheme and volunteering activities."
  },
  {
    id: "green-club",
    name: "Green Club",
    category: "Environmental",
    description: "Environmental awareness and sustainability initiatives."
  }
];