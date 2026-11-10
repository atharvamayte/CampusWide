export type CampusNode = {
  id: string;
  name: string;
  description: string;
  type:
    | "institution"
    | "department"
    | "class"
    | "group"
    | "organisation"
    | "destination";
  children?: CampusNode[];
};

export const campusData: CampusNode = {
  id: "tcet",
  name: "TCET",
  description: "Welcome to your campus",
  type: "institution",

  children: [
    {
      id: "academics",
      name: "Academics",
      description: "Classes, departments and divisions",
      type: "department",
      children: [
        {
          id: "it-b",
          name: "IT-B",
          description: "Information Technology — Division B",
          type: "class",
          children: [
            {
              id: "students",
              name: "Students",
              description: "Your division's student community",
              type: "group"
            },
            {
              id: "innovative-exam",
              name: "Innovative Exam",
              description: "Your project team",
              type: "group"
            }
          ]
        }
      ]
    },
    {
      id: "organisations",
      name: "Organisations",
      description: "Communities you are a member of",
      type: "destination"
    },
    {
      id: "explore-campus",
      name: "Explore Campus",
      description: "Discover and join campus communities",
      type: "destination"
    },
    {
      id: "events",
      name: "Events",
      description: "Discover what's happening on campus",
      type: "destination"
    }
  ]
};