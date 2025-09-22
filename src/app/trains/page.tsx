"use client";

import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";

/*
  MetroMind page.tsx
  - Fully client-side Next.js page component using Tailwind CSS
  - Contains all features from the original HTML/CSS/JS: data model, priority calculation,
    fitness calculation, filters (search, priority, fitness, bay), modal details, CSV export,
    schedule maintenance alert and stats update.

  How to use:
  - Place this file at app/(or pages)/metro/page.tsx (Next 13 app router) or pages/metro/index.tsx
  - Ensure Tailwind CSS is configured in your Next.js project.
  - This component uses only browser APIs (no external libs).
*/

type FitnessCertificates = {
  "Train ID": string;
  "Rolling Stock Valid": string;
  "Signalling Valid": string;
  "Telecom Valid": string;
};

type Branding = {
  "Train ID": string;
  "Wrap ID": string;
  Advertiser: string;
  "Exposure Hours Today": number;
  "SLA Hours Month": number;
  "Preferred Times": string;
  "Audience Profile": string; // JSON string
};

type Mileage = {
  "Train ID": string;
  Date: string;
  "Km Travelled": number;
  "Bogie Wear %": number;
  "Brake Wear %": number;
  "HVAC Hours": number;
};

type Cleaning = {
  "Train ID": string;
  "Bay No": number;
  Status: string;
  "Scheduled Time": string;
  "Completed Time"?: string;
  "Duration (min)"?: number;
};

type Stabling = {
  "Train ID": string;
  "Current Bay": number;
  Position: string;
  "Is Reception": boolean;
  "Recommended Departure": string;
  Priority: number;
};

type Train = {
  train_id: string;
  date: string;
  fitness_certificates: FitnessCertificates;
  job_cards: any[];
  branding: Branding;
  mileage: Mileage;
  cleaning: Cleaning;
  stabling: Stabling;
};

const SAMPLE_DATA: Train[] = [
  {
    train_id: "R001",
    date: "2025-09-17",
    fitness_certificates: {
      "Train ID": "R001",
      "Rolling Stock Valid": "2025-12-15",
      "Signalling Valid": "2025-11-22",
      "Telecom Valid": "2025-10-14",
    },
    job_cards: [],
    branding: {
      "Train ID": "R001",
      "Wrap ID": "W-01",
      Advertiser: "Tech Corp",
      "Exposure Hours Today": 8,
      "SLA Hours Month": 240,
      "Preferred Times": "07:00-09:00",
      "Audience Profile": '{"office":0.65,"students":0.2,"shoppers":0.15}',
    },
    mileage: {
      "Train ID": "R001",
      Date: "2025-09-16",
      "Km Travelled": 45000,
      "Bogie Wear %": 25.5,
      "Brake Wear %": 18.2,
      "HVAC Hours": 12,
    },
    cleaning: {
      "Train ID": "R001",
      "Bay No": 1,
      Status: "Done",
      "Scheduled Time": "2025-09-16 23:00",
      "Completed Time": "2025-09-16 23:45",
      "Duration (min)": 45,
    },
    stabling: {
      "Train ID": "R001",
      "Current Bay": 1,
      Position: "Front",
      "Is Reception": false,
      "Recommended Departure": "2025-09-17 06:00",
      Priority: 3,
    },
  },
  {
    "train_id": "R002",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R002",
        "Rolling Stock Valid": "2025-09-14",
        "Signalling Valid": "2025-09-22",
        "Telecom Valid": "2025-09-14"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R002",
        "Wrap ID": "W-44",
        "Advertiser": "Fitness First",
        "Exposure Hours Today": 3,
        "SLA Hours Month": 117,
        "Preferred Times": "15:30-18:30",
        "Audience Profile": "{\"office\":0.41,\"students\":0.13,\"shoppers\":0.46}"
    },
    "mileage": {
        "Train ID": "R002",
        "Date": "2025-09-16",
        "Km Travelled": 194000,
        "Bogie Wear %": 72.79,
        "Brake Wear %": 66.54,
        "HVAC Hours": 8
    },
    "cleaning": {
        "Train ID": "R002",
        "Bay No": 1,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 22:34",
        "Completed Time": "2025-09-16 23:25",
        "Duration (min)": 51
    },
    "stabling": {
        "Train ID": "R002",
        "Current Bay": 2,
        "Position": "Rear",
        "Is Reception": true,
        "Recommended Departure": "2025-09-16 07:26",
        "Priority": 5
    }
},
{
    "train_id": "R003",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R003",
        "Rolling Stock Valid": "2025-11-20",
        "Signalling Valid": "2025-10-15",
        "Telecom Valid": "2025-12-01"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R003",
        "Wrap ID": "W-12",
        "Advertiser": "Food Delivery",
        "Exposure Hours Today": 6,
        "SLA Hours Month": 180,
        "Preferred Times": "11:00-14:00",
        "Audience Profile": "{\"office\":0.30,\"students\":0.35,\"shoppers\":0.35}"
    },
    "mileage": {
        "Train ID": "R003",
        "Date": "2025-09-16",
        "Km Travelled": 67000,
        "Bogie Wear %": 45.2,
        "Brake Wear %": 32.1,
        "HVAC Hours": 10
    },
    "cleaning": {
        "Train ID": "R003",
        "Bay No": 2,
        "Status": "In Progress",
        "Scheduled Time": "2025-09-17 01:00",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R003",
        "Current Bay": 3,
        "Position": "Middle",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 05:30",
        "Priority": 2
    }
},
{
    "train_id": "R004",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R004",
        "Rolling Stock Valid": "2025-09-10",
        "Signalling Valid": "2025-09-25",
        "Telecom Valid": "2025-11-10"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R004",
        "Wrap ID": "W-23",
        "Advertiser": "E-commerce",
        "Exposure Hours Today": 7,
        "SLA Hours Month": 210,
        "Preferred Times": "09:00-12:00",
        "Audience Profile": "{\"office\":0.50,\"students\":0.25,\"shoppers\":0.25}"
    },
    "mileage": {
        "Train ID": "R004",
        "Date": "2025-09-16",
        "Km Travelled": 89000,
        "Bogie Wear %": 55.8,
        "Brake Wear %": 48.3,
        "HVAC Hours": 11
    },
    "cleaning": {
        "Train ID": "R004",
        "Bay No": 3,
        "Status": "Scheduled",
        "Scheduled Time": "2025-09-17 02:30",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R004",
        "Current Bay": 1,
        "Position": "Front",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 06:45",
        "Priority": 4
    }
},
{
    "train_id": "R005",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R005",
        "Rolling Stock Valid": "2025-12-30",
        "Signalling Valid": "2025-11-15",
        "Telecom Valid": "2025-10-20"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R005",
        "Wrap ID": "W-05",
        "Advertiser": "Banking Plus",
        "Exposure Hours Today": 9,
        "SLA Hours Month": 270,
        "Preferred Times": "08:00-10:00",
        "Audience Profile": "{\"office\":0.70,\"students\":0.10,\"shoppers\":0.20}"
    },
    "mileage": {
        "Train ID": "R005",
        "Date": "2025-09-16",
        "Km Travelled": 32000,
        "Bogie Wear %": 18.5,
        "Brake Wear %": 12.7,
        "HVAC Hours": 9
    },
    "cleaning": {
        "Train ID": "R005",
        "Bay No": 4,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 22:00",
        "Completed Time": "2025-09-16 22:40",
        "Duration (min)": 40
    },
    "stabling": {
        "Train ID": "R005",
        "Current Bay": 2,
        "Position": "Rear",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 07:15",
        "Priority": 1
    }
},
{
    "train_id": "R006",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R006",
        "Rolling Stock Valid": "2025-09-20",
        "Signalling Valid": "2025-10-05",
        "Telecom Valid": "2025-09-18"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R006",
        "Wrap ID": "W-15",
        "Advertiser": "Auto Motors",
        "Exposure Hours Today": 5,
        "SLA Hours Month": 150,
        "Preferred Times": "16:00-19:00",
        "Audience Profile": "{\"office\":0.35,\"students\":0.15,\"shoppers\":0.50}"
    },
    "mileage": {
        "Train ID": "R006",
        "Date": "2025-09-16",
        "Km Travelled": 125000,
        "Bogie Wear %": 68.3,
        "Brake Wear %": 55.9,
        "HVAC Hours": 13
    },
    "cleaning": {
        "Train ID": "R006",
        "Bay No": 5,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 21:45",
        "Completed Time": "2025-09-16 22:30",
        "Duration (min)": 45
    },
    "stabling": {
        "Train ID": "R006",
        "Current Bay": 3,
        "Position": "Front",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 05:45",
        "Priority": 3
    }
},
{
    "train_id": "R007",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R007",
        "Rolling Stock Valid": "2025-11-25",
        "Signalling Valid": "2025-12-10",
        "Telecom Valid": "2025-10-30"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R007",
        "Wrap ID": "W-07",
        "Advertiser": "Health Care",
        "Exposure Hours Today": 4,
        "SLA Hours Month": 120,
        "Preferred Times": "10:00-13:00",
        "Audience Profile": "{\"office\":0.25,\"students\":0.30,\"shoppers\":0.45}"
    },
    "mileage": {
        "Train ID": "R007",
        "Date": "2025-09-16",
        "Km Travelled": 78000,
        "Bogie Wear %": 42.1,
        "Brake Wear %": 35.8,
        "HVAC Hours": 10
    },
    "cleaning": {
        "Train ID": "R007",
        "Bay No": 1,
        "Status": "Scheduled",
        "Scheduled Time": "2025-09-17 03:00",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R007",
        "Current Bay": 4,
        "Position": "Middle",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 06:30",
        "Priority": 2
    }
},
{
    "train_id": "R008",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R008",
        "Rolling Stock Valid": "2025-09-12",
        "Signalling Valid": "2025-09-28",
        "Telecom Valid": "2025-09-15"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R008",
        "Wrap ID": "W-33",
        "Advertiser": "Fashion Brand",
        "Exposure Hours Today": 8,
        "SLA Hours Month": 240,
        "Preferred Times": "12:00-15:00",
        "Audience Profile": "{\"office\":0.20,\"students\":0.40,\"shoppers\":0.40}"
    },
    "mileage": {
        "Train ID": "R008",
        "Date": "2025-09-16",
        "Km Travelled": 156000,
        "Bogie Wear %": 78.5,
        "Brake Wear %": 62.4,
        "HVAC Hours": 14
    },
    "cleaning": {
        "Train ID": "R008",
        "Bay No": 2,
        "Status": "In Progress",
        "Scheduled Time": "2025-09-17 01:30",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R008",
        "Current Bay": 5,
        "Position": "Rear",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 07:00",
        "Priority": 5
    }
},
{
    "train_id": "R009",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R009",
        "Rolling Stock Valid": "2025-12-05",
        "Signalling Valid": "2025-11-18",
        "Telecom Valid": "2025-10-25"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R009",
        "Wrap ID": "W-09",
        "Advertiser": "Coffee Chain",
        "Exposure Hours Today": 6,
        "SLA Hours Month": 180,
        "Preferred Times": "06:00-09:00",
        "Audience Profile": "{\"office\":0.60,\"students\":0.25,\"shoppers\":0.15}"
    },
    "mileage": {
        "Train ID": "R009",
        "Date": "2025-09-16",
        "Km Travelled": 41000,
        "Bogie Wear %": 22.8,
        "Brake Wear %": 19.3,
        "HVAC Hours": 8
    },
    "cleaning": {
        "Train ID": "R009",
        "Bay No": 3,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 23:15",
        "Completed Time": "2025-09-16 24:00",
        "Duration (min)": 45
    },
    "stabling": {
        "Train ID": "R009",
        "Current Bay": 1,
        "Position": "Middle",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 05:30",
        "Priority": 1
    }
},
{
    "train_id": "R010",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R010",
        "Rolling Stock Valid": "2025-09-25",
        "Signalling Valid": "2025-10-12",
        "Telecom Valid": "2025-09-20"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R010",
        "Wrap ID": "W-28",
        "Advertiser": "Real Estate",
        "Exposure Hours Today": 7,
        "SLA Hours Month": 210,
        "Preferred Times": "17:00-20:00",
        "Audience Profile": "{\"office\":0.45,\"students\":0.20,\"shoppers\":0.35}"
    },
    "mileage": {
        "Train ID": "R010",
        "Date": "2025-09-16",
        "Km Travelled": 98000,
        "Bogie Wear %": 58.7,
        "Brake Wear %": 44.2,
        "HVAC Hours": 12
    },
    "cleaning": {
        "Train ID": "R010",
        "Bay No": 4,
        "Status": "Scheduled",
        "Scheduled Time": "2025-09-17 02:00",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R010",
        "Current Bay": 2,
        "Position": "Front",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 06:15",
        "Priority": 3
    }
},
{
    "train_id": "R011",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R011",
        "Rolling Stock Valid": "2025-11-30",
        "Signalling Valid": "2025-12-15",
        "Telecom Valid": "2025-11-05"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R011",
        "Wrap ID": "W-11",
        "Advertiser": "Telecom Giant",
        "Exposure Hours Today": 9,
        "SLA Hours Month": 270,
        "Preferred Times": "07:30-10:30",
        "Audience Profile": "{\"office\":0.55,\"students\":0.30,\"shoppers\":0.15}"
    },
    "mileage": {
        "Train ID": "R011",
        "Date": "2025-09-16",
        "Km Travelled": 28000,
        "Bogie Wear %": 15.2,
        "Brake Wear %": 11.8,
        "HVAC Hours": 7
    },
    "cleaning": {
        "Train ID": "R011",
        "Bay No": 5,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 22:15",
        "Completed Time": "2025-09-16 23:00",
        "Duration (min)": 45
    },
    "stabling": {
        "Train ID": "R011",
        "Current Bay": 3,
        "Position": "Rear",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 07:45",
        "Priority": 1
    }
},
{
    "train_id": "R012",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R012",
        "Rolling Stock Valid": "2025-09-08",
        "Signalling Valid": "2025-09-30",
        "Telecom Valid": "2025-09-12"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R012",
        "Wrap ID": "W-40",
        "Advertiser": "Sports Brand",
        "Exposure Hours Today": 5,
        "SLA Hours Month": 150,
        "Preferred Times": "14:00-17:00",
        "Audience Profile": "{\"office\":0.30,\"students\":0.45,\"shoppers\":0.25}"
    },
    "mileage": {
        "Train ID": "R012",
        "Date": "2025-09-16",
        "Km Travelled": 187000,
        "Bogie Wear %": 85.3,
        "Brake Wear %": 73.6,
        "HVAC Hours": 15
    },
    "cleaning": {
        "Train ID": "R012",
        "Bay No": 1,
        "Status": "In Progress",
        "Scheduled Time": "2025-09-17 01:45",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R012",
        "Current Bay": 4,
        "Position": "Front",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 08:00",
        "Priority": 5
    }
},
{
    "train_id": "R013",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R013",
        "Rolling Stock Valid": "2025-12-20",
        "Signalling Valid": "2025-11-08",
        "Telecom Valid": "2025-10-15"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R013",
        "Wrap ID": "W-13",
        "Advertiser": "Education Hub",
        "Exposure Hours Today": 8,
        "SLA Hours Month": 240,
        "Preferred Times": "08:30-11:30",
        "Audience Profile": "{\"office\":0.25,\"students\":0.60,\"shoppers\":0.15}"
    },
    "mileage": {
        "Train ID": "R013",
        "Date": "2025-09-16",
        "Km Travelled": 52000,
        "Bogie Wear %": 29.7,
        "Brake Wear %": 24.1,
        "HVAC Hours": 9
    },
    "cleaning": {
        "Train ID": "R013",
        "Bay No": 2,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 21:30",
        "Completed Time": "2025-09-16 22:20",
        "Duration (min)": 50
    },
    "stabling": {
        "Train ID": "R013",
        "Current Bay": 5,
        "Position": "Middle",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 06:45",
        "Priority": 2
    }
},
{
    "train_id": "R014",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R014",
        "Rolling Stock Valid": "2025-09-22",
        "Signalling Valid": "2025-10-08",
        "Telecom Valid": "2025-09-19"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R014",
        "Wrap ID": "W-25",
        "Advertiser": "Travel Agency",
        "Exposure Hours Today": 6,
        "SLA Hours Month": 180,
        "Preferred Times": "11:30-14:30",
        "Audience Profile": "{\"office\":0.35,\"students\":0.25,\"shoppers\":0.40}"
    },
    "mileage": {
        "Train ID": "R014",
        "Date": "2025-09-16",
        "Km Travelled": 114000,
        "Bogie Wear %": 62.4,
        "Brake Wear %": 51.7,
        "HVAC Hours": 13
    },
    "cleaning": {
        "Train ID": "R014",
        "Bay No": 3,
        "Status": "Scheduled",
        "Scheduled Time": "2025-09-17 03:30",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R014",
        "Current Bay": 1,
        "Position": "Rear",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 05:15",
        "Priority": 4
    }
},
{
    "train_id": "R015",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R015",
        "Rolling Stock Valid": "2025-11-12",
        "Signalling Valid": "2025-12-03",
        "Telecom Valid": "2025-10-28"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R015",
        "Wrap ID": "W-15",
        "Advertiser": "Electronics Store",
        "Exposure Hours Today": 7,
        "SLA Hours Month": 210,
        "Preferred Times": "13:00-16:00",
        "Audience Profile": "{\"office\":0.40,\"students\":0.35,\"shoppers\":0.25}"
    },
    "mileage": {
        "Train ID": "R015",
        "Date": "2025-09-16",
        "Km Travelled": 73000,
        "Bogie Wear %": 38.9,
        "Brake Wear %": 31.2,
        "HVAC Hours": 11
    },
    "cleaning": {
        "Train ID": "R015",
        "Bay No": 4,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 20:45",
        "Completed Time": "2025-09-16 21:35",
        "Duration (min)": 50
    },
    "stabling": {
        "Train ID": "R015",
        "Current Bay": 2,
        "Position": "Middle",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 07:30",
        "Priority": 2
    }
},
{
    "train_id": "R016",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R016",
        "Rolling Stock Valid": "2025-09-05",
        "Signalling Valid": "2025-09-24",
        "Telecom Valid": "2025-09-09"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R016",
        "Wrap ID": "W-50",
        "Advertiser": "Insurance Co",
        "Exposure Hours Today": 4,
        "SLA Hours Month": 120,
        "Preferred Times": "16:30-19:30",
        "Audience Profile": "{\"office\":0.50,\"students\":0.20,\"shoppers\":0.30}"
    },
    "mileage": {
        "Train ID": "R016",
        "Date": "2025-09-16",
        "Km Travelled": 203000,
        "Bogie Wear %": 91.2,
        "Brake Wear %": 84.7,
        "HVAC Hours": 16
    },
    "cleaning": {
        "Train ID": "R016",
        "Bay No": 5,
        "Status": "In Progress",
        "Scheduled Time": "2025-09-17 02:15",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R016",
        "Current Bay": 3,
        "Position": "Front",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 08:30",
        "Priority": 5
    }
},
{
    "train_id": "R017",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R017",
        "Rolling Stock Valid": "2025-12-01",
        "Signalling Valid": "2025-11-20",
        "Telecom Valid": "2025-10-18"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R017",
        "Wrap ID": "W-17",
        "Advertiser": "Grocery Chain",
        "Exposure Hours Today": 8,
        "SLA Hours Month": 240,
        "Preferred Times": "09:30-12:30",
        "Audience Profile": "{\"office\":0.30,\"students\":0.20,\"shoppers\":0.50}"
    },
    "mileage": {
        "Train ID": "R017",
        "Date": "2025-09-16",
        "Km Travelled": 36000,
        "Bogie Wear %": 19.8,
        "Brake Wear %": 15.4,
        "HVAC Hours": 8
    },
    "cleaning": {
        "Train ID": "R017",
        "Bay No": 1,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 23:45",
        "Completed Time": "2025-09-17 00:30",
        "Duration (min)": 45
    },
    "stabling": {
        "Train ID": "R017",
        "Current Bay": 4,
        "Position": "Rear",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 06:00",
        "Priority": 1
    }
},
{
    "train_id": "R018",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R018",
        "Rolling Stock Valid": "2025-09-18",
        "Signalling Valid": "2025-10-02",
        "Telecom Valid": "2025-09-21"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R018",
        "Wrap ID": "W-35",
        "Advertiser": "Movie Studio",
        "Exposure Hours Today": 5,
        "SLA Hours Month": 150,
        "Preferred Times": "18:00-21:00",
        "Audience Profile": "{\"office\":0.25,\"students\":0.40,\"shoppers\":0.35}"
    },
    "mileage": {
        "Train ID": "R018",
        "Date": "2025-09-16",
        "Km Travelled": 142000,
        "Bogie Wear %": 74.6,
        "Brake Wear %": 68.3,
        "HVAC Hours": 14
    },
    "cleaning": {
        "Train ID": "R018",
        "Bay No": 2,
        "Status": "Scheduled",
        "Scheduled Time": "2025-09-17 04:00",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R018",
        "Current Bay": 5,
        "Position": "Front",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 07:15",
        "Priority": 4
    }
},
{
    "train_id": "R019",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R019",
        "Rolling Stock Valid": "2025-11-28",
        "Signalling Valid": "2025-12-12",
        "Telecom Valid": "2025-11-02"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R019",
        "Wrap ID": "W-19",
        "Advertiser": "Pharma Corp",
        "Exposure Hours Today": 6,
        "SLA Hours Month": 180,
        "Preferred Times": "10:30-13:30",
        "Audience Profile": "{\"office\":0.45,\"students\":0.25,\"shoppers\":0.30}"
    },
    "mileage": {
        "Train ID": "R019",
        "Date": "2025-09-16",
        "Km Travelled": 61000,
        "Bogie Wear %": 33.5,
        "Brake Wear %": 27.8,
        "HVAC Hours": 10
    },
    "cleaning": {
        "Train ID": "R019",
        "Bay No": 3,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 22:00",
        "Completed Time": "2025-09-16 22:50",
        "Duration (min)": 50
    },
    "stabling": {
        "Train ID": "R019",
        "Current Bay": 1,
        "Position": "Middle",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 06:30",
        "Priority": 2
    }
},
{
    "train_id": "R020",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R020",
        "Rolling Stock Valid": "2025-09-15",
        "Signalling Valid": "2025-09-29",
        "Telecom Valid": "2025-09-17"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R020",
        "Wrap ID": "W-42",
        "Advertiser": "Gaming Zone",
        "Exposure Hours Today": 7,
        "SLA Hours Month": 210,
        "Preferred Times": "15:00-18:00",
        "Audience Profile": "{\"office\":0.20,\"students\":0.55,\"shoppers\":0.25}"
    },
    "mileage": {
        "Train ID": "R020",
        "Date": "2025-09-16",
        "Km Travelled": 108000,
        "Bogie Wear %": 59.3,
        "Brake Wear %": 46.8,
        "HVAC Hours": 12
    },
    "cleaning": {
        "Train ID": "R020",
        "Bay No": 4,
        "Status": "In Progress",
        "Scheduled Time": "2025-09-17 01:15",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R020",
        "Current Bay": 2,
        "Position": "Front",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 05:45",
        "Priority": 3
    }
},
{
    "train_id": "R021",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R021",
        "Rolling Stock Valid": "2025-12-10",
        "Signalling Valid": "2025-11-25",
        "Telecom Valid": "2025-10-12"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R021",
        "Wrap ID": "W-21",
        "Advertiser": "Home Decor",
        "Exposure Hours Today": 9,
        "SLA Hours Month": 270,
        "Preferred Times": "11:00-14:00",
        "Audience Profile": "{\"office\":0.35,\"students\":0.15,\"shoppers\":0.50}"
    },
    "mileage": {
        "Train ID": "R021",
        "Date": "2025-09-16",
        "Km Travelled": 24000,
        "Bogie Wear %": 13.7,
        "Brake Wear %": 9.8,
        "HVAC Hours": 6
    },
    "cleaning": {
        "Train ID": "R021",
        "Bay No": 5,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 21:15",
        "Completed Time": "2025-09-16 22:00",
        "Duration (min)": 45
    },
    "stabling": {
        "Train ID": "R021",
        "Current Bay": 3,
        "Position": "Rear",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 08:15",
        "Priority": 1
    }
},
{
    "train_id": "R022",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R022",
        "Rolling Stock Valid": "2025-09-03",
        "Signalling Valid": "2025-09-26",
        "Telecom Valid": "2025-09-07"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R022",
        "Wrap ID": "W-48",
        "Advertiser": "Luxury Brand",
        "Exposure Hours Today": 3,
        "SLA Hours Month": 90,
        "Preferred Times": "19:00-22:00",
        "Audience Profile": "{\"office\":0.60,\"students\":0.10,\"shoppers\":0.30}"
    },
    "mileage": {
        "Train ID": "R022",
        "Date": "2025-09-16",
        "Km Travelled": 215000,
        "Bogie Wear %": 95.8,
        "Brake Wear %": 89.2,
        "HVAC Hours": 17
    },
    "cleaning": {
        "Train ID": "R022",
        "Bay No": 1,
        "Status": "Scheduled",
        "Scheduled Time": "2025-09-17 04:30",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R022",
        "Current Bay": 4,
        "Position": "Middle",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 09:00",
        "Priority": 5
    }
},
{
    "train_id": "R023",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R023",
        "Rolling Stock Valid": "2025-11-15",
        "Signalling Valid": "2025-12-05",
        "Telecom Valid": "2025-10-22"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R023",
        "Wrap ID": "W-23",
        "Advertiser": "Streaming Service",
        "Exposure Hours Today": 8,
        "SLA Hours Month": 240,
        "Preferred Times": "12:30-15:30",
        "Audience Profile": "{\"office\":0.30,\"students\":0.45,\"shoppers\":0.25}"
    },
    "mileage": {
        "Train ID": "R023",
        "Date": "2025-09-16",
        "Km Travelled": 47000,
        "Bogie Wear %": 26.3,
        "Brake Wear %": 21.7,
        "HVAC Hours": 9
    },
    "cleaning": {
        "Train ID": "R023",
        "Bay No": 2,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 20:30",
        "Completed Time": "2025-09-16 21:15",
        "Duration (min)": 45
    },
    "stabling": {
        "Train ID": "R023",
        "Current Bay": 5,
        "Position": "Middle",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 07:00",
        "Priority": 2
    }
},
{
    "train_id": "R024",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R024",
        "Rolling Stock Valid": "2025-09-20",
        "Signalling Valid": "2025-10-06",
        "Telecom Valid": "2025-09-23"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R024",
        "Wrap ID": "W-31",
        "Advertiser": "Fintech App",
        "Exposure Hours Today": 5,
        "SLA Hours Month": 150,
        "Preferred Times": "14:30-17:30",
        "Audience Profile": "{\"office\":0.55,\"students\":0.30,\"shoppers\":0.15}"
    },
    "mileage": {
        "Train ID": "R024",
        "Date": "2025-09-16",
        "Km Travelled": 89000,
        "Bogie Wear %": 48.9,
        "Brake Wear %": 39.6,
        "HVAC Hours": 11
    },
    "cleaning": {
        "Train ID": "R024",
        "Bay No": 3,
        "Status": "In Progress",
        "Scheduled Time": "2025-09-17 03:15",
        "Completed Time": null,
        "Duration (min)": null
    },
    "stabling": {
        "Train ID": "R024",
        "Current Bay": 1,
        "Position": "Front",
        "Is Reception": true,
        "Recommended Departure": "2025-09-17 06:45",
        "Priority": 3
    }
},
{
    "train_id": "R025",
    "date": "2025-09-17",
    "fitness_certificates": {
        "Train ID": "R025",
        "Rolling Stock Valid": "2025-12-25",
        "Signalling Valid": "2025-11-30",
        "Telecom Valid": "2025-10-08"
    },
    "job_cards": [],
    "branding": {
        "Train ID": "R025",
        "Wrap ID": "W-25",
        "Advertiser": "Green Energy",
        "Exposure Hours Today": 7,
        "SLA Hours Month": 210,
        "Preferred Times": "08:00-11:00",
        "Audience Profile": "{\"office\":0.50,\"students\":0.25,\"shoppers\":0.25}"
    },
    "mileage": {
        "Train ID": "R025",
        "Date": "2025-09-16",
        "Km Travelled": 55000,
        "Bogie Wear %": 31.2,
        "Brake Wear %": 25.8,
        "HVAC Hours": 10
    },
    "cleaning": {
        "Train ID": "R025",
        "Bay No": 4,
        "Status": "Done",
        "Scheduled Time": "2025-09-16 23:30",
        "Completed Time": "2025-09-17 00:15",
        "Duration (min)": 45
    },
    "stabling": {
        "Train ID": "R025",
        "Current Bay": 2,
        "Position": "Rear",
        "Is Reception": false,
        "Recommended Departure": "2025-09-17 07:30",
        "Priority": 2
    }
}
];

function daysBetween(dateA: Date, dateB: Date) {
  return (dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);
}

export default function MetroMindPage() {
  const [trains, setTrains] = useState<Train[]>(SAMPLE_DATA);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [fitnessFilter, setFitnessFilter] = useState("");
  const [bayFilter, setBayFilter] = useState<string>("");
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Use a stable current date so behavior is predictable across dev: fallback to today's date
  const currentDate = useMemo(() => new Date(), []);

  // Priority calculation
  function calculatePriority(train: Train): "high" | "medium" | "low" {
    const rollingDate = new Date(train.fitness_certificates["Rolling Stock Valid"]);
    const signallingDate = new Date(train.fitness_certificates["Signalling Valid"]);
    const telecomDate = new Date(train.fitness_certificates["Telecom Valid"]);

    const isExpired = rollingDate < currentDate || signallingDate < currentDate || telecomDate < currentDate;

    const daysToExpiry = Math.min(
      daysBetween(rollingDate, currentDate),
      daysBetween(signallingDate, currentDate),
      daysBetween(telecomDate, currentDate)
    );

    const bogieWear = train.mileage["Bogie Wear %"];
    const brakeWear = train.mileage["Brake Wear %"];
    const kmTravelled = train.mileage["Km Travelled"];

    if (isExpired || bogieWear > 60 || brakeWear > 60 || kmTravelled > 120000) return "high";
    if (daysToExpiry < 30 || bogieWear > 30 || brakeWear > 30 || kmTravelled > 50000) return "medium";
    return "low";
  }

  function getFitnessStatus(train: Train): "expired" | "expiring" | "valid" {
    const rollingDate = new Date(train.fitness_certificates["Rolling Stock Valid"]);
    const signallingDate = new Date(train.fitness_certificates["Signalling Valid"]);
    const telecomDate = new Date(train.fitness_certificates["Telecom Valid"]);

    const isExpired = rollingDate < currentDate || signallingDate < currentDate || telecomDate < currentDate;
    const daysToExpiry = Math.min(
      daysBetween(rollingDate, currentDate),
      daysBetween(signallingDate, currentDate),
      daysBetween(telecomDate, currentDate)
    );

    if (isExpired) return "expired";
    if (daysToExpiry < 30) return "expiring";
    return "valid";
  }

  function getWearLevel(percentage: number): "high" | "medium" | "low" {
    if (percentage > 60) return "high";
    if (percentage > 30) return "medium";
    return "low";
  }

  // Filters
  const filteredTrains = useMemo(() => {
    return trains.filter((train) => {
      const searchLower = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !searchLower ||
        train.train_id.toLowerCase().includes(searchLower) ||
        train.branding.Advertiser.toLowerCase().includes(searchLower);

      const pr = calculatePriority(train);
      const matchesPriority = !priorityFilter || pr === priorityFilter;

      const fs = getFitnessStatus(train);
      const matchesFitness = !fitnessFilter || fs === fitnessFilter;

      const matchesBay = !bayFilter || train.stabling["Current Bay"].toString() === bayFilter;

      return matchesSearch && matchesPriority && matchesFitness && matchesBay;
    });
  }, [trains, searchTerm, priorityFilter, fitnessFilter, bayFilter]);

  // Stats
  const stats = useMemo(() => {
    let high = 0,
      medium = 0,
      low = 0;
    trains.forEach((t) => {
      const p = calculatePriority(t);
      if (p === "high") high++;
      else if (p === "medium") medium++;
      else low++;
    });
    return { total: trains.length, high, medium, low };
  }, [trains]);

  // Modal
  function openModal(train: Train) {
    setSelectedTrain(train);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedTrain(null);
  }

  // CSV export
  function generateCSVContent(data: Train[]) {
    const headers = [
      "Train ID",
      "Priority",
      "Current Bay",
      "Position",
      "Job Cards",
      "Fitness Status",
      "Km Travelled",
      "Bogie Wear %",
      "Brake Wear %",
      "Cleaning Status",
      "Advertiser",
      "Wrap ID",
      "Exposure Hours Today",
    ];

    const lines = [headers.join(",")];

    data.forEach((train) => {
      const priority = calculatePriority(train);
      const fitness = getFitnessStatus(train);
      const row = [
        train.train_id,
        priority,
        train.stabling["Current Bay"],
        train.stabling.Position,
        fitness,
        train.mileage["Km Travelled"],
        train.mileage["Bogie Wear %"],
        train.mileage["Brake Wear %"],
        train.cleaning.Status,
        train.branding.Advertiser,
        train.branding["Wrap ID"],
        train.branding["Exposure Hours Today"],
      ];
      lines.push(row.join(","));
    });

    return lines.join("\n");
  }

  function exportReport() {
    const content = generateCSVContent(trains);
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "metro_fleet_report.csv";
    a.click();
    URL.revokeObjectURL(url);
    alert("📊 Fleet report exported successfully!");
  }

  // Schedule maintenance
  function scheduleMaintenance() {
    const highPriorityTrains = trains.filter((t) => calculatePriority(t) === "high");
    if (highPriorityTrains.length === 0) {
      alert("✅ No high-priority trains requiring immediate maintenance!");
      return;
    }

    let message = "🔧 HIGH PRIORITY MAINTENANCE REQUIRED:\n\n";
    highPriorityTrains.forEach((train) => {
      const reasons: string[] = [];
      const rolling = new Date(train.fitness_certificates["Rolling Stock Valid"]);
      const signalling = new Date(train.fitness_certificates["Signalling Valid"]);
      const telecom = new Date(train.fitness_certificates["Telecom Valid"]);

      if (rolling < currentDate) reasons.push("Rolling Stock expired");
      if (signalling < currentDate) reasons.push("Signalling expired");
      if (telecom < currentDate) reasons.push("Telecom expired");

      if (train.mileage["Bogie Wear %"] > 60)
        reasons.push(`High bogie wear (${train.mileage["Bogie Wear %"].toFixed(1)}%)`);
      if (train.mileage["Brake Wear %"] > 60)
        reasons.push(`High brake wear (${train.mileage["Brake Wear %"].toFixed(1)}%)`);
      if (train.mileage["Km Travelled"] > 120000)
        reasons.push(`High mileage (${(train.mileage["Km Travelled"] / 1000).toFixed(1)}k km)`);

      message += `${train.train_id} (Bay ${train.stabling["Current Bay"]}): ${reasons.join(", ")}\n`;
    });

    alert(message);
  }

  // Simple UI render
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-50">
      <Head>
        <title>MetroMind — Fleet Management</title>
        <meta name="description" content="MetroMind fleet management dashboard (Next.js + Tailwind)" />
      </Head>

      <nav className="sticky top-0 z-50 bg-slate-900/70 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🚆</div>
            <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-emerald-400">
              MetroMind
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportReport}
              className="px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-900 shadow-md"
            >
              Export CSV
            </button>
            <button
              onClick={scheduleMaintenance}
              className="px-3 py-2 rounded-md text-sm font-medium bg-slate-700/60 border border-slate-600"
            >
              Schedule Maintenance
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <header className="text-center mb-8">
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-emerald-400">
            Fleet Management Dashboard
          </h2>
          <p className="text-slate-300 mt-2">Real-time monitoring and control of metro operations</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative overflow-hidden col-span-1 md:col-span-1 bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
                <div className="absolute inset-0 z-0 bg-sky-500/10 animate-pulse-slow"></div>
                <div className="text-3xl font-bold z-10 relative">{stats.total}</div>
                <div className="text-slate-300 text-sm z-10 relative">Total Metros</div>
            </div>

            <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
                <div className="absolute inset-0 z-0 bg-rose-500/10 animate-pulse-slow"></div>
                <div className="text-3xl font-bold text-rose-400 z-10 relative">{stats.high}</div>
                <div className="text-slate-300 text-sm z-10 relative">High Priority</div>
            </div>

            <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
                <div className="absolute inset-0 z-0 bg-amber-500/10 animate-pulse-slow"></div>
                <div className="text-3xl font-bold text-amber-400 z-10 relative">{stats.medium}</div>
                <div className="text-slate-300 text-sm z-10 relative">Medium Priority</div>
            </div>

            <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
                <div className="absolute inset-0 z-0 bg-emerald-500/10 animate-pulse-slow"></div>
                <div className="text-3xl font-bold text-emerald-300 z-10 relative">{stats.low}</div>
                <div className="text-slate-300 text-sm z-10 relative">Low Priority</div>
            </div>
        </section>

        <section className="flex flex-wrap gap-3 items-center mb-6">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-md bg-slate-800/60 border border-slate-700 placeholder-slate-400"
            placeholder="Search by Train ID or Advertiser..."
          />
          </section>

<section>
  <label htmlFor="priority-filter" className="sr-only">Priority Filter</label>
  <select
    id="priority-filter"
    value={priorityFilter}
    onChange={(e) => setPriorityFilter(e.target.value)}
    className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700"
  >
    <option value="">All Priorities</option>
    <option value="high">High Priority</option>
    <option value="medium">Medium Priority</option>
    <option value="low">Low Priority</option>
  </select>

  <label htmlFor="fitness-filter" className="sr-only">Fitness Status Filter</label>
  <select
    id="fitness-filter"
    value={fitnessFilter}
    onChange={(e) => setFitnessFilter(e.target.value)}
    className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700"
  >
    <option value="">All Fitness Status</option>
    <option value="valid">Valid</option>
    <option value="expiring">Expiring Soon</option>
    <option value="expired">Expired</option>
  </select>

  <label htmlFor="bay-filter" className="sr-only">Bay Filter</label>
  <select
    id="bay-filter"
    value={bayFilter}
    onChange={(e) => setBayFilter(e.target.value)}
    className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700"
  >
    <option value="">All Bays</option>
    <option value="1">Bay 1</option>
    <option value="2">Bay 2</option>
    <option value="3">Bay 3</option>
    <option value="4">Bay 4</option>
    <option value="5">Bay 5</option>
  </select>
</section>

        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredTrains.map((train) => {
            const pr = calculatePriority(train);
            const fitness = getFitnessStatus(train);
            return (
              <article
                key={train.train_id}
                onClick={() => openModal(train)}
                className="train-card cursor-pointer bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 transform transition-all duration-300 hover:scale-[1.02] hover:translate-y-[-4px] shadow-lg hover:shadow-cyan-500/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-bold">{train.train_id}</div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                      pr === "high" ? "text-rose-500 border border-rose-500/30 bg-rose-500/5" : pr === "medium" ? "text-amber-400 border border-amber-400/30 bg-amber-400/5" : "text-emerald-400 border border-emerald-400/30 bg-emerald-400/5"
                    }`}
                  >
                    {pr}
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bay & Position:</span>
                    <span className="font-medium">Bay {train.stabling["Current Bay"]} - {train.stabling.Position}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Fitness:</span>
                    <span className="font-medium">{fitness.toUpperCase()}
                      <span className={`inline-block ml-2 w-2 h-2 rounded-full ${fitness === 'valid' ? 'bg-emerald-400' : fitness === 'expiring' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Mileage:</span>
                    <span className="font-medium">{(train.mileage["Km Travelled"]/1000).toFixed(1)}k km</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Wrap ID:</span>
                    <span className="font-medium">{train.branding["Wrap ID"]}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* Modal */}
        {modalOpen && selectedTrain && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/60" onClick={closeModal}>
            <div className="w-full max-w-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 border border-slate-700 rounded-xl p-6 overflow-y-auto max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold">{selectedTrain.train_id} - Detailed Information</h3>
                <button onClick={closeModal} className="text-2xl leading-none">&times;</button>
              </div>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">🚇 General Information</h4>
                  <div className="text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Train ID</span><span className="font-medium">{selectedTrain.train_id}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Priority Level</span><span className="font-medium">{calculatePriority(selectedTrain).toUpperCase()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Current Date</span><span className="font-medium">{selectedTrain.date}</span></div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">📋 Fitness Certificates</h4>
                  <div className="text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Rolling Stock Valid Until</span><span className="font-medium">{selectedTrain.fitness_certificates["Rolling Stock Valid"]}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Signalling Valid Until</span><span className="font-medium">{selectedTrain.fitness_certificates["Signalling Valid"]}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Telecom Valid Until</span><span className="font-medium">{selectedTrain.fitness_certificates["Telecom Valid"]}</span></div>
                    <div className="flex justify-between mt-2"><span className="text-slate-400">Overall Status</span><span className="font-medium">{getFitnessStatus(selectedTrain).toUpperCase()}</span></div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">🔧 Mileage & Wear</h4>
                  <div className="text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Total Distance Travelled</span><span className="font-medium">{(selectedTrain.mileage["Km Travelled"]/1000).toFixed(1)}k km</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">HVAC Hours</span><span className="font-medium">{selectedTrain.mileage["HVAC Hours"]} hours</span></div>
                    <div className="mt-3">
                      <div className="flex justify-between text-slate-400 text-sm"><span>Bogie Wear</span><span className="font-medium">{selectedTrain.mileage["Bogie Wear %"].toFixed(1)}%</span></div>
                      <div className="w-full h-2 bg-slate-700 rounded mt-1 overflow-hidden">
                        <div style={{ width: `${selectedTrain.mileage["Bogie Wear %"]}%"` }} className={`h-full ${getWearLevel(selectedTrain.mileage["Bogie Wear %"]) === 'high' ? 'bg-rose-500' : getWearLevel(selectedTrain.mileage["Bogie Wear %"]) === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-slate-400 text-sm"><span>Brake Wear</span><span className="font-medium">{selectedTrain.mileage["Brake Wear %"].toFixed(1)}%</span></div>
                      <div className="w-full h-2 bg-slate-700 rounded mt-1 overflow-hidden">
                        <div style={{ width: `${selectedTrain.mileage["Brake Wear %"]}%"` }} className={`h-full ${getWearLevel(selectedTrain.mileage["Brake Wear %"]) === 'high' ? 'bg-rose-500' : getWearLevel(selectedTrain.mileage["Brake Wear %"]) === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                      </div>
                    </div>
                  </div>
                </div>



                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">🧹 Cleaning Status</h4>
                  <div className="text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Bay Number</span><span className="font-medium">Bay {selectedTrain.cleaning["Bay No"]}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Current Status</span><span className="font-medium">{selectedTrain.cleaning.Status}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Scheduled Time</span><span className="font-medium">{selectedTrain.cleaning["Scheduled Time"]}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Completed Time</span><span className="font-medium">{selectedTrain.cleaning["Completed Time"] || 'Not completed'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Duration</span><span className="font-medium">{selectedTrain.cleaning["Duration (min)"] || 'N/A'} minutes</span></div>
                  </div>
                </div>



                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">🏢 Stabling Information</h4>
                  <div className="text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Current Bay</span><span className="font-medium">Bay {selectedTrain.stabling["Current Bay"]}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Position</span><span className="font-medium">{selectedTrain.stabling.Position}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Reception Status</span><span className="font-medium">{selectedTrain.stabling["Is Reception"] ? 'Yes' : 'No'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Recommended Departure</span><span className="font-medium">{selectedTrain.stabling["Recommended Departure"]}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Stabling Priority</span><span className="font-medium">{selectedTrain.stabling.Priority}</span></div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">🎨 Branding & Advertising</h4>
                  <div className="text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Wrap ID</span><span className="font-medium">{selectedTrain.branding["Wrap ID"]}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Advertiser</span><span className="font-medium">{selectedTrain.branding.Advertiser}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Exposure Hours Today</span><span className="font-medium">{selectedTrain.branding["Exposure Hours Today"]} hours</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">SLA Hours This Month</span><span className="font-medium">{selectedTrain.branding["SLA Hours Month"]} hours</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Preferred Times</span><span className="font-medium">{selectedTrain.branding["Preferred Times"]}</span></div>

                    {(() => {
                      try {
                        const ap = JSON.parse(selectedTrain.branding["Audience Profile"]);
                        return (
                          <>
                            <div className="flex justify-between"><span className="text-slate-400">Office Workers</span><span className="font-medium">{Math.round(ap.office * 100)}%</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Students</span><span className="font-medium">{Math.round(ap.students * 100)}%</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Shoppers</span><span className="font-medium">{Math.round(ap.shoppers * 100)}%</span></div>
                          </>
                        );
                      } catch (err) {
                        return null;
                      }
                    })()}
                  </div>
                </div>



                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">📋 Job Cards </h4>
                  <div className="text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="font-medium">None</span></div>
                  </div>
                </div>
                
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
