export const defaultSettings = {
  brand: {
    name: "Apex Stay",
    tagline: "Find a place that feels like yours.",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#174c43",
    accentColor: "#d5a66b",
    contactEmail: "",
    contactPhone: "",
    address: "",
    socialLinks: { instagram: "", facebook: "", linkedin: "" },
    footerText: "A better place to land.",
    typography: "serif",
    navigation: [
      { label: "Apartments", href: "/search" },
      { label: "Our story", href: "/about" },
      { label: "FAQs", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
    footerLinks: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "FAQs", href: "/faq" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  business: {
    country: "United States",
    currency: "USD",
    priceFormat: "whole" as "whole" | "precise",
    paymentPeriod: "month",
    areaUnit: "sq ft",
    dateFormat: "MM/DD/YYYY",
    purposes: ["RENT"],
    contactPreference: "email",
    showOwnerContact: false,
  },
  home: {
    eyebrow: "A home for every chapter",
    headline: "Find your place in the city.",
    description:
      "Thoughtfully chosen apartments, helpful local expertise, and a smoother way to find your next home.",
    heroImage:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2200&q=85",
    aboutTitle: "More than a place to live.",
    aboutBody:
      "We make finding a home feel a little more human. Browse welcoming spaces and connect directly with the people who know them best.",
  },
  seo: {
    title: "Apex Stay | Find your next apartment",
    description: "Find your next apartment with Apex Stay.",
    socialImage: "",
  },
};

export const defaultPages = [
  {
    slug: "about",
    title: "About us",
    body: "A better move starts with a better search. Our local team helps you find a home that fits your life, with thoughtful listings and clear, personal support from first look to move-in.",
  },
  {
    slug: "contact",
    title: "Get in touch",
    body: "Have a question about an apartment or your search? Send a message to our team using the enquiry form on any listing. You can also reach us using the contact details in the footer.",
  },
  {
    slug: "faq",
    title: "Frequently asked questions",
    body: "How do I schedule a viewing? Send an enquiry from the apartment page and the listed contact will follow up. Are listings current? Availability is confirmed directly with the owner or agent. Is there a fee to search? No, browsing listings is free.",
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    body: "We use the information you provide to respond to your property enquiry and operate this website. We do not sell personal information. Contact the site owner for questions or requests about your data. The business operating this site should review and replace this sample policy before launch.",
  },
  {
    slug: "terms",
    title: "Terms of use",
    body: "Listing details are supplied by property owners or agents and should be independently verified. This website is a discovery service and does not constitute a lease, offer, or guarantee of availability. The business operating this site should have these terms reviewed before launch.",
  },
];

export const amenityOptions = [
  "Air conditioning",
  "Balcony",
  "Dishwasher",
  "In-unit laundry",
  "Parking",
  "Pet friendly",
  "Pool",
  "Storage",
  "Fitness center",
  "Elevator",
  "Doorman",
  "Outdoor space",
];

export const utilityOptions = ["Electricity", "Gas", "Water", "Heating", "Internet", "Trash collection"];
